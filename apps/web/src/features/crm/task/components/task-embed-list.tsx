"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  ListTodo,
  Plus,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCompleteTask } from "../hooks/use-tasks";
import { TaskDetailDialog } from "./task-detail-dialog";
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
  medium: "text-blue-600",
  high: "text-orange-600",
  urgent: "text-red-600",
};

interface TaskEmbedListProps {
  tasks: Task[];
  isLoading: boolean;
  canCreate: boolean;
  onAddTask: () => void;
  emptyMessage: string;
}

export function TaskEmbedList({
  tasks,
  isLoading,
  canCreate,
  onAddTask,
  emptyMessage,
}: TaskEmbedListProps) {
  const t = useTranslations("crmTask");
  const completeMutation = useCompleteTask();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
        {canCreate && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3 cursor-pointer"
            onClick={onAddTask}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {t("title")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {canCreate && (
        <div className="flex justify-end mb-1">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={onAddTask}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {t("title")}
          </Button>
        </div>
      )}

      {tasks.map((task) => {
        const StatusIcon = STATUS_ICON[task.status] ?? Circle;
        const isActive = task.status === "pending" || task.status === "in_progress";
        return (
          <div
            key={task.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedTask(task)}
            onKeyDown={(e) => e.key === "Enter" && setSelectedTask(task)}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer hover:bg-muted/50",
              task.is_overdue && isActive && "border-red-200 bg-red-50/50"
            )}
          >
            {/* Status icon */}
            <StatusIcon
              className={cn(
                "h-4 w-4 shrink-0",
                task.status === "completed" && "text-green-600",
                task.status === "cancelled" && "text-muted-foreground",
                task.status === "in_progress" && "text-blue-600",
                task.status === "pending" && "text-muted-foreground"
              )}
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-sm font-medium truncate",
                  task.status === "completed" && "line-through text-muted-foreground"
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
                    task.is_overdue && isActive ? "text-red-600 font-medium" : "text-muted-foreground"
                  )}>
                    {task.is_overdue && isActive && <AlertTriangle className="h-3 w-3" />}
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.due_date)}
                  </span>
                )}
              </div>
            </div>

            {/* Assigned employee avatar */}
            {task.assigned_to_employee && (
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
        );
      })}

      <TaskDetailDialog
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
      />
    </div>
  );
}
