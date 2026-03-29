"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssignedTask } from "../../types";

interface AssignedTasksProps {
  tasks?: AssignedTask[];
  isLoading?: boolean;
  error?: Error | null;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  TODO: { label: "To Do", variant: "outline" },
  IN_PROGRESS: { label: "In Progress", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

const sourceConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  CRM: { label: "CRM Activity", variant: "outline" },
  SALES: { label: "Sales Order", variant: "secondary" },
  PURCHASE: { label: "Purchase Order", variant: "default" },
};

const priorityConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  LOW: { label: "Low", variant: "outline" },
  MEDIUM: { label: "Medium", variant: "secondary" },
  HIGH: { label: "High", variant: "destructive" },
};

export function AssignedTasksList({ tasks = [], isLoading = false, error = null }: AssignedTasksProps) {
  const t = useTranslations("profile");

  if (isLoading) {
    return <TasksLoadingState />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        <p>{t("tasks.tasksLoadError")}</p>
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t("tasks.noTasksAssigned")}
        </CardContent>
      </Card>
    );
  }

  // Group tasks by status
  const groupedTasks = tasks.reduce(
    (acc, task) => {
      acc[task.status] = acc[task.status] || [];
      acc[task.status].push(task);
      return acc;
    },
    {} as Record<string, AssignedTask[]>
  );

  return (
    <div className="space-y-4">
      {Object.entries(statusConfig).map(([status, config]) => {
        const statusTasks = groupedTasks[status] || [];
        if (statusTasks.length === 0) return null;

        return (
          <div key={status} className="space-y-2">
            <h3 className="text-sm font-semibold">
              {config.label} ({statusTasks.length})
            </h3>
            <div className="space-y-2">
              {statusTasks.map((task) => (
                <Card key={task.id} className={status === "COMPLETED" ? "opacity-60" : ""}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={status === "COMPLETED"}
                        disabled
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className={`text-sm font-medium ${status === "COMPLETED" ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          <div className="flex shrink-0 items-center gap-1">
                            <Badge variant={sourceConfig[task.source]?.variant ?? "outline"}>
                              {sourceConfig[task.source]?.label}
                            </Badge>
                            {task.priority && (
                              <Badge variant={priorityConfig[task.priority]?.variant}>
                                {priorityConfig[task.priority]?.label}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {statusConfig[task.status]?.label}
                          </Badge>
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground">
                              {t("tasks.dueDate")}: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TasksLoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
