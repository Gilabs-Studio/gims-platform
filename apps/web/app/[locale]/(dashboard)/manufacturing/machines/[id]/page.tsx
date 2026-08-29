import React from "react";
import { MachineDetailPageContainer } from "@/features/manufacturing/machines/components/machine-detail-page-container";

export const metadata = {
  title: "Machine Technical Detail | GIMS Manufacturing",
  description: "Focused technical diagnostics, sensor curves, downtime history, and incident reporting for maintenance teams.",
};

export default async function MachineDetailPage({
  params,
}: {
  params: { locale: string; id: string } | Promise<{ locale: string; id: string }>;
}) {
  const { id } = await Promise.resolve(params);
  return <MachineDetailPageContainer id={id} />;
}
