"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  AlertTriangle,
  Ban,
  CheckCircle2,
  CircleDot,
  Clock,
  CreditCard,
  LayoutGrid,
  LogOut,
  Map as MapIcon,
  Users,
  Utensils,
  Archive,
  Trash2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import "@/features/pos/fb/pos-fb-theme.module.css";
import { useLiveTableData } from "../hooks/use-live-table";
import { usePOSOutlets } from "@/features/pos/terminal/hooks/use-pos";
import { usePosWs } from "../hooks/use-pos-ws";
import {
  useServeOrder,
  useCompleteOrder,
  useServeOrderItem,
  useCancelPendingPOSPayment,
  usePOSPayments,
  useVoidOrder,
  useDeleteOrder,
} from "@/features/pos/terminal/hooks/use-pos";
import { usePOSUIStore } from "@/features/pos/stores/use-pos-ui-store";
import type { LiveTableInfo, LiveTableStatus } from "../types";
import type { LayoutObject } from "@/features/pos/fb/floor-layout/types";
import type { POSOrder, POSPayment } from "@/features/pos/terminal/types";
import { ActiveTablePaymentDialog } from "./active-table-payment-dialog";
import { POSReceiptDialog } from "@/features/pos/terminal/components/pos-receipt-dialog";

type PaymentNotice = {
  tableLabel: string;
  orderId?: string;
  orderNumber?: string;
  at: number;
};

// ─── Status definitions ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  LiveTableStatus,
  {
    dot: string;
    card: string;
    text: string;
    icon: React.ElementType;
  }
> = {
  AVAILABLE: {
    dot: "bg-success",
    card: "border-success/30 bg-gradient-to-br from-success/15 via-success/5 to-background",
    text: "text-success",
    icon: CheckCircle2,
  },
  WAITING_PAYMENT: {
    dot: "bg-amber-500 animate-pulse",
    card: "border-amber-500/45 bg-gradient-to-br from-amber-500/18 via-amber-500/8 to-background",
    text: "text-amber-600",
    icon: CreditCard,
  },
  SEATED: {
    dot: "bg-primary",
    card: "border-primary/40 bg-gradient-to-br from-primary/18 via-primary/8 to-background",
    text: "text-primary",
    icon: Users,
  },
  WARN_LONG: {
    dot: "bg-rose animate-pulse",
    card: "border-rose/40 bg-gradient-to-br from-rose/18 via-rose/8 to-background",
    text: "text-rose",
    icon: AlertTriangle,
  },
  PARTIAL_SERVED: {
    dot: "bg-warning",
    card: "border-warning/40 bg-gradient-to-br from-warning/18 via-warning/8 to-background",
    text: "text-warning",
    icon: Utensils,
  },
  SERVED: {
    dot: "bg-purple",
    card: "border-purple/40 bg-gradient-to-br from-purple/16 via-purple/7 to-background",
    text: "text-purple",
    icon: CircleDot,
  },
};

function getStatusLabel(
  status: LiveTableStatus,
  t: ReturnType<typeof useTranslations>,
): string {
  const labelMap: Record<LiveTableStatus, string> = {
    AVAILABLE: t("statusLabels.available"),
    WAITING_PAYMENT: t("statusLabels.waitingPayment"),
    SEATED: t("statusLabels.occupied"),
    WARN_LONG: t("statusLabels.longWait"),
    PARTIAL_SERVED: t("statusLabels.partial"),
    SERVED: t("statusLabels.served"),
  };
  return labelMap[status];
}
function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatSeatCount(count: number): string {
  return `${count} seat${count === 1 ? "" : "s"}`;
}

function getPendingServeItemCount(order: POSOrder): number {
  if (!order.items.length) return 0;
  return order.items.reduce((total, item) => {
    if (item.status === "SERVED" || item.status === "CANCELLED") return total;
    return total + Math.max(item.quantity, 0);
  }, 0);
}

// ─── Table Card ───────────────────────────────────────────────────────────────

interface TableCardProps {
  info: LiveTableInfo;
  onClick: () => void;
  onDropDraft: (draftId: string, tableId: string, tableLabel: string) => void;
}

function TableCard({ info, onClick, onDropDraft }: TableCardProps) {
  const cfg = STATUS_CONFIG[info.status];
  const Icon = cfg.icon;
  const t = useTranslations("posTerminal.liveTable");
  const label =
    info.tableObj.label ?? `T${info.tableObj.tableNumber ?? info.tableObj.id}`;
  const [isDragOver, setIsDragOver] = useState(false);
  const isAvailable = info.status === "AVAILABLE";

  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={(e) => {
        if (isAvailable) {
          e.preventDefault();
          setIsDragOver(true);
        }
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        if (isAvailable) {
          e.preventDefault();
          setIsDragOver(false);
          const draftId = e.dataTransfer.getData("text/plain");
          if (draftId) {
            onDropDraft(draftId, info.tableObj.id, label);
          }
        }
      }}
      className={cn(
        "group relative flex flex-col rounded-2xl border p-4 text-left",
        "transition-all duration-200 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring hover:-translate-y-0.5",
        "hover:shadow-md active:scale-[0.98] cursor-pointer",
        isDragOver
          ? "border-primary ring-2 ring-primary/20 bg-primary/5 scale-[1.02]"
          : cfg.card,
      )}
    >
      <span
        className={cn("absolute top-3 right-3 h-2 w-2 rounded-full", cfg.dot)}
      />
      {/* Customer self-order badge */}
      {info.order?.order_source === "CUSTOMER" && (
        <span className="absolute top-2 left-2 rounded-full bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 leading-none">
          {t("guest")}
        </span>
      )}
      <p className="text-2xl font-bold tracking-tight text-foreground">
        {label}
      </p>
      <div
        className={cn(
          "mt-1.5 flex items-center gap-1.5 text-xs font-medium",
          cfg.text,
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{getStatusLabel(info.status, t)}</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span>{formatSeatCount(info.seatCount)}</span>
      </div>
      {(info.needsPaymentCount > 0 ||
        info.needsServeCount > 0 ||
        info.doneCount > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {info.needsPaymentCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 rounded-full border-amber-500/35 bg-amber-500/10 px-2 text-[9px] font-semibold text-amber-700"
            >
              Pay {info.needsPaymentCount}
            </Badge>
          )}
          {info.needsServeCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 rounded-full border-primary/35 bg-primary/10 px-2 text-[9px] font-semibold text-primary"
            >
              Serve {info.needsServeCount}
            </Badge>
          )}
          {info.doneCount > 0 && (
            <Badge
              variant="outline"
              className="h-5 rounded-full border-success/35 bg-success/10 px-2 text-[9px] font-semibold text-success"
            >
              Done {info.doneCount}
            </Badge>
          )}
        </div>
      )}
      {info.status !== "AVAILABLE" && info.order ? (
        <div className="mt-3 space-y-0.5">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{formatDuration(info.durationSec)}</span>
            {info.isOverThreshold && (
              <AlertTriangle className="h-3 w-3 text-rose-500 ml-0.5" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono truncate">
            #{info.order.order_number}
          </p>
          {info.orders.length > 1 && (
            <p className="text-[10px] text-muted-foreground">
              {info.orders.length} active orders in session
            </p>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {getStatusLabel(info.status, t)}
        </p>
      )}
    </button>
  );
}

// ─── Table Grid ───────────────────────────────────────────────────────────────

interface TableGridProps {
  infos: LiveTableInfo[];
  onTableClick: (info: LiveTableInfo) => void;
  onDropDraft: (draftId: string, tableId: string, tableLabel: string) => void;
}

function TableGrid({ infos, onTableClick, onDropDraft }: TableGridProps) {
  return (
    <div className="flex min-h-full flex-1 items-start justify-start p-5 sm:p-8">
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(160px, 200px))`,
          justifyContent: "start",
          width: "100%",
          maxWidth: 960,
        }}
      >
        {infos.map((info) => (
          <TableCard
            key={info.tableObj.id}
            info={info}
            onClick={() => onTableClick(info)}
            onDropDraft={onDropDraft}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Order Detail Dialog ──────────────────────────────────────────────────────

interface OrderDetailDialogProps {
  info: LiveTableInfo | null;
  onClose: () => void;
  onOpenReceipt: (payload: {
    order: POSOrder;
    customerName?: string;
    customerPhone?: string;
    tenderAmount?: number;
  }) => void;
  onEditOrder?: (order: POSOrder) => void;
}

interface SessionOrderRowProps {
  order: POSOrder;
  onOpenReceipt: (payload: {
    order: POSOrder;
    customerName?: string;
    customerPhone?: string;
    tenderAmount?: number;
  }) => void;
  onEditOrder?: () => void;
}

function SessionOrderRow({
  order,
  onOpenReceipt,
  onEditOrder,
}: SessionOrderRowProps) {
  const t = useTranslations("posTerminal.liveTable");
  const { data: paymentsData } = usePOSPayments(order.id, {
    enabled: !!order.id,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const payments = (paymentsData?.data ?? []) as POSPayment[];
  const paidPayment = payments.find((p) => p.status === "PAID") ?? null;
  const pendingServeCount = getPendingServeItemCount(order);
  const canOpenReceipt =
    !!paidPayment ||
    order.status === "PAID" ||
    order.status === "PARTIAL_SERVED" ||
    order.status === "SERVED" ||
    order.status === "COMPLETED";

  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold truncate">
                #{order.order_number}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {order.customer_name || "Walk-in"}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "h-5 px-2 text-[9px] rounded-full",
                order.status === "SERVED" &&
                  "border-success/35 bg-success/10 text-success",
                (order.status === "PAID" ||
                  order.status === "PARTIAL_SERVED") &&
                  "border-primary/35 bg-primary/10 text-primary",
                (order.status === "DRAFT" ||
                  order.status === "IN_PROGRESS" ||
                  order.status === "READY" ||
                  order.status === "WAITING_PAYMENT") &&
                  "border-amber-500/35 bg-amber-500/10 text-amber-700",
              )}
            >
              {order.status.replace("_", " ")}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Total</span>
            <span className="tabular-nums">
              Rp {order.total_amount.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            {order.status !== "COMPLETED" && order.status !== "VOIDED" && (
              <Badge
                variant="outline"
                className="h-5 rounded-full border-muted-foreground/20 px-2 text-[9px]"
              >
                Items {order.items.length}
              </Badge>
            )}
            {pendingServeCount > 0 && (
              <Badge
                variant="outline"
                className="h-5 rounded-full border-primary/35 bg-primary/10 px-2 text-[9px] text-primary"
              >
                Need Serve {pendingServeCount}
              </Badge>
            )}
            {order.status === "SERVED" && (
              <Badge
                variant="outline"
                className="h-5 rounded-full border-success/35 bg-success/10 px-2 text-[9px] text-success"
              >
                Done Serve
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-start">
          {canOpenReceipt ? (
            <Button
              type="button"
              variant="outline"
              className="h-8 min-w-[86px] px-3 text-[11px] cursor-pointer"
              onClick={() =>
                onOpenReceipt({
                  order,
                  customerName: order.customer_name ?? undefined,
                  tenderAmount:
                    paidPayment?.method === "CASH"
                      ? paidPayment.tender_amount
                      : undefined,
                })
              }
            >
              {t("sidebar.viewReceipt")}
            </Button>
          ) : (
            <div className="flex flex-col gap-1 shrink-0">
              {(order.status === "DRAFT" ||
                order.status === "IN_PROGRESS" ||
                order.status === "READY" ||
                order.status === "WAITING_PAYMENT") &&
                onEditOrder && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 min-w-[86px] px-3 text-[11px] cursor-pointer flex items-center justify-center gap-1 bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
                    onClick={onEditOrder}
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </Button>
                )}
              <span className="text-[10px] text-muted-foreground text-center">
                No receipt
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderDetailDialog({
  info,
  onClose,
  onOpenReceipt,
  onEditOrder,
}: OrderDetailDialogProps) {
  const t = useTranslations("posTerminal.liveTable");

  if (!info) return null;
  const cfg = STATUS_CONFIG[info.status];
  const Icon = cfg.icon;
  const label =
    info.tableObj.label ?? `T${info.tableObj.tableNumber ?? info.tableObj.id}`;
  const activeOrders = info.orders;
  const order = info.order;
  const sessionTotal = activeOrders.reduce(
    (total, sessionOrder) => total + sessionOrder.total_amount,
    0,
  );

  return (
    <Dialog open={!!info} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="default">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{label}</span>
            <Badge
              variant="outline"
              className={cn("gap-1 rounded-full border-current", cfg.text)}
            >
              <Icon className="h-3 w-3" />
              {getStatusLabel(info.status, t)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {!order ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-success/40" />
            <p className="text-sm">{t("messages.tableAvailable")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                <p className={cn("font-bold text-sm", cfg.text)}>
                  {formatDuration(info.durationSec)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Orders</p>
                <p className="font-bold text-sm">{activeOrders.length}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="font-bold text-sm tabular-nums">
                  Rp {sessionTotal.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-center">
                <p className="text-[10px] text-amber-700 uppercase tracking-wider">
                  Need Pay
                </p>
                <p className="mt-0.5 text-sm font-semibold text-amber-700">
                  {info.needsPaymentCount}
                </p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-2 text-center">
                <p className="text-[10px] text-primary uppercase tracking-wider">
                  Need Serve
                </p>
                <p className="mt-0.5 text-sm font-semibold text-primary">
                  {info.needsServeCount}
                </p>
              </div>
              <div className="rounded-lg border border-success/30 bg-success/10 px-2.5 py-2 text-center">
                <p className="text-[10px] text-success uppercase tracking-wider">
                  Done
                </p>
                <p className="mt-0.5 text-sm font-semibold text-success">
                  {info.doneCount}
                </p>
              </div>
            </div>

            {info.isOverThreshold && (
              <div className="flex items-center gap-2 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-sm text-rose">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Table has been occupied for over 30 minutes.</span>
              </div>
            )}

            <Separator />

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Session Orders
              </p>
              <ScrollArea className="max-h-80">
                <div className="space-y-2 pr-1">
                  {activeOrders.map((sessionOrder) => (
                    <SessionOrderRow
                      key={sessionOrder.id}
                      order={sessionOrder}
                      onOpenReceipt={onOpenReceipt}
                      onEditOrder={
                        onEditOrder
                          ? () => onEditOrder(sessionOrder)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ActiveTableCancelDialogProps {
  info: LiveTableInfo | null;
  onClose: () => void;
}

function ActiveTableCancelDialog({
  info,
  onClose,
}: ActiveTableCancelDialogProps) {
  const t = useTranslations("posTerminal.liveTable.payNow");
  const cancelPayment = useCancelPendingPOSPayment({
    invalidateOnSuccess: false,
  });
  const voidOrder = useVoidOrder({ invalidateOnSuccess: false });
  const [reason, setReason] = useState("");
  const order = info?.unpaidOrder ?? null;
  const tableLabel = info
    ? (info.tableObj.label ??
      `T${info.tableObj.tableNumber ?? info.tableObj.id}`)
    : "";

  const { data: paymentsData } = usePOSPayments(order?.id ?? "", {
    enabled: !!order?.id,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  const payments = (paymentsData?.data ?? []) as POSPayment[];
  const pendingPayment =
    payments.find((payment) => payment.status === "PENDING") ?? null;

  if (!info || !order) return null;

  const handleSubmit = async () => {
    try {
      if (pendingPayment) {
        await cancelPayment.mutateAsync({
          orderId: order.id,
          paymentId: pendingPayment.id,
          reason: reason.trim() || undefined,
        });
      } else {
        await voidOrder.mutateAsync({
          id: order.id,
          data: {
            reason: reason.trim() || "Cancelled at cashier",
          },
        });
      }
      toast.success(t("cancelPaymentSuccess"));
      setReason("");
      onClose();
    } catch {
      toast.error(t("cancelPaymentFailed"));
    }
  };

  return (
    <Dialog open={!!info} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>
            {t("cancelPaymentTitle")} · {tableLabel}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("cancelPaymentDescription")}
          </p>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
            <p className="text-xs text-muted-foreground">
              #{order.order_number}
            </p>
            <p className="mt-1 text-sm font-medium">
              Rp {order.total_amount.toLocaleString("id-ID")}
            </p>
          </div>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("cancelPaymentPlaceholder")}
            rows={4}
          />
          <div className="grid grid-cols-4 gap-2">
            <Button
              type="button"
              variant="outline"
              className="col-span-2 cursor-pointer"
              onClick={onClose}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="col-span-2 cursor-pointer"
              disabled={cancelPayment.isPending || voidOrder.isPending}
              onClick={handleSubmit}
            >
              {cancelPayment.isPending || voidOrder.isPending
                ? t("cancelPaymentLoading")
                : t("cancelPaymentAction")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



// ─── SVG fill colors for floor-layout view (raw CSS values, no Tailwind) ────
const STATUS_SVG: Record<
  LiveTableStatus,
  { fill: string; stroke: string; text: string }
> = {
  AVAILABLE: {
    fill: "var(--pos-available-fill)",
    stroke: "var(--pos-available-stroke)",
    text: "var(--pos-available-text)",
  },
  WAITING_PAYMENT: {
    fill: "var(--pos-partial-fill)",
    stroke: "var(--pos-partial-stroke)",
    text: "var(--pos-partial-text)",
  },
  SEATED: {
    fill: "var(--pos-seated-fill)",
    stroke: "var(--pos-seated-stroke)",
    text: "var(--pos-seated-text)",
  },
  WARN_LONG: {
    fill: "var(--pos-warn-fill)",
    stroke: "var(--pos-warn-stroke)",
    text: "var(--pos-warn-text)",
  },
  PARTIAL_SERVED: {
    fill: "var(--pos-partial-fill)",
    stroke: "var(--pos-partial-stroke)",
    text: "var(--pos-partial-text)",
  },
  SERVED: {
    fill: "var(--pos-served-fill)",
    stroke: "var(--pos-served-stroke)",
    text: "var(--pos-served-text)",
  },
};

// ─── Floor Layout View ────────────────────────────────────────────────────────

interface LiveFloorViewProps {
  planWidth: number;
  planHeight: number;
  layoutObjects: LayoutObject[];
  infos: LiveTableInfo[];
  onTableClick: (info: LiveTableInfo) => void;
  onDropDraft: (draftId: string, tableId: string, tableLabel: string) => void;
}

function LiveFloorView({
  planWidth,
  planHeight,
  layoutObjects,
  infos,
  onTableClick,
  onDropDraft,
}: LiveFloorViewProps) {
  const infoByLabel = useMemo(() => {
    const map = new Map<string, LiveTableInfo>();
    for (const info of infos) {
      const label =
        info.tableObj.label ??
        info.tableObj.tableNumber?.toString() ??
        info.tableObj.id;
      map.set(label, info);
    }
    return map;
  }, [infos]);

  const [scale, setScale] = useState(1);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    setScale((prev) => Math.min(3, Math.max(0.3, prev - e.deltaY * 0.0004)));
  }, []);

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-auto p-4">
      {/* Zoom controls */}
      <div className="absolute right-5 top-5 z-10 flex flex-col gap-1">
        <button
          onClick={() => setScale((s) => Math.min(3, +(s + 0.1).toFixed(2)))}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-background text-lg leading-none shadow hover:bg-accent"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => setScale(1)}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-background text-[11px] font-medium shadow hover:bg-accent"
          title="Reset zoom"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.3, +(s - 0.1).toFixed(2)))}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-background text-lg leading-none shadow hover:bg-accent"
          title="Zoom out"
        >
          &minus;
        </button>
      </div>

      <div
        className="overflow-auto"
        onWheel={handleWheel}
        style={{ maxWidth: "100%", maxHeight: "100%" }}
      >
        <svg
          viewBox={`0 0 ${planWidth} ${planHeight}`}
          className="rounded-2xl border bg-muted/10"
          style={{
            width: planWidth * scale,
            height: planHeight * scale,
            minWidth: 280,
            transition: "width 0.15s, height 0.15s",
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          {layoutObjects.map((obj) => {
            const transform = `translate(${obj.x}, ${obj.y}) rotate(${obj.rotation ?? 0}, ${obj.width / 2}, ${obj.height / 2})`;

            if (obj.type === "table") {
              const label = obj.label ?? obj.tableNumber?.toString() ?? obj.id;
              const info = infoByLabel.get(label);
              const colors = info
                ? STATUS_SVG[info.status]
                : STATUS_SVG.AVAILABLE;
              const isCircle = obj.tableShape === "circle";
              const r = Math.min(obj.width, obj.height) / 2;
              const seatCountText = formatSeatCount(info?.seatCount ?? 0);

              const isOver = hoveredTableId === obj.id;
              const isAvailable = !info || info.status === "AVAILABLE";

              return (
                <g
                  key={obj.id}
                  transform={transform}
                  onClick={() => info && onTableClick(info)}
                  onDragOver={(e) => {
                    if (isAvailable) {
                      e.preventDefault();
                      setHoveredTableId(obj.id);
                    }
                  }}
                  onDragLeave={() => {
                    setHoveredTableId(null);
                  }}
                  onDrop={(e) => {
                    if (isAvailable) {
                      e.preventDefault();
                      setHoveredTableId(null);
                      const draftId = e.dataTransfer.getData("text/plain");
                      const tId = info?.tableObj.id || obj.id;
                      if (draftId && onDropDraft) {
                        onDropDraft(draftId, tId, label);
                      }
                    }
                  }}
                  style={{ cursor: info ? "pointer" : "default" }}
                >
                  {isCircle ? (
                    <circle
                      cx={obj.width / 2}
                      cy={obj.height / 2}
                      r={r - 2}
                      fill={isOver ? "rgba(59, 130, 246, 0.15)" : colors.fill}
                      stroke={
                        isOver ? "var(--primary, #3b82f6)" : colors.stroke
                      }
                      strokeWidth={isOver ? 3 : 2}
                    />
                  ) : (
                    <rect
                      x={1}
                      y={1}
                      width={obj.width - 2}
                      height={obj.height - 2}
                      rx={6}
                      fill={isOver ? "rgba(59, 130, 246, 0.15)" : colors.fill}
                      stroke={
                        isOver ? "var(--primary, #3b82f6)" : colors.stroke
                      }
                      strokeWidth={isOver ? 3 : 2}
                    />
                  )}
                  <text
                    x={obj.width / 2}
                    y={obj.height * 0.43}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={Math.min(obj.width, obj.height) * 0.28}
                    fontWeight="700"
                    fill={colors.text}
                    className="select-none pointer-events-none"
                  >
                    {label}
                  </text>
                  <text
                    x={obj.width / 2}
                    y={obj.height * 0.67}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={Math.min(obj.width, obj.height) * 0.14}
                    fill={colors.text}
                    opacity={0.8}
                    className="select-none pointer-events-none"
                  >
                    {seatCountText}
                  </text>
                  {info?.order && (
                    <text
                      x={obj.width / 2}
                      y={obj.height * 0.82}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={Math.min(obj.width, obj.height) * 0.18}
                      fill={colors.text}
                      opacity={0.75}
                      className="select-none pointer-events-none"
                    >
                      {formatDuration(info.durationSec)}
                    </text>
                  )}
                </g>
              );
            }

            if (obj.type === "wall") {
              return (
                <rect
                  key={obj.id}
                  transform={transform}
                  x={0}
                  y={0}
                  width={obj.width}
                  height={obj.height}
                  fill="var(--pos-wall-fill)"
                  rx={1}
                />
              );
            }

            if (obj.type === "zone") {
              const color = obj.color ?? "var(--pos-zone-default)";
              return (
                <rect
                  key={obj.id}
                  transform={transform}
                  x={0}
                  y={0}
                  width={obj.width}
                  height={obj.height}
                  rx={8}
                  fill={color}
                  opacity={(obj.opacity ?? 30) / 100}
                  stroke={color}
                  strokeWidth={1}
                />
              );
            }

            if (obj.type === "door") {
              return (
                <rect
                  key={obj.id}
                  transform={transform}
                  x={0}
                  y={0}
                  width={obj.width}
                  height={obj.height}
                  rx={2}
                  fill="var(--pos-door-fill)"
                  stroke="var(--pos-door-stroke)"
                  strokeWidth={1}
                />
              );
            }

            if (obj.type === "chair") {
              return (
                <rect
                  key={obj.id}
                  transform={transform}
                  x={1}
                  y={1}
                  width={obj.width - 2}
                  height={obj.height - 2}
                  rx={4}
                  fill="var(--pos-chair-fill)"
                  stroke="var(--pos-chair-stroke)"
                  strokeWidth={1}
                />
              );
            }

            // decoration / cashier / other
            return (
              <rect
                key={obj.id}
                transform={transform}
                x={0}
                y={0}
                width={obj.width}
                height={obj.height}
                rx={4}
                fill="var(--pos-decor-fill)"
                stroke="var(--pos-decor-stroke)"
                strokeWidth={1}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Table Sidebar ────────────────────────────────────────────────────────────

interface TableSidebarProps {
  infos: LiveTableInfo[];
  onServe: (orderIds: string[]) => void;
  onComplete: (orderIds: string[]) => void;
  onServeItem: (orderId: string, itemId: string) => void;
  onOpenPaymentAction: (info: LiveTableInfo) => void;
  onOpenCancelPaymentAction: (info: LiveTableInfo) => void;
  paymentNotice: PaymentNotice | null;
  onOpenPaymentNotice: () => void;
  onDismissPaymentNotice: () => void;
  onEditOrder: (info: LiveTableInfo) => void;
  servingId?: string | null;
  completingId?: string | null;
  servingItemId?: string | null;
}

function TableSidebar({
  infos,
  onServe,
  onComplete,
  onServeItem,
  onOpenPaymentAction,
  onOpenCancelPaymentAction,
  paymentNotice,
  onOpenPaymentNotice,
  onDismissPaymentNotice,
  onEditOrder,
  servingId,
  completingId,
  servingItemId,
}: TableSidebarProps) {
  const t = useTranslations("posTerminal.liveTable");
  const occupied = infos.filter((i) => i.status !== "AVAILABLE");

  return (
    <div className="w-64 shrink-0 border-l bg-muted/10 flex flex-col h-full">
      {/* Sidebar header */}
      <div className="px-3 py-2.5 border-b shrink-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("activeTablesTitle")}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {t("activeTablesDesc", { count: occupied.length })}
        </p>

        {paymentNotice && (
          <div className="mt-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-2">
            <p className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">
              {t("confirmPaymentNotice")}
            </p>
            <p className="mt-1 text-[11px] text-foreground leading-snug">
              {paymentNotice.tableLabel} ·{" "}
              {paymentNotice.orderNumber ?? t("payNow.order")}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                className="h-6 px-2 text-[10px] cursor-pointer"
                onClick={onOpenPaymentNotice}
              >
                {t("notice_view")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px] cursor-pointer"
                onClick={onDismissPaymentNotice}
              >
                {t("notice_close")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Table list */}
      <div className="flex-1 overflow-y-auto">
        {occupied.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-xs">{t("allTablesAvailable")}</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {occupied.map((info) => {
              const cfg = STATUS_CONFIG[info.status];
              const Icon = cfg.icon;
              const tableLabel =
                info.tableObj.label ??
                `T${info.tableObj.tableNumber ?? info.tableObj.id}`;
              const paymentOrder = info.unpaidOrder;
              const serviceOrder = info.serviceOrder;
              const pendingPaymentOrders = info.unpaidOrders;
              const pendingServeOrders = info.serviceOrders;
              const doneOrders = info.servedOrders;
              const serviceQueueItems = pendingServeOrders.flatMap(
                (queueOrder) =>
                  queueOrder.items.map((item) => ({
                    orderId: queueOrder.id,
                    orderNumber: queueOrder.order_number,
                    itemId: item.id,
                    productName: item.product_name,
                    quantity: item.quantity,
                    status: item.status,
                  })),
              );
              const paymentOrderId = paymentOrder?.id;
              const serviceOrderId = serviceOrder?.id;
              const completionOrderId = doneOrders[0]?.id;
              const serviceOrderIds = pendingServeOrders.map(
                (order) => order.id,
              );

              const canServe =
                serviceOrder?.status === "PAID" ||
                serviceOrder?.status === "PARTIAL_SERVED";
              const isWaitingPayment = !!paymentOrder;
              const canServeItems =
                serviceOrder?.status === "PAID" ||
                serviceOrder?.status === "PARTIAL_SERVED";
              const canComplete = !!completionOrderId;
              const paymentConfirmed = !paymentOrder && !!serviceOrder;

              return (
                <div
                  key={info.tableObj.id}
                  className={cn(
                    "rounded-xl border p-2.5 space-y-2 transition-colors",
                    cfg.card,
                  )}
                >
                  {/* Table name + status */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.text)} />
                      <span className="font-medium text-sm truncate">
                        {tableLabel}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] shrink-0 border-current",
                        cfg.text,
                      )}
                    >
                      {getStatusLabel(info.status, t)}
                    </Badge>
                  </div>

                  {/* Timer */}
                  {info.status !== "AVAILABLE" && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{formatDuration(info.durationSec)}</span>
                      {info.order?.order_number && (
                        <>
                          <span className="mx-0.5">·</span>
                          <span className="truncate font-mono text-[10px]">
                            {info.order.order_number}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Users className="h-3 w-3 shrink-0" />
                    <span>{formatSeatCount(info.seatCount)}</span>
                  </div>

                  {(info.needsPaymentCount > 0 ||
                    info.needsServeCount > 0 ||
                    info.doneCount > 0) && (
                    <div className="flex flex-wrap items-center gap-1">
                      {info.needsPaymentCount > 0 && (
                        <Badge
                          variant="outline"
                          className="h-5 rounded-full border-amber-500/35 bg-amber-500/10 px-2 text-[9px] font-semibold text-amber-700"
                        >
                          Pay {info.needsPaymentCount}
                        </Badge>
                      )}
                      {info.needsServeCount > 0 && (
                        <Badge
                          variant="outline"
                          className="h-5 rounded-full border-primary/35 bg-primary/10 px-2 text-[9px] font-semibold text-primary"
                        >
                          Serve {info.needsServeCount}
                        </Badge>
                      )}
                      {info.doneCount > 0 && (
                        <Badge
                          variant="outline"
                          className="h-5 rounded-full border-success/35 bg-success/10 px-2 text-[9px] font-semibold text-success"
                        >
                          Done {info.doneCount}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Customer name if any */}
                  {info.order?.customer_name && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {info.order.customer_name}
                    </p>
                  )}

                  {paymentOrderId && (
                    <div className="rounded-md border border-border/60 bg-background/50 px-2 py-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("sidebar.payment")} Queue
                      </p>
                      <div className="mt-1 grid grid-cols-4 gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="col-span-2 h-6 w-full text-[10px] cursor-pointer"
                          onClick={() => onOpenPaymentAction(info)}
                        >
                          {isWaitingPayment
                            ? t("payNowAction")
                            : t("confirmPayment")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="col-span-1 h-6 w-full px-0 cursor-pointer"
                          onClick={() => onEditOrder(info)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="col-span-1 h-6 w-full px-0 cursor-pointer"
                          onClick={() => onOpenCancelPaymentAction(info)}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {isWaitingPayment && paymentOrder?.items.length ? (
                        <div className="mt-1.5 space-y-1">
                          {pendingPaymentOrders
                            .slice(0, 2)
                            .map((queueOrder) => (
                              <p
                                key={queueOrder.id}
                                className="text-[10px] text-muted-foreground line-clamp-1"
                              >
                                #{queueOrder.order_number} ·{" "}
                                {queueOrder.items[0]?.quantity ?? 0}x{" "}
                                {queueOrder.items[0]?.product_name ?? "Item"}
                              </p>
                            ))}
                          {pendingPaymentOrders.length > 2 && (
                            <p className="text-[10px] text-muted-foreground">
                              +{pendingPaymentOrders.length - 2} more orders
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {!paymentOrderId && paymentConfirmed && (
                    <div className="rounded-md border border-border/60 bg-background/50 px-2 py-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("sidebar.payment")}
                      </p>
                      <div className="mt-1 grid grid-cols-2 gap-1.5">
                        <Badge className="h-5 text-[9px] bg-emerald-600 hover:bg-emerald-600">
                          {t("paymentConfirmed")}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1.5 text-[9px] cursor-pointer"
                          onClick={() => onOpenPaymentAction(info)}
                        >
                          {t("viewDetail")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Per-item serve list (shown when some items still pending) */}
                  {serviceQueueItems.length > 0 && canServeItems && (
                    <div className="space-y-1 pt-0.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {t("sidebar.items")} Queue
                      </p>
                      {pendingServeOrders.length > 1 && (
                        <p className="text-[10px] text-muted-foreground">
                          {pendingServeOrders.length} active serve orders
                        </p>
                      )}
                      {serviceQueueItems.map((item) => {
                        const isItemServed = item.status === "SERVED";
                        const itemKey = `${item.orderId}-${item.itemId}`;
                        return (
                          <div
                            key={`${item.orderId}-${item.itemId}`}
                            className="flex items-center justify-between gap-1.5"
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full shrink-0",
                                  isItemServed ? "bg-success" : "bg-warning",
                                )}
                              />
                              <span className="truncate text-[10px]">
                                {item.quantity}× {item.productName}
                              </span>
                              <span className="text-[9px] text-muted-foreground">
                                #{item.orderNumber}
                              </span>
                            </div>
                            {!isItemServed && (
                              <Badge
                                variant="warning"
                                className={cn(
                                  "cursor-pointer text-[9px] shrink-0",
                                  servingItemId === itemKey &&
                                    "opacity-50 pointer-events-none",
                                )}
                                onClick={() => {
                                  if (servingItemId !== itemKey)
                                    onServeItem(item.orderId, item.itemId);
                                }}
                              >
                                {servingItemId === itemKey
                                  ? "…"
                                  : t("sidebar.serve")}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {doneOrders.length > 0 && (
                    <div className="rounded-md border border-success/30 bg-success/10 px-2 py-1.5">
                      <p className="text-[10px] font-semibold text-success uppercase tracking-wider">
                        Done Queue
                      </p>
                      <p className="mt-1 text-[10px] text-success/90">
                        {doneOrders.length} served order waiting customer left
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  {(serviceOrderId || canComplete) && (
                    <div className="space-y-1.5 pt-0.5">
                      {canServe && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full h-7 text-[11px] cursor-pointer gap-1.5"
                          disabled={serviceOrderIds.some(
                            (orderId) => servingId === orderId,
                          )}
                          onClick={() => onServe(serviceOrderIds)}
                        >
                          <Utensils className="h-3 w-3" />
                          {serviceOrderIds.some(
                            (orderId) => servingId === orderId,
                          )
                            ? t("sidebar.serving") + "…"
                            : t("sidebar.allServed")}
                        </Button>
                      )}
                      {canComplete && (
                        <Button
                          size="sm"
                          variant="default"
                          className="w-full h-7 text-[11px] cursor-pointer gap-1.5 bg-orange-500 hover:bg-orange-600"
                          disabled={doneOrders.some(
                            (order) => completingId === order.id,
                          )}
                          onClick={() =>
                            onComplete(doneOrders.map((order) => order.id))
                          }
                        >
                          <LogOut className="h-3 w-3" />
                          {doneOrders.some((order) => completingId === order.id)
                            ? t("sidebar.completing") + "…"
                            : t("sidebar.customerLeft")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────

export function LiveTablePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const outletId = searchParams.get("outlet_id") ?? undefined;

  const { data: outletsData } = usePOSOutlets();
  const outletName = outletsData?.data?.find(
    (o: { id: string; name: string }) => o.id === outletId,
  )?.name;

  const t = useTranslations("posTerminal.liveTable");
  const tTerminal = useTranslations("posTerminal");
  const setFullScreen = usePOSUIStore((s) => s.setFullScreen);

  // Register as full-screen so DashboardLayout hides the outer header/breadcrumb.
  useEffect(() => {
    setFullScreen(true);
    return () => setFullScreen(false);
  }, [setFullScreen]);

  const [selectedInfo, setSelectedInfo] = useState<LiveTableInfo | null>(null);
  const [now, setNow] = useState<number>();
  const [viewMode, setViewMode] = useState<"grid" | "floor">(() => {
    if (typeof window !== "undefined") {
      return (
        (localStorage.getItem("live-table-view") as "grid" | "floor") ?? "grid"
      );
    }
    return "grid";
  });

  const handleSelectView = useCallback((mode: "grid" | "floor") => {
    setViewMode(mode);
    localStorage.setItem("live-table-view", mode);
  }, []);

  // Tick every second for live duration display.
  // Server updates are event-driven via WebSocket (no periodic refetch loop).
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);

  const { plan, liveTableInfos, layoutObjects, orders, isLoading } = useLiveTableData({
    outletId,
    now,
  });

  const serveOrder = useServeOrder({ invalidateOnSuccess: false });
  const completeOrder = useCompleteOrder({ invalidateOnSuccess: false });
  const serveOrderItem = useServeOrderItem({ invalidateOnSuccess: false });
  const [servingId, setServingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [servingItemId, setServingItemId] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<PaymentNotice | null>(
    null,
  );
  const [selectedPaymentInfo, setSelectedPaymentInfo] =
    useState<LiveTableInfo | null>(null);
  const [selectedCancelPaymentInfo, setSelectedCancelPaymentInfo] =
    useState<LiveTableInfo | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<POSOrder | null>(null);
  const [receiptCustomerName, setReceiptCustomerName] = useState<
    string | undefined
  >();
  const [receiptCustomerPhone, setReceiptCustomerPhone] = useState<
    string | undefined
  >();
  const [receiptTenderAmount, setReceiptTenderAmount] = useState<
    number | undefined
  >();

  const drafts = useMemo(() => {
    return orders.filter((order) => order.status === "DRAFT" && !order.table_id);
  }, [orders]);

  const deleteOrder = useDeleteOrder({ invalidateOnSuccess: false });
  const [applyingDraft, setApplyingDraft] = useState<POSOrder | null>(null);

  const handleDropDraftOnTable = useCallback(
    (draftId: string, tableId: string, tableLabel: string) => {
      if (outletId) {
        const query = new URLSearchParams();
        query.set("outlet_id", outletId);
        query.set("table_id", tableId);
        query.set("table_label", tableLabel);
        query.set("draft_id", draftId);
        router.push(`/pos/fb/terminal?${query.toString()}`);
      }
    },
    [outletId, router],
  );

  const handleEditOrder = useCallback(
    (info: LiveTableInfo) => {
      const tableId = info.tableObj.id;
      const tableLabel =
        info.tableObj.label ??
        `T${info.tableObj.tableNumber ?? info.tableObj.id}`;
      router.push(
        `/pos/fb/terminal?outlet_id=${outletId || ""}&table_id=${tableId}&table_label=${encodeURIComponent(tableLabel)}`,
      );
    },
    [router, outletId],
  );

  const handleEditOrderFromOrder = useCallback(
    (
      order: POSOrder,
      tableObj: { id: string; label?: string; tableNumber?: string | number },
    ) => {
      const tableId = tableObj.id;
      const tableLabel =
        tableObj.label ?? `T${tableObj.tableNumber ?? tableObj.id}`;
      router.push(
        `/pos/fb/terminal?outlet_id=${outletId || ""}&table_id=${tableId}&table_label=${encodeURIComponent(tableLabel)}`,
      );
    },
    [router, outletId],
  );

  const suppressedToastEvents = useMemo(
    () => [
      "pos.new_customer_order",
      "pos.payment_confirmed",
      "pos.order_status_changed",
      "pos.order_deleted",
    ],
    [],
  );

  const handleWsEvent = useCallback(
    (
      eventType: string,
      payload:
        | {
            table_label?: string;
            order_id?: string;
            order_number?: string;
            order?: POSOrder;
          }
        | undefined,
    ) => {
      if (eventType === "pos.payment_confirmed") {
        setPaymentNotice({
          tableLabel: payload?.table_label ?? "Meja",
          orderId: payload?.order_id,
          orderNumber: payload?.order_number,
          at: Date.now(),
        });
      }
    },
    [],
  );

  // Real-time staff notifications and payment confirmation state in Active Tables.
  usePosWs(outletId, {
    onEvent: handleWsEvent,
    suppressToastEvents: suppressedToastEvents,
  });

  const handleOpenPaymentNotice = useCallback(() => {
    if (!paymentNotice) return;
    const target = liveTableInfos.find((info) => {
      const label =
        info.tableObj.label ??
        `T${info.tableObj.tableNumber ?? info.tableObj.id}`;
      if (
        paymentNotice.orderId &&
        (info.unpaidOrder?.id === paymentNotice.orderId ||
          info.order?.id === paymentNotice.orderId)
      ) {
        return true;
      }
      return label === paymentNotice.tableLabel;
    });
    if (target) {
      if (target.status === "WAITING_PAYMENT") {
        setSelectedPaymentInfo(target);
      } else {
        setSelectedInfo(target);
      }
    }
  }, [liveTableInfos, paymentNotice]);

  const handleDismissPaymentNotice = useCallback(() => {
    setPaymentNotice(null);
  }, []);

  const handleOpenPaymentAction = useCallback((info: LiveTableInfo) => {
    if (!info.unpaidOrder && !info.order) return;

    if (info.unpaidOrder || info.status === "WAITING_PAYMENT") {
      setSelectedPaymentInfo(info);
      return;
    }

    setSelectedInfo(info);
  }, []);

  const handleOpenCancelPaymentAction = useCallback((info: LiveTableInfo) => {
    if (!info.unpaidOrder) return;
    setSelectedCancelPaymentInfo(info);
  }, []);

  const handleServe = useCallback(
    async (orderIds: string[]) => {
      if (!orderIds.length) return;

      setServingId(orderIds[0]);
      const results = await Promise.allSettled(
        orderIds.map((orderId) => serveOrder.mutateAsync(orderId)),
      );
      const failedCount = results.filter(
        (result) => result.status === "rejected",
      ).length;

      if (failedCount === 0) {
        toast.success(t("messages.tableStatusChanged"));
      } else if (failedCount < orderIds.length) {
        toast.warning(
          `${orderIds.length - failedCount}/${orderIds.length} orders served. Please retry remaining.`,
        );
      } else {
        toast.error(t("messages.updateStatusFailed"));
      }

      setServingId(null);
    },
    [serveOrder, t],
  );

  const handleComplete = useCallback(
    async (orderIds: string[]) => {
      if (!orderIds.length) return;

      setCompletingId(orderIds[0]);
      const results = await Promise.allSettled(
        orderIds.map((orderId) => completeOrder.mutateAsync(orderId)),
      );
      const failedCount = results.filter(
        (result) => result.status === "rejected",
      ).length;

      if (failedCount === 0) {
        toast.success(t("messages.customerLeft"));
      } else if (failedCount < orderIds.length) {
        toast.warning(
          `${orderIds.length - failedCount}/${orderIds.length} orders completed. Please retry remaining.`,
        );
      } else {
        toast.error(t("messages.updateStatusFailed"));
      }

      setCompletingId(null);
    },
    [completeOrder, t],
  );

  const handleServeItem = useCallback(
    async (orderId: string, itemId: string) => {
      const key = `${orderId}-${itemId}`;
      setServingItemId(key);
      try {
        await serveOrderItem.mutateAsync({ orderId, itemId });
        toast.success(t("messages.itemServed"));
      } catch {
        toast.error(t("messages.serveItemFailed"));
      } finally {
        setServingItemId(null);
      }
    },
    [serveOrderItem, t],
  );

  const handleTableClick = useCallback(
    (info: LiveTableInfo) => {
      const hasDraft = info.orders.some((o) => o.status === "DRAFT");
      if ((info.status === "AVAILABLE" || hasDraft) && outletId) {
        const tableLabel =
          info.tableObj.label ??
          `T${info.tableObj.tableNumber ?? info.tableObj.id}`;
        const query = new URLSearchParams();
        query.set("outlet_id", outletId);
        query.set("table_id", info.tableObj.id);
        query.set("table_label", tableLabel);
        router.push(`/pos/fb/terminal?${query.toString()}`);
        return;
      }

      if (info.status === "WAITING_PAYMENT") {
        setSelectedPaymentInfo(info);
        return;
      }

      setSelectedInfo(info);
    },
    [outletId, router],
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <LoadingSpinner
            className="mx-auto h-8 w-8 text-primary"
            strokeWidth={2}
          />
          <p className="text-sm text-muted-foreground">
            {t("messages.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="font-semibold text-lg">
          {t("messages.noFloorPlanTitle")}
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {t("messages.noFloorPlanDescription")}
        </p>
        <Button variant="ghost" size="sm" onClick={() => router.push("/pos/fb/terminal")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          {t("messages.goBack")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full cursor-pointer"
            onClick={() => router.push("/pos/fb/terminal")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-semibold text-sm leading-tight truncate">
              {plan.name}
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {outletName ?? "Live Table"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode segmented switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-muted/80 border border-border/60 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => handleSelectView("grid")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40",
              )}
              title={t("views.grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("views.grid")}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectView("floor")}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 cursor-pointer",
                viewMode === "floor"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/40",
              )}
              title={t("views.floor")}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("views.floor")}</span>
            </button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <span className="relative inline-block overflow-visible">
                <Button
                  variant="outline"
                  className={cn(
                    "cursor-pointer gap-2 h-8 text-xs transition-all duration-200",
                    drafts.length > 0
                      ? "border-primary/20 bg-primary/5 hover:bg-primary/10 hover:text-primary text-primary dark:border-primary/30 dark:bg-primary/10 dark:hover:bg-primary/25"
                      : "text-muted-foreground",
                  )}
                >
                  <Archive className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {tTerminal("savedTransactions.label")}
                  </span>
                </Button>
                {drafts.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white shadow-sm pointer-events-none z-10">
                    {drafts.length}
                  </span>
                )}
              </span>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-0 animate-in fade-in zoom-in-95 duration-150 shadow-lg border rounded-lg"
              align="end"
            >
              <div className="p-3 border-b bg-muted/40 rounded-t-lg">
                <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                  {tTerminal("savedTransactions.title")}
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {tTerminal("savedTransactions.dragHint")}
                </p>
              </div>
              <ScrollArea className="max-h-80">
                {drafts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    {tTerminal("savedTransactions.empty")}
                  </div>
                ) : (
                  <div className="divide-y">
                    {drafts.map((draft) => (
                      <div
                        key={draft.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", draft.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        className="p-3 hover:bg-muted/30 cursor-grab active:cursor-grabbing transition-colors flex flex-col gap-1 w-full text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            #{draft.order_number}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[120px]">
                            {draft.customer_name ||
                              tTerminal("savedTransactions.walkIn")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-bold text-primary">
                            Rp {draft.total_amount.toLocaleString("id-ID")}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {tTerminal("savedTransactions.itemsCount", {
                              count: draft.items.length,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2.5 gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-[10px] flex-1 cursor-pointer font-medium hover:bg-secondary/80"
                            onClick={() => setApplyingDraft(draft)}
                          >
                            {tTerminal("savedTransactions.applyTable")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer shrink-0"
                            onClick={async () => {
                              try {
                                await deleteOrder.mutateAsync(draft.id);
                                toast.success(
                                  tTerminal("savedTransactions.deleteSuccess"),
                                );
                              } catch {
                                toast.error(
                                  tTerminal("savedTransactions.deleteFailed"),
                                );
                              }
                            }}
                            disabled={deleteOrder.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* ── Status legend ── */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/20 shrink-0 overflow-x-auto">
        {(
          Object.entries(STATUS_CONFIG) as [
            LiveTableStatus,
            (typeof STATUS_CONFIG)[LiveTableStatus],
          ][]
        ).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 shrink-0">
            <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
            <span className="text-[11px] text-muted-foreground">
              {getStatusLabel(key as LiveTableStatus, t)}
            </span>
          </div>
        ))}
      </div>

      {/* ── Main content: table view + sidebar ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table grid / floor layout */}
        <ScrollArea className="flex-1">
          {liveTableInfos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <p className="text-sm">No tables in this floor plan.</p>
            </div>
          ) : viewMode === "grid" ? (
            <TableGrid
              infos={liveTableInfos}
              onTableClick={handleTableClick}
              onDropDraft={handleDropDraftOnTable}
            />
          ) : (
            <LiveFloorView
              planWidth={plan.width ?? 1200}
              planHeight={plan.height ?? 800}
              layoutObjects={layoutObjects}
              infos={liveTableInfos}
              onTableClick={handleTableClick}
              onDropDraft={handleDropDraftOnTable}
            />
          )}
        </ScrollArea>

        {/* Right sidebar: active table management */}
        <TableSidebar
          infos={liveTableInfos}
          onServe={handleServe}
          onComplete={handleComplete}
          onServeItem={handleServeItem}
          onOpenPaymentAction={handleOpenPaymentAction}
          onOpenCancelPaymentAction={handleOpenCancelPaymentAction}
          paymentNotice={paymentNotice}
          onOpenPaymentNotice={handleOpenPaymentNotice}
          onDismissPaymentNotice={handleDismissPaymentNotice}
          onEditOrder={handleEditOrder}
          servingId={servingId}
          completingId={completingId}
          servingItemId={servingItemId}
        />
      </div>

      <OrderDetailDialog
        info={selectedInfo}
        onClose={() => setSelectedInfo(null)}
        onOpenReceipt={({
          order,
          customerName,
          customerPhone,
          tenderAmount,
        }) => {
          setReceiptOrder(order);
          setReceiptCustomerName(
            customerName ?? order.customer_name ?? undefined,
          );
          setReceiptCustomerPhone(customerPhone);
          setReceiptTenderAmount(tenderAmount);
        }}
        onEditOrder={(order) => {
          if (selectedInfo) {
            handleEditOrderFromOrder(order, selectedInfo.tableObj);
            setSelectedInfo(null);
          }
        }}
      />
      <ActiveTablePaymentDialog
        info={selectedPaymentInfo}
        onClose={() => setSelectedPaymentInfo(null)}
        onSuccess={({ order, customerName, customerPhone, tenderAmount }) => {
          setSelectedPaymentInfo(null);
          setReceiptOrder(order);
          setReceiptCustomerName(
            customerName ?? order.customer_name ?? undefined,
          );
          setReceiptCustomerPhone(customerPhone);
          setReceiptTenderAmount(tenderAmount);
          toast.success(t("messages.paymentConfirmed"), {
            id: "live-table-payment-confirmed",
          });
        }}
      />
      <ActiveTableCancelDialog
        info={selectedCancelPaymentInfo}
        onClose={() => setSelectedCancelPaymentInfo(null)}
      />

      <Dialog
        open={!!applyingDraft}
        onOpenChange={(open) => !open && setApplyingDraft(null)}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              {tTerminal("savedTransactions.applyTable")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {tTerminal("savedTransactions.applyTableSelect", {
                orderNumber: applyingDraft?.order_number ?? "",
              })}
            </p>
            <ScrollArea className="max-h-60 pr-2">
              <div className="space-y-1">
                {liveTableInfos
                  .filter((info) => info.status === "AVAILABLE")
                  .map((info) => {
                    const label =
                      info.tableObj.label ??
                      `T${info.tableObj.tableNumber ?? info.tableObj.id}`;
                    return (
                      <Button
                        key={info.tableObj.id}
                        variant="outline"
                        className="w-full justify-start cursor-pointer h-9 text-xs"
                        onClick={() => {
                          if (applyingDraft) {
                            handleDropDraftOnTable(
                              applyingDraft.id,
                              info.tableObj.id,
                              label,
                            );
                            setApplyingDraft(null);
                          }
                        }}
                      >
                        Table {label} ({info.seatCount} seats)
                      </Button>
                    );
                  })}
                {liveTableInfos.filter((info) => info.status === "AVAILABLE")
                  .length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">
                    No empty tables available.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {receiptOrder && (
        <POSReceiptDialog
          open={!!receiptOrder}
          onClose={() => {
            setReceiptOrder(null);
            setReceiptCustomerName(undefined);
            setReceiptCustomerPhone(undefined);
            setReceiptTenderAmount(undefined);
          }}
          order={receiptOrder}
          customerName={receiptCustomerName}
          customerPhone={receiptCustomerPhone}
          outletName={outletName}
          tenderAmount={receiptTenderAmount}
        />
      )}
    </div>
  );
}
