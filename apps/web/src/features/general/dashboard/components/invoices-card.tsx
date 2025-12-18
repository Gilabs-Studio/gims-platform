"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationFirst,
  PaginationLast,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useTranslations } from "next-intl";
import { useInvoices } from "../hooks/use-invoices";
import type { InvoiceSummary } from "../types";
import { Skeleton } from "@/components/ui/skeleton";

type InvoiceStatus = "all" | "unpaid" | "paid" | "recent_request";

interface InvoicesCardProps {
  readonly summary?: InvoiceSummary;
}

export function InvoicesCard({ summary: initialSummary }: InvoicesCardProps) {
  const t = useTranslations("dashboard.invoices");
  const [status, setStatus] = useState<InvoiceStatus>("all");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const { data, isLoading, isError } = useInvoices({
    page,
    per_page: perPage,
    status: status === "all" ? undefined : status,
  });

  const invoices = data?.invoices ?? [];
  const pagination = data?.pagination;
  const summary = data?.summary ?? initialSummary;

  // Calculate percentages for progress bars based on invoice counts
  const totalCount = summary?.total ?? 0;
  const paidCount = summary?.paid ?? 0;
  const recentRequestsCount = summary?.recent_requests ?? 0;
  const unpaidCount = summary?.unpaid ?? 0;

  const paidPercentage = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
  const recentRequestsPercentage = totalCount > 0 ? (recentRequestsCount / totalCount) * 100 : 0;
  const unpaidPercentage = totalCount > 0 ? (unpaidCount / totalCount) * 100 : 0;

  const handleStatusChange = (value: string) => {
    setStatus(value as InvoiceStatus);
    setPage(1); // Reset to first page when changing status
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPagination = () => {
    if (!pagination || pagination.total_pages <= 1) return null;

    const pages: (number | "ellipsis")[] = [];
    const totalPages = pagination.total_pages;
    const currentPage = pagination.page;

    // Always show first page
    if (totalPages > 0) {
      pages.push(1);
    }

    // Show ellipsis if needed
    if (currentPage > 3) {
      pages.push("ellipsis");
    }

    // Show pages around current page
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      pages.push("ellipsis");
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationFirst
              onClick={() => handlePageChange(1)}
              disabled={!pagination.has_prev}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.has_prev}
            />
          </PaginationItem>
          {pages.map((pageNum, index) => {
            if (pageNum === "ellipsis") {
              return (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  onClick={() => handlePageChange(pageNum)}
                  isActive={pageNum === currentPage}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.has_next}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLast
              onClick={() => handlePageChange(totalPages)}
              disabled={!pagination.has_next}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Section 1: Single Progress Bar Summary with colored segments */}
        {summary && (
          <div className="mb-6 space-y-4">
            {/* Single progress bar with 3 colored segments */}
            <div className="space-y-2">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                {/* Paid segment (green) */}
                {paidPercentage > 0 && (
                  <div
                    className="absolute top-0 h-full bg-green-500"
                    style={{
                      left: "0%",
                      width: `${paidPercentage}%`,
                    }}
                  />
                )}
                {/* Recent Requests segment (yellow) */}
                {recentRequestsPercentage > 0 && (
                  <div
                    className="absolute top-0 h-full bg-yellow-500"
                    style={{
                      left: `${paidPercentage}%`,
                      width: `${recentRequestsPercentage}%`,
                    }}
                  />
                )}
                {/* Unpaid segment (orange) */}
                {unpaidPercentage > 0 && (
                  <div
                    className="absolute top-0 h-full bg-orange-400"
                    style={{
                      left: `${paidPercentage + recentRequestsPercentage}%`,
                      width: `${unpaidPercentage}%`,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Summary Stats - without Total */}
            <div className="grid grid-cols-3 gap-4 rounded-lg border bg-muted/50 p-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t("summary.unpaid")}</span>
                <span className="text-lg font-semibold">
                  {summary.unpaid_formatted ?? String(summary.unpaid ?? 0)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t("summary.recentRequests")}</span>
                <span className="text-lg font-semibold">
                  {summary.recent_requests_formatted ??
                    String(summary.recent_requests ?? 0)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t("summary.paid")}</span>
                <span className="text-lg font-semibold">
                  {summary.paid_formatted ?? String(summary.paid ?? 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Tabs and Table */}
        <Tabs value={status} onValueChange={handleStatusChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
            <TabsTrigger value="unpaid">{t("tabs.unpaid")}</TabsTrigger>
            <TabsTrigger value="recent_request">{t("tabs.recentRequest")}</TabsTrigger>
            <TabsTrigger value="paid">{t("tabs.paid")}</TabsTrigger>
          </TabsList>

          <TabsContent value={status} className="mt-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("error")}
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("empty")}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox />
                      </TableHead>
                      <TableHead>{t("table.company")}</TableHead>
                      <TableHead>{t("table.issueDate")}</TableHead>
                      <TableHead>{t("table.contact")}</TableHead>
                      <TableHead className="text-right">{t("table.value")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <Checkbox />
                        </TableCell>
                        <TableCell className="font-medium">
                          {invoice.company}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.issue_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{invoice.contact}</TableCell>
                        <TableCell className="text-right">
                          {invoice.value_formatted}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {renderPagination()}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

