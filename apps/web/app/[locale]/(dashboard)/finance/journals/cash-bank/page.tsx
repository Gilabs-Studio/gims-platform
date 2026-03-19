import { PageMotion } from "@/components/motion";
import { PermissionGuard } from "@/features/auth/components/permission-guard";
import { CashBankJournalsList } from "@/features/finance/journals/components";

export default function FinanceCashBankJournalsPage() {
  return (
    <PermissionGuard requiredPermission="cash_bank_journal.read">
      <PageMotion>
        <CashBankJournalsList />
      </PageMotion>
    </PermissionGuard>
  );
}
