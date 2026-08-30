import React from "react";
import { AuditTrailView } from "@/features/manufacturing/csv-audit-trail/components/audit-trail-view";

export const metadata = {
  title: "CSV Compliance Audit Trail | GIMS Manufacturing",
  description:
    "Immutable manufacturing audit trail and electronic records with cryptographic integrity verification (BPOM CPOB Annex 11 & FDA 21 CFR Part 11).",
};

export default function ManufacturingCsvAuditTrailPage() {
  return <AuditTrailView />;
}
