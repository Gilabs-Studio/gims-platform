import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const PipelineStageList = dynamic(() => import("./pipeline-stage-list").then((mod) => ({ default: mod.PipelineStageList })), { loading: () => null });

export function PipelineStageContainer() {
  return (<PageMotion><Suspense fallback={null}><PipelineStageList /></Suspense></PageMotion>);
}
