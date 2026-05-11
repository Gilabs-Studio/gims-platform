"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Star, Trash2, Loader2, AlertCircle, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { billingService, type TenantPaymentMethod } from "../../services/billing-service";
import { useTranslations } from "next-intl";

// Card brand color map
function cardBrandColor(brand: string): string {
  switch (brand.toLowerCase()) {
    case "visa": return "text-blue-600";
    case "mastercard": return "text-orange-500";
    case "amex": return "text-green-600";
    case "jcb": return "text-blue-400";
    default: return "text-muted-foreground";
  }
}

function CardMethodRow({
  method,
  onSetDefault,
  onRemove,
  isLoading,
}: {
  method: TenantPaymentMethod;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
  isLoading: boolean;
}) {
  const t = useTranslations("profile");
  const expiryLabel = `${String(method.expiry_month).padStart(2, "0")}/${method.expiry_year}`;
  const masked = method.masked_card_number
    ? method.masked_card_number.replace(/X/g, "•").replace(/(\d{4})/g, "$1 ").trim()
    : "•••• •••• •••• ????";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4 transition-colors",
        method.is_default
          ? "border-primary/30 bg-primary/5"
          : "border-border/70 bg-card",
      )}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-14 items-center justify-center rounded-lg border border-border/60 bg-background">
          <CreditCard className={cn("h-5 w-5", cardBrandColor(method.card_brand))} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{masked}</p>
            {method.is_default && (
              <Badge variant="active" className="text-xs">{t("paymentMethods.defaultBadge")}</Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {method.card_brand.toUpperCase()} · {method.card_holder_name || t("paymentMethods.cardHolderFallback")} · {t("paymentMethods.expiryPrefix")} {expiryLabel}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!method.is_default && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => onSetDefault(method.id)}
            className="gap-1.5 text-xs"
          >
            <Star className="h-3 w-3" />
            {t("paymentMethods.setDefault")}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isLoading}
          onClick={() => onRemove(method.id)}
          className="gap-1.5 text-xs text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
          {t("paymentMethods.remove")}
        </Button>
      </div>
    </div>
  );
}

export function PaymentMethodTab() {
  const t = useTranslations("profile");
  const queryClient = useQueryClient();
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [xenditTokenInput, setXenditTokenInput] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: methods, isLoading } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => billingService.listPaymentMethods(),
    staleTime: 60_000,
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => billingService.setDefaultPaymentMethod(id),
    onSuccess: async () => {
      toast.success(t("paymentMethods.defaultUpdatedToast"));
      await queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
    onError: () => toast.error(t("paymentMethods.defaultUpdatedError")),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => billingService.removePaymentMethod(id),
    onSuccess: async () => {
      toast.success(t("paymentMethods.removedToast"));
      setRemoveTargetId(null);
      await queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
    onError: () => toast.error(t("paymentMethods.removeError")),
  });

  const addMutation = useMutation({
    mutationFn: (tokenId: string) => billingService.addPaymentMethod(tokenId),
    onSuccess: async () => {
      toast.success(t("paymentMethods.addedToast"));
      setXenditTokenInput("");
      setShowAddForm(false);
      await queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("INVALID_CARD_TOKEN")) {
        toast.error(t("paymentMethods.invalidTokenError"));
      } else if (msg.includes("CARD_ALREADY_SAVED")) {
        toast.error(t("paymentMethods.alreadySavedError"));
      } else {
        toast.error(t("paymentMethods.addError"));
      }
    },
  });

  const isMutating = setDefaultMutation.isPending || removeMutation.isPending || addMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">{t("paymentMethods.title")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("paymentMethods.description")}</p>
      </div>

      {/* Xendit tokenization note */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div>
          <p className="font-medium text-foreground">{t("paymentMethods.securityTitle")}</p>
          <p className="mt-0.5 text-muted-foreground">{t("paymentMethods.securityDescription")}</p>
        </div>
      </div>

      {/* Saved cards list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border/60 bg-muted/30" />
          ))}
        </div>
      ) : methods && methods.length > 0 ? (
        <div className="space-y-3">
          {methods.map((m) => (
            <CardMethodRow
              key={m.id}
              method={m}
              isLoading={isMutating}
              onSetDefault={(id) => setDefaultMutation.mutate(id)}
              onRemove={(id) => setRemoveTargetId(id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/30 px-6 py-10 text-center">
          <CreditCard className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("paymentMethods.emptyTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("paymentMethods.emptyDescription")}</p>
        </div>
      )}

      {/* Add card via Xendit token */}
      {!showAddForm ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAddForm(true)}
          className="gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          {t("paymentMethods.addCard")}
        </Button>
      ) : (
        <div className="rounded-xl border border-border/70 bg-card p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{t("paymentMethods.addCardTitle")}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{t("paymentMethods.addCardInfo")}</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="xendit-token-input" className="text-xs font-medium text-muted-foreground">
              {t("paymentMethods.tokenLabel")}
            </label>
            <input
              id="xendit-token-input"
              type="text"
              className="h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="xnd_tokenization_xxxxxxxx"
              value={xenditTokenInput}
              onChange={(e) => setXenditTokenInput(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={addMutation.isPending || !xenditTokenInput.trim()}
              onClick={() => addMutation.mutate(xenditTokenInput.trim())}
            >
              {addMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {addMutation.isPending ? t("paymentMethods.saving") : t("paymentMethods.saveCard")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setXenditTokenInput("");
              }}
            >
              {t("paymentMethods.cancel")}
            </Button>
          </div>
        </div>
      )}

      {/* Remove confirmation dialog */}
      <AlertDialog
        open={Boolean(removeTargetId)}
        onOpenChange={(open) => { if (!open) setRemoveTargetId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("paymentMethods.removeDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("paymentMethods.removeDialogDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>{t("paymentMethods.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (removeTargetId) removeMutation.mutate(removeTargetId); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("paymentMethods.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
