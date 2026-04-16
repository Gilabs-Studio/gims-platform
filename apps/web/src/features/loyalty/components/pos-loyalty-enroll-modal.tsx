"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useEnrollLoyaltyMember } from "../hooks/use-loyalty";
import type { LoyaltyMember } from "../types";

const enrollSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

type EnrollFormData = z.infer<typeof enrollSchema>;

interface PosLoyaltyEnrollModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletId: string;
  posOrderId?: string;
  defaultName?: string;
  onEnrolled: (member: LoyaltyMember) => void;
}

export function PosLoyaltyEnrollModal({
  open,
  onOpenChange,
  outletId,
  posOrderId,
  defaultName = "",
  onEnrolled,
}: PosLoyaltyEnrollModalProps) {
  const t = useTranslations("loyalty.pos");
  const enroll = useEnrollLoyaltyMember();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EnrollFormData>({
    resolver: zodResolver(enrollSchema),
    defaultValues: { name: defaultName, phone: "", email: "" },
  });

  // Sync defaultName when it changes (from lookup pre-fill)
  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function onSubmit(values: EnrollFormData) {
    try {
      const result = await enroll.mutateAsync({
        outlet_id: outletId,
        name: values.name,
        phone: values.phone || undefined,
        email: values.email || undefined,
        pos_order_id: posOrderId,
      });
      const member = (result as { data: LoyaltyMember }).data;
      toast.success(t("enrollSuccess"));
      reset();
      onOpenChange(false);
      onEnrolled(member);
    } catch {
      toast.error(t("enrollError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm gap-5">
        <DialogHeader>
          <DialogTitle>{t("enrollTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="enroll-name">{t("enrollName")} *</Label>
            <Input
              id="enroll-name"
              placeholder={t("enrollNamePlaceholder")}
              defaultValue={defaultName}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-[11px] text-destructive">{t("enrollNameError")}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="enroll-phone">{t("enrollPhone")}</Label>
            <Input
              id="enroll-phone"
              type="tel"
              placeholder="08xx-xxxx-xxxx"
              {...register("phone")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="enroll-email">{t("enrollEmail")}</Label>
            <Input
              id="enroll-email"
              type="email"
              placeholder="email@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-[11px] text-destructive">{t("enrollEmailError")}</p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 cursor-pointer"
              onClick={() => handleOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1 cursor-pointer"
              disabled={enroll.isPending}
            >
              {enroll.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("enrollSubmit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
