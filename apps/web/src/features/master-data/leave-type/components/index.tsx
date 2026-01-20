import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const LeaveTypeList = dynamic(() => import("./leave-type-list").then((mod) => ({ default: mod.LeaveTypeList })), { loading: () => null });

export function LeaveTypeContainer() {
  return (<PageMotion><Suspense fallback={null}><LeaveTypeList /></Suspense></PageMotion>);
}
