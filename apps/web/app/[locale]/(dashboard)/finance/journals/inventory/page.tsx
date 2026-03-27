import { PageMotion } from "@/components/motion";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { InventoryJournalsList } from "@/features/finance/journals/components";

export default function FinanceInventoryJournalsPage() {
  return (
    <PermissionGuard requiredPermission="journal.read">
      <PageMotion>
        <InventoryJournalsList />
      </PageMotion>
    </PermissionGuard>
  );
}
