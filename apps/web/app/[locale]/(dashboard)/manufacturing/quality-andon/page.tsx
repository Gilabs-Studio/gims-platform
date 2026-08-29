import React from "react";
import { QualityAndonView } from "@/features/manufacturing/quality-andon/components/quality-andon-view";

export const metadata = {
  title: "Quality Andon | GIMS Manufacturing",
  description: "Early warning alarm system for pharmaceutical quality deviations & critical process parameters.",
};

export default function ManufacturingQualityAndonPage() {
  return <QualityAndonView />;
}
