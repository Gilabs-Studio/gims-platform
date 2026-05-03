"use client";

import { useState } from "react";
import {
  CalendarIcon,
  Eye,
  MoreHorizontal,
  Search,
  Star,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";

import {
  useFeedbackForms,
  useFeedbackResponse,
  useFeedbackResponses,
} from "../hooks/use-feedback";
import type { FeedbackResponseItem } from "../types";
import { OrderDetailModal } from "@/features/sales/order/components/order-detail-modal";
import { useOrder } from "@/features/sales/order/hooks/use-orders";
import type { SalesOrder } from "@/features/sales/order/types";

export function FeedbackResponseList() {
  const t = useTranslations("feedback.responses");
  const tCommon = useTranslations("common");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [filterFormId, setFilterFormId] = useState<string | undefined>();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState<string | null>(null);
  const [isSalesOrderDetailOpen, setIsSalesOrderDetailOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useFeedbackResponses({
    page,
    per_page: pageSize,
    form_id: filterFormId,
    search: debouncedSearch || undefined,
  });

  const { data: formsData } = useFeedbackForms({ per_page: 100 });

  const { data: detailData, isLoading: detailLoading } = useFeedbackResponse(
    detailId ?? "",
    { enabled: !!detailId && detailOpen }
  );

  const items = data?.data ?? [];
  const pagination = data?.meta?.pagination;
  const forms = formsData?.data ?? [];

  function openDetail(id: string) {
    setDetailId(id);
    setDetailOpen(true);
  }

  function openSalesOrder(orderId: string) {
    setSelectedSalesOrderId(orderId);
    setIsSalesOrderDetailOpen(true);
  }

  if (isError) {
    return (
      <div className="p-4 text-center text-destructive">
        {tCommon("noData")}
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="mt-4 ml-2 cursor-pointer"
        >
          {tCommon("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>

        <Select
          value={filterFormId ?? "__all__"}
          onValueChange={(v) => {
            setFilterFormId(v === "__all__" ? undefined : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="min-w-40">
            <SelectValue placeholder={t("filters.allForms")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("filters.allForms")}</SelectItem>
            {forms.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("customer")}</TableHead>
              <TableHead>{t("outlet")}</TableHead>
              <TableHead>{t("orderId")}</TableHead>
              <TableHead>{t("avgScore")}</TableHead>
              <TableHead>{t("submittedAt")}</TableHead>
              <TableHead className="w-[80px]">{tCommon("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              : items.length === 0
              ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                )
              : items.map((item: FeedbackResponseItem) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.customer_name ?? "—"}</TableCell>
                    <TableCell>{item.outlet_name ?? item.outlet_id ?? "—"}</TableCell>
                    <TableCell>
                      {item.pos_order_id ? (
                        <SalesOrderLink
                          orderId={item.pos_order_id}
                          onOpen={openSalesOrder}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {item.avg_score != null ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                          {item.avg_score.toFixed(1)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {format(new Date(item.submitted_at), "dd MMM yyyy HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openDetail(item.id)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t("viewDetail")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <DataTablePagination
          pageIndex={page}
          pageSize={pageSize}
          rowCount={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("detail.title")}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : detailData?.data ? (
            <DetailContent item={detailData.data} />
          ) : null}
        </DialogContent>
      </Dialog>

      <OrderDetailModal
        open={isSalesOrderDetailOpen}
        onClose={() => setIsSalesOrderDetailOpen(false)}
        order={selectedSalesOrderId ? ({ id: selectedSalesOrderId } as unknown as SalesOrder) : null}
      />
    </div>
  );
}

function SalesOrderLink({
  orderId,
  onOpen,
}: {
  orderId: string;
  onOpen: (orderId: string) => void;
}) {
  const { data } = useOrder(orderId, { enabled: !!orderId });

  const orderCode = data?.data?.code ?? orderId;

  return (
    <button
      type="button"
      onClick={() => onOpen(orderId)}
      className="text-primary hover:underline cursor-pointer text-left"
      title={orderCode}
    >
      {orderCode}
    </button>
  );
}

function DetailContent({ item }: { item: FeedbackResponseItem }) {
  const t = useTranslations("feedback.responses");

  const entries = Object.entries(item.answers ?? {});

  return (
    <div className="space-y-4 text-sm">
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="text-muted-foreground font-medium w-32">{t("customer")}</TableCell>
            <TableCell>{item.customer_name ?? "—"}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground font-medium">{t("outlet")}</TableCell>
            <TableCell>{item.outlet_name ?? item.outlet_id ?? "—"}</TableCell>
          </TableRow>
          {item.pos_order_id && (
            <TableRow>
              <TableCell className="text-muted-foreground font-medium">{t("orderId")}</TableCell>
              <TableCell>{item.pos_order_id}</TableCell>
            </TableRow>
          )}
          {item.avg_score != null && (
            <TableRow>
              <TableCell className="text-muted-foreground font-medium">{t("avgScore")}</TableCell>
              <TableCell className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                {item.avg_score.toFixed(1)}
              </TableCell>
            </TableRow>
          )}
          <TableRow>
            <TableCell className="text-muted-foreground font-medium">{t("submittedAt")}</TableCell>
            <TableCell>
              {format(new Date(item.submitted_at), "dd MMM yyyy HH:mm")}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {entries.length > 0 && (
        <div className="border-t pt-3 space-y-2">
          <p className="font-medium">{t("detail.answers")}</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Question</TableHead>
                <TableHead>Answer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(([key, val]) => (
                <TableRow key={key}>
                  <TableCell className="text-muted-foreground wrap-break-word">{key}</TableCell>
                  <TableCell>
                    {Array.isArray(val)
                      ? val.join(", ")
                      : val !== null && val !== undefined
                      ? String(val)
                      : t("detail.noAnswer")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
