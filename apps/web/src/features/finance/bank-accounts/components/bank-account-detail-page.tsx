"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { useRouter } from "@/i18n/routing";
import { formatCurrency } from "@/lib/utils";
import { useUserPermission } from "@/hooks/use-user-permission";
import { CustomerDetailModal } from "@/features/master-data/customer/components/customer/customer-detail-modal";
import { SupplierDetailModal } from "@/features/master-data/supplier/components/supplier/supplier-detail-modal";
import { SalesPaymentDetail } from "@/features/sales/payments/components/sales-payment-detail";
import { PurchasePaymentDetail } from "@/features/purchase/payments/components/purchase-payment-detail";
import { JournalDetailModal } from "@/features/finance/journals/components/journal-detail-modal";

import { useFinanceBankAccount, useFinanceBankAccountHistory } from "../hooks/use-finance-bank-accounts";
import type { BankAccountTransaction } from "../types";

interface BankAccountDetailPageProps {
  id: string;
}

export function BankAccountDetailPage({ id }: BankAccountDetailPageProps) {
  const t = useTranslations("financeBankAccounts");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const [customerDetailId, setCustomerDetailId] = useState<string | null>(null);
  const [supplierDetailOpen, setSupplierDetailOpen] = useState(false);
  const [supplierDetailId, setSupplierDetailId] = useState<string | null>(null);
  const [salesPaymentDetailOpen, setSalesPaymentDetailOpen] = useState(false);
  const [salesPaymentDetailId, setSalesPaymentDetailId] = useState<string | null>(null);
  const [purchasePaymentDetailOpen, setPurchasePaymentDetailOpen] = useState(false);
  const [purchasePaymentDetailId, setPurchasePaymentDetailId] = useState<string | null>(null);
  const [journalDetailOpen, setJournalDetailOpen] = useState(false);
  const [journalDetailId, setJournalDetailId] = useState<string | null>(null);

  const canReadCustomer = useUserPermission("customer.read");
  const canViewCustomerLegacy = useUserPermission("customer.view");
  const canViewCustomer = canReadCustomer || canViewCustomerLegacy;
  const canReadSupplier = useUserPermission("supplier.read");
  const canViewSupplierLegacy = useUserPermission("supplier.view");
  const canViewSupplier = canReadSupplier || canViewSupplierLegacy;
  const canViewSalesPayment = useUserPermission("sales_payment.read");
  const canViewPurchasePayment = useUserPermission("purchase_payment.read");
  const canViewJournal = useUserPermission("journal.read");

  const { data: detailData, isLoading: isLoadingDetail, isError: isDetailError } = useFinanceBankAccount(id, {
    enabled: !!id,
  });

  const { data: historyData, isLoading: isLoadingHistory } = useFinanceBankAccountHistory(
    id,
    { page, per_page: pageSize },
    { enabled: !!id },
  );

  const detail = detailData?.data;
  const transactions = useMemo(() => historyData?.data ?? [], [historyData?.data]);
  const pagination = historyData?.meta?.pagination;

  const isReferenceClickable = (row: BankAccountTransaction) => {
    const refType = (row.reference_type ?? "").toUpperCase();
    if (refType === "SALES_PAYMENT") return canViewSalesPayment;
    if (refType === "PURCHASE_PAYMENT") return canViewPurchasePayment;
    if (refType === "CASH_BANK_JOURNAL") return canViewJournal;
    return false;
  };

  const isRelatedEntityClickable = (row: BankAccountTransaction) => {
    const entityType = (row.related_entity_type ?? "").toLowerCase();
    if (entityType === "customer") return canViewCustomer;
    if (entityType === "supplier") return canViewSupplier;
    return false;
  };

  const handleReferenceClick = (row: BankAccountTransaction) => {
    const refType = (row.reference_type ?? "").toUpperCase();
    if (refType === "SALES_PAYMENT") {
      if (!canViewSalesPayment) return;
      setSalesPaymentDetailId(row.reference_id);
      setSalesPaymentDetailOpen(true);
      return;
    }
    if (refType === "PURCHASE_PAYMENT") {
      if (!canViewPurchasePayment) return;
      setPurchasePaymentDetailId(row.reference_id);
      setPurchasePaymentDetailOpen(true);
      return;
    }
    if (refType === "CASH_BANK_JOURNAL") {
      if (!canViewJournal) return;
      setJournalDetailId(row.reference_id);
      setJournalDetailOpen(true);
      return;
    }
  };

  const handleRelatedEntityClick = (row: BankAccountTransaction) => {
    const entityType = (row.related_entity_type ?? "").toLowerCase();
    if (entityType === "customer" && row.related_entity_id) {
      if (!canViewCustomer) {
        toast.error(tCommon("error"));
        return;
      }
      setCustomerDetailId(row.related_entity_id);
      setCustomerDetailOpen(true);
      return;
    }
    if (entityType === "supplier" && row.related_entity_id) {
      if (!canViewSupplier) {
        toast.error(tCommon("error"));
        return;
      }
      setSupplierDetailId(row.related_entity_id);
      setSupplierDetailOpen(true);
    }
  };

  if (isDetailError) {
    return <div className="text-center py-8 text-destructive">{tCommon("error")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t("detail.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button variant="outline" className="cursor-pointer" onClick={() => router.push("/finance/bank-accounts")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tCommon("back")}
        </Button>
      </div>

      {isLoadingDetail ? (
        <Skeleton className="h-28 w-full" />
      ) : detail ? (
        <div className="rounded-md border p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">{t("fields.name")}: </span>{detail.name}</div>
          <div><span className="text-muted-foreground">{t("fields.accountNumber")}: </span>{detail.account_number}</div>
          <div><span className="text-muted-foreground">{t("fields.accountHolder")}: </span>{detail.account_holder}</div>
          <div><span className="text-muted-foreground">{t("fields.currency")}: </span>{detail.currency_detail?.code ?? detail.currency}</div>
          <div><span className="text-muted-foreground">{t("fields.status")}: </span>{detail.is_active ? t("status.active") : t("status.inactive")}</div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{tCommon("error")}</div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("detail.transactionHistory")}</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("fields.transactionDate")}</TableHead>
                <TableHead>{t("fields.transactionType")}</TableHead>
                <TableHead>{t("fields.referenceType")}</TableHead>
                <TableHead>{t("fields.referenceNumber")}</TableHead>
                <TableHead>{t("fields.relatedEntity")}</TableHead>
                <TableHead className="text-right">{t("fields.amount")}</TableHead>
                <TableHead>{t("fields.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingHistory ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    {t("detail.noTransactions")}
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((row) => (
                  <TableRow key={`${row.transaction_type}-${row.id}`}>
                    <TableCell>{new Date(row.transaction_date).toLocaleString()}</TableCell>
                    <TableCell>{row.transaction_type}</TableCell>
                    <TableCell>{row.reference_type}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {isReferenceClickable(row) ? (
                        <button
                          type="button"
                          onClick={() => handleReferenceClick(row)}
                          className="text-primary underline-offset-4 hover:underline cursor-pointer"
                        >
                          {row.reference_number ?? row.reference_id}
                        </button>
                      ) : (
                        row.reference_number ?? row.reference_id
                      )}
                    </TableCell>
                    <TableCell>
                      {isRelatedEntityClickable(row) ? (
                        <button
                          type="button"
                          onClick={() => handleRelatedEntityClick(row)}
                          className="text-primary underline-offset-4 hover:underline cursor-pointer"
                        >
                          {row.related_entity_label ?? "-"}
                        </button>
                      ) : (
                        row.related_entity_label ?? "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                    <TableCell>{row.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DataTablePagination
        pageIndex={pagination?.page ?? page}
        pageSize={pagination?.per_page ?? pageSize}
        rowCount={pagination?.total ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(1);
        }}
      />

      <CustomerDetailModal
        open={customerDetailOpen}
        onOpenChange={(open) => {
          setCustomerDetailOpen(open);
          if (!open) setCustomerDetailId(null);
        }}
        customerId={customerDetailId}
      />

      <SupplierDetailModal
        open={supplierDetailOpen}
        onOpenChange={(open) => {
          setSupplierDetailOpen(open);
          if (!open) setSupplierDetailId(null);
        }}
        supplierId={supplierDetailId}
      />

      <SalesPaymentDetail
        open={salesPaymentDetailOpen}
        onClose={() => {
          setSalesPaymentDetailOpen(false);
          setSalesPaymentDetailId(null);
        }}
        paymentId={salesPaymentDetailId}
      />

      <PurchasePaymentDetail
        open={purchasePaymentDetailOpen}
        onClose={() => {
          setPurchasePaymentDetailOpen(false);
          setPurchasePaymentDetailId(null);
        }}
        paymentId={purchasePaymentDetailId}
      />

      <JournalDetailModal
        open={journalDetailOpen}
        onOpenChange={(open) => {
          setJournalDetailOpen(open);
          if (!open) setJournalDetailId(null);
        }}
        id={journalDetailId}
      />
    </div>
  );
}
