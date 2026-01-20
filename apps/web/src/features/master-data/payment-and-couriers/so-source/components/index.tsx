import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const SOSourceList = dynamic(() => import("./so-source-list").then((mod) => ({ default: mod.SOSourceList })), { loading: () => null });

export function SOSourceContainer() {
  return (<PageMotion><Suspense fallback={null}><SOSourceList /></Suspense></PageMotion>);
}
