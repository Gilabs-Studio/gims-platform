"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authService, type SubscriptionPlanConfig } from "@/features/auth/services/auth-service";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { billingService } from "@/features/settings/services/billing-service";

type UserLimit = {
  current: number;
  max: number;
};

const DEFAULT_SEAT_PRICE_MONTHLY = 500_000;
const DEFAULT_SEAT_PRICE_YEARLY = 6_000_000;

type UseUserAddonOptions = {
  userLimit?: UserLimit;
  onOpenCreateDialog?: () => void;
};

export function useUserAddon({ userLimit, onOpenCreateDialog }: UseUserAddonOptions) {
  const t = useTranslations("userManagement.list");
  const queryClient = useQueryClient();
  const tenantScope = useAuthStore((state) => state.user?.tenant_id ?? "anonymous");

  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [isAddonSubmitting, setIsAddonSubmitting] = useState(false);

  const { data: subscription } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => billingService.getMySubscription(),
    staleTime: 60_000,
  });
  const { data: plans } = useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: () => authService.getSubscriptionPlans(),
    staleTime: 300_000,
    retry: false,
  });

  const isAtLimit = userLimit != null && userLimit.max > 0 && userLimit.current >= userLimit.max;

  const addonUnitPrice = useMemo(() => {
    if (!subscription) {
      return DEFAULT_SEAT_PRICE_MONTHLY;
    }

    const activePlan = plans?.find((plan: SubscriptionPlanConfig) => plan.slug === subscription.plan);
    if (!activePlan) {
      return subscription.billing_period === "yearly"
        ? DEFAULT_SEAT_PRICE_YEARLY
        : DEFAULT_SEAT_PRICE_MONTHLY;
    }

    return subscription.billing_period === "yearly"
      ? activePlan.price_yearly_idr ?? DEFAULT_SEAT_PRICE_YEARLY
      : activePlan.price_monthly_idr ?? DEFAULT_SEAT_PRICE_MONTHLY;
  }, [plans, subscription]);

  const addonBillingPeriod = subscription?.billing_period === "yearly" ? "year" : "month";

  const openAddonDialog = () => {
    setAddonQuantity(1);
    setAddonDialogOpen(true);
  };

  const handleAddUserIntent = (openCreateDialog: () => void) => {
    if (isAtLimit) {
      openAddonDialog();
      return;
    }

    openCreateDialog();
  };

  const handleAddonSubmit = async () => {
    if (!userLimit) {
      return;
    }

    setIsAddonSubmitting(true);
    try {
      const actionDate = new Date().toISOString().slice(0, 10);
      const nextUserLimit = userLimit.max + addonQuantity;
      const result = await billingService.changeSubscription({
        action: "add_seat",
        target: String(nextUserLimit),
        action_date: actionDate,
        idempotency_key: `user-addon-${actionDate}-${nextUserLimit}`,
      });

      toast.success(result.user_notification?.title || t("addon.invoiceReady"));

      const rawInvoiceUrl = result.xendit_payload?.invoice_url;
      const invoiceUrl = typeof rawInvoiceUrl === "string" ? rawInvoiceUrl : "";
      setAddonDialogOpen(false);

      await queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      await queryClient.invalidateQueries({ queryKey: ["users", tenantScope, "limit"] });

      if (invoiceUrl) {
        window.open(invoiceUrl, "_blank", "noopener,noreferrer");
        return;
      }

      onOpenCreateDialog?.();
    } catch {
      toast.error(t("addon.invoiceError"));
    } finally {
      setIsAddonSubmitting(false);
    }
  };

  return {
    isAtLimit,
    addonDialogOpen,
    addonQuantity,
    isAddonSubmitting,
    addonUnitPrice,
    addonBillingPeriod,
    openAddonDialog,
    handleAddUserIntent,
    handleAddonSubmit,
    setAddonDialogOpen,
    setAddonQuantity,
  };
}