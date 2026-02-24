import { Suspense } from "react";
import dynamic from "next/dynamic";
import { PageMotion } from "@/components/motion";

export const ContactRoleList = dynamic(() => import("./contact-role-list").then((mod) => ({ default: mod.ContactRoleList })), { loading: () => null });

export function ContactRoleContainer() {
  return (<PageMotion><Suspense fallback={null}><ContactRoleList /></Suspense></PageMotion>);
}
