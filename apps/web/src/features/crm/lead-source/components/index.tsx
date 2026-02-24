import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const LeadSourceList = dynamic(() => import("./lead-source-list").then((mod) => ({ default: mod.LeadSourceList })), { loading: () => null });

export function LeadSourceContainer() {
  return (<PageMotion><Suspense fallback={null}><LeadSourceList /></Suspense></PageMotion>);
}
