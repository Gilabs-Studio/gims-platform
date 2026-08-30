import React from "react";
import { SystemValidationView } from "@/features/manufacturing/csv-validation/components/system-validation-view";

export const metadata = {
  title: "CSV System Validation & Qualification | GIMS Manufacturing",
  description:
    "System validation status, qualification stages (DQ/IQ/OQ/PQ), and regulatory compliance dossiers under BPOM CPOB Annex 11 & FDA 21 CFR Part 11.",
};

export default function ManufacturingCsvValidationPage() {
  return <SystemValidationView />;
}
