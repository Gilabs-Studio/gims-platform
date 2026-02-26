"use client";

import { Clock, User, Building, Contact, Handshake } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Activity } from "../types";

interface ActivityDetailDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly activity: Activity;
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

export function ActivityDetailDialog({
  open,
  onClose,
  activity,
}: ActivityDetailDialogProps) {
  const t = useTranslations("crmActivity");

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>{t("detailTitle")}</DialogTitle>
            <Badge variant="secondary">{t(`types.${activity.type}` as Parameters<typeof t>[0])}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground mb-1">{t("table.description")}</p>
            <p className="text-sm whitespace-pre-wrap">{activity.description}</p>
          </div>

          {/* Details */}
          <div className="space-y-1 divide-y">
            <InfoRow icon={User} label={t("table.employee")} value={activity.employee?.name} />
            <InfoRow icon={Building} label={t("table.customer")} value={activity.customer?.name} />
            <InfoRow icon={Contact} label={t("table.contact")} value={activity.contact?.name} />
            <InfoRow icon={Handshake} label={t("table.deal")} value={activity.deal?.title} />
            <InfoRow
              icon={Clock}
              label={t("table.timestamp")}
              value={activity.timestamp ? formatDate(activity.timestamp) : null}
            />
            <InfoRow
              icon={Clock}
              label={t("table.createdAt")}
              value={formatDate(activity.created_at)}
            />
          </div>

          {/* Activity Type info */}
          {activity.activity_type && (
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground mb-1">{t("form.activityType")}</p>
              <p className="text-sm font-medium">{activity.activity_type.name}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
