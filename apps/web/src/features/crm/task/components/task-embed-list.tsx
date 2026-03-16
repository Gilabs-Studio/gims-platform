"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
  Pencil,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import { useUserPermission } from "@/hooks/use-user-permission";
import { useCompleteTask } from "../hooks/use-tasks";
import { TaskDetailDialog } from "./task-detail-dialog";
import { TaskFormDialog } from "./task-form-dialog";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";
import type { Task } from "../types";

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  cancelled: XCircle,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-primary",
  high: "text-warning",
  urgent: "text-destructive",
};

interface TaskEmbedListProps {
  tasks: Task[];
  isLoading: boolean;
  emptyMessage: string;
}

export function TaskEmbedList({
  tasks,
  isLoading,
  emptyMessage,
}: TaskEmbedListProps) {
  const t = useTranslations("crmTask");
  const tCommon = useTranslations("common");
  const completeMutation = useCompleteTask();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const canViewDeal = useUserPermission("crm_deal.read");
  const canViewLead = useUserPermission("crm_lead.read");

  const handleComplete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await completeMutation.mutateAsync(taskId);
      toast.success(t("completed"));
    } catch {
      toast.error(t("actions.complete") + " failed");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <ListTodo className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">

      {tasks.map((task) => {
        const StatusIcon = STATUS_ICON[task.status] ?? Circle;
        const isActive = task.status === "pending" || task.status === "in_progress";
        return (
          <div key={task.id} className="space-y-1">
            {/* Task card */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setSelectedTask(task)}
              onKeyDown={(e) => e.key === "Enter" && setSelectedTask(task)}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer hover:bg-muted/50",
              task.is_overdue && isActive && "border-destructive/30 bg-destructive/10"
            )}
          >
            {/* Status icon */}
            <StatusIcon
              className={cn(
                "h-4 w-4 shrink-0",
                task.status === "completed" && "text-success",
                task.status === "cancelled" && "text-muted-foreground",
                task.status === "in_progress" && "text-primary",
                task.status === "pending" && "text-muted-foreground"
              )}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium truncate",
                  task.status === "completed" && "relative text-muted-foreground after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-current"
                )}
              >
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn("text-[10px] px-1.5 py-0", PRIORITY_COLORS[task.priority])}
                >
                  {t(`priorities.${task.priority}` as Parameters<typeof t>[0])}
                </Badge>
                {task.due_date && (
                  <span className={cn(
                    "flex items-center gap-1 text-xs",
                    task.is_overdue && isActive ? "text-destructive font-medium" : "text-muted-foreground"
                  )}>
                    {task.is_overdue && isActive && <AlertTriangle className="h-3 w-3" />}
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.due_date)}
                  </span>
                )}
              </div>
              {/* Deal / Lead chips */}
              {(task.deal ?? task.lead) && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {task.deal && (
                    canViewDeal ? (
                      <Link
                        href={`/crm/pipeline/${task.deal.id}`}
                        className="text-[10px] text-primary hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {task.deal.title}
                      </Link>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{task.deal.title}</span>
                    )
                  )}
                  {task.lead && (
                    canViewLead ? (
                      <Link
                        href={`/crm/leads/${task.lead.id}`}
                        className="text-[10px] text-primary hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {task.lead.name}
                      </Link>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{task.lead.name}</span>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Assigned employee avatar + name */}
            {task.assigned_to_employee && (
              <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">
                    {task.assigned_to_employee.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground max-w-20 truncate">{task.assigned_to_employee.name}</span>
              </div>
            )}

            {/* Edit action */}
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 cursor-pointer text-xs"
                onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                {tCommon("edit")}
              </Button>
            )}

            {/* Quick complete action — stop propagation to avoid opening detail */}
            {isActive && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 cursor-pointer text-xs"
                onClick={(e) => handleComplete(task.id, e)}
                disabled={completeMutation.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                {t("actions.complete")}
              </Button>
            )}
          </div>

          {/* Reminder cards — shown beneath the task card */}
          {task.reminders?.length > 0 && (
            <div className="ml-7 space-y-1">
              {task.reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-start gap-2 rounded-md border border-dashed px-3 py-2 bg-muted/40"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Bell className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{reminder.message}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(reminder.remind_at)}
                      {" · "}
                      {t(`reminder.types.${reminder.reminder_type}` as Parameters<typeof t>[0])}
                      {reminder.is_sent && (
                        <span className="ml-1 text-success">✔ {t("reminder.sent")}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        );
      })}

      <TaskDetailDialog
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
      />

      <TaskFormDialog
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        onSuccess={() => setEditingTask(null)}
      />
    </div>
  );
}
