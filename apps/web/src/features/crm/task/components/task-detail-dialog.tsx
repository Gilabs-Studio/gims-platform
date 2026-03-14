"use client";

import {
  Clock,
  User,
  Building,
  Contact,
  Handshake,
  AlertTriangle,
  Tag,
  Bell,
  PlayCircle,
  CheckCircle2,
  XCircle,
  UserCircle2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useCompleteTask, useMarkTaskInProgress, useCancelTask } from "../hooks/use-tasks";
import type { Task } from "../types";

const STATUS_VARIANT_MAP: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "outline",
  in_progress: "secondary",
  completed: "default",
  cancelled: "destructive",
};

const PRIORITY_VARIANT_MAP: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

interface TaskDetailDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly task: Task | null;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly value: string | null | undefined;
  readonly href?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <Link href={href as Parameters<typeof Link>[0]["href"]} className="text-sm font-medium text-primary hover:underline">
            {value}
          </Link>
        ) : (
          <p className="text-sm font-medium wrap-break-word">{value}</p>
        )}
      </div>
    </div>
  );
}

export function TaskDetailDialog({
  open,
  onClose,
  task,
}: TaskDetailDialogProps) {
  const t = useTranslations("crmTask");
  const tCommon = useTranslations("common");

  const canUpdate = useUserPermission("crm_task.update");
  const canViewDeal = useUserPermission("crm_deal.read");
  const canViewLead = useUserPermission("crm_lead.read");
  const completeMutation = useCompleteTask();
  const inProgressMutation = useMarkTaskInProgress();
  const cancelMutation = useCancelTask();

  const handleComplete = async () => {
    if (!task) return;
    try {
      await completeMutation.mutateAsync(task.id);
      toast.success(t("completed"));
      onClose();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleInProgress = async () => {
    if (!task) return;
    try {
      await inProgressMutation.mutateAsync(task.id);
      toast.success(t("inProgress"));
      onClose();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  const handleCancel = async () => {
    if (!task) return;
    try {
      await cancelMutation.mutateAsync(task.id);
      toast.success(t("cancelled"));
      onClose();
    } catch {
      toast.error(tCommon("error"));
    }
  };

  if (!task) return null;

  const isActionable = canUpdate && task.status !== "completed" && task.status !== "cancelled";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle className="flex items-center gap-2">
              {task.title}
              {task.is_overdue && (
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              )}
            </DialogTitle>
            <Badge variant={STATUS_VARIANT_MAP[task.status] ?? "outline"}>
              {t(`statuses.${task.status}` as Parameters<typeof t>[0])}
            </Badge>
            <Badge variant={PRIORITY_VARIANT_MAP[task.priority] ?? "outline"}>
              {t(`priorities.${task.priority}` as Parameters<typeof t>[0])}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          {task.description && (
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground mb-1">
                {t("form.description")}
              </p>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="space-y-1 divide-y">
            <InfoRow
              icon={Tag}
              label={t("form.type")}
              value={t(`types.${task.type}` as Parameters<typeof t>[0])}
            />
            <InfoRow
              icon={User}
              label={t("form.assignedTo")}
              value={task.assigned_to_employee?.name}
            />
            <InfoRow
              icon={User}
              label={t("form.assignedFrom")}
              value={task.assigned_from_employee?.name}
            />
            <InfoRow
              icon={Clock}
              label={t("form.dueDate")}
              value={task.due_date ? formatDate(task.due_date) : null}
            />
            {task.completed_at && (
              <InfoRow
                icon={Clock}
                label={t("statuses.completed")}
                value={formatDate(task.completed_at)}
              />
            )}
            <InfoRow
              icon={Building}
              label={t("form.customer")}
              value={task.customer?.name}
            />
            <InfoRow
              icon={Contact}
              label={t("form.contact")}
              value={task.contact?.name}
            />
            <InfoRow
              icon={Handshake}
              label={t("form.deal")}
              value={task.deal?.title}
              href={canViewDeal && task.deal ? `/crm/pipeline/${task.deal.id}` : undefined}
            />
            <InfoRow
              icon={UserCircle2}
              label={t("form.lead")}
              value={task.lead?.name}
              href={canViewLead && task.lead ? `/crm/leads/${task.lead.id}` : undefined}
            />
            <InfoRow
              icon={Clock}
              label={t("table.createdAt")}
              value={formatDate(task.created_at)}
            />
          </div>

          {/* Reminders */}
          {task.reminders?.length > 0 && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {t("reminder.title")} ({task.reminders.length})
                </p>
              </div>
              <div className="space-y-2">
                {task.reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between text-sm border-t pt-2"
                  >
                    <div>
                      <p className="font-medium">{reminder.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(reminder.remind_at)} &middot;{" "}
                        {t(
                          `reminder.types.${reminder.reminder_type}` as Parameters<typeof t>[0],
                        )}
                      </p>
                    </div>
                    <Badge variant={reminder.is_sent ? "default" : "outline"}>
                      {reminder.is_sent
                        ? t("reminder.sent")
                        : t("reminder.notSent")}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons — only for active tasks the user has permission to update */}
          {isActionable && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {/* pending: show Mark In Progress (primary) */}
              {task.status === "pending" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleInProgress}
                  disabled={inProgressMutation.isPending}
                  className="cursor-pointer"
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {t("actions.inProgress")}
                </Button>
              )}
              {/* in_progress: show Mark Complete (green) */}
              {task.status === "in_progress" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleComplete}
                  disabled={completeMutation.isPending}
                  className="cursor-pointer bg-success hover:bg-success text-white"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t("actions.complete")}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="cursor-pointer text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <XCircle className="mr-2 h-4 w-4" />
                {t("actions.cancel")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
