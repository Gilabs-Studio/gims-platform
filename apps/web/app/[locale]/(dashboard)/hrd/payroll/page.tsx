import PayrollPageClient from "@/features/hrd/payroll/components/payroll-page-client";

// TODO: Integrate PermissionGuard when backend permission 'payroll.read' is active
// import { PermissionGuard } from "@/features/auth/components/permission-guard";
// export default function PayrollPage() {
//   return (
//     <PermissionGuard requiredPermission="payroll.read">
//       <PayrollPageClient />
//     </PermissionGuard>
//   );
// }

export default function PayrollPage() {
  return <PayrollPageClient />;
}
