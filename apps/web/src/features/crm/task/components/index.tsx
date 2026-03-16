import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const TaskList = dynamic(
  () => import("./task-list").then((mod) => ({ default: mod.TaskList })),
  { loading: () => null }
);

export const TaskCalendarView = dynamic(
  () => import("./task-calendar-view").then((mod) => ({ default: mod.TaskCalendarView })),
  { loading: () => null }
);

export function TaskContainer() {
  return (
    <PageMotion>
      <TaskList />
    </PageMotion>
  );
}
