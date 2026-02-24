import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const LeadStatusList = dynamic(() => import("./lead-status-list").then((mod) => ({ default: mod.LeadStatusList })), { loading: () => null });

export function LeadStatusContainer() {
  return (<PageMotion><Suspense fallback={null}><LeadStatusList /></Suspense></PageMotion>);
}
