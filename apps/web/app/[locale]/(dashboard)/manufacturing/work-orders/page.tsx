import React from "react";
import { WorkOrderManagement } from "@/features/manufacturing/work-orders/components/work-order-management";

export const metadata = {
  title: "Work Orders & Shop Floor | GIMS Manufacturing",
  description: "Production batch execution management, operator assignment, and scrap/defect unit reporting.",
};

export default function ManufacturingWorkOrdersPage() {
  return <WorkOrderManagement />;
}
