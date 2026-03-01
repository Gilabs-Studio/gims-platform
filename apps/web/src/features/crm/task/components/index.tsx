import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const TaskList = dynamic(
  () => import("./task-list").then((mod) => ({ default: mod.TaskList })),
  { loading: () => null }
);

export function TaskContainer() {
  return (
    <PageMotion>
      <TaskList />
    </PageMotion>
  );
}
