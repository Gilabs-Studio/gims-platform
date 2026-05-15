"use client";
import { FINANCE_PERMISSIONS } from "@/features/finance/permissions";

import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserPermission } from "@/hooks/use-user-permission";
import { BankTransferList } from "@/features/finance/bank-transfer/components/transfer-list";

import { CashBankTransactionsList } from "./cash-bank-transactions-list";

export function CashBankWorkspace() {
  const t = useTranslations("financeCashBankTransactions");
  const canReadTransfer = useUserPermission(FINANCE_PERMISSIONS.BANK_TRANSFER.READ);

  return (
    <Tabs defaultValue="transactions" className="w-full space-y-4">
      <TabsList className="grid w-full grid-cols-2 md:w-[420px]">
        <TabsTrigger value="transactions" className="cursor-pointer">
          {t("title")}
        </TabsTrigger>
        <TabsTrigger value="transfers" className="cursor-pointer" disabled={!canReadTransfer}>
          Bank Transfer
        </TabsTrigger>
      </TabsList>

      <TabsContent value="transactions">
        <CashBankTransactionsList />
      </TabsContent>

      <TabsContent value="transfers">
        {canReadTransfer ? <BankTransferList /> : null}
      </TabsContent>
    </Tabs>
  );
}
