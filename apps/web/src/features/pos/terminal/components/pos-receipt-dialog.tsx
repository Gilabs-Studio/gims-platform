"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, Printer, Settings2, X } from "lucide-react";
import { useHasPermission } from "@/features/master-data/user-management/hooks/use-has-permission";
import { posOrderService } from "../services/pos-service";
import type { POSOrder } from "../types";
import { POSWhatsAppTemplateDialog } from "./pos-whatsapp-template-dialog";
import { usePOSReceiptWhatsAppTemplate } from "../hooks/use-pos-receipt-whatsapp-template";
import { usePOSConfig, useUpdatePOSReceiptWhatsAppTemplate } from "../hooks/use-pos";

interface POSReceiptDialogProps {
  open: boolean;
  onClose: () => void;
  order: POSOrder;
  customerName?: string;
  customerPhone?: string;
  outletName?: string;
  /** Tender amount entered by cashier (cash payments) */
  tenderAmount?: number;
}

export function POSReceiptDialog({
  open,
  onClose,
  order,
  customerName,
  customerPhone,
  outletName,
  tenderAmount,
}: POSReceiptDialogProps) {
  const t = useTranslations("posTerminal.receipt");
  const canManageTemplate = useHasPermission("pos.order.read");
  const showWhatsAppAction = Boolean(customerPhone?.trim());
  const receiptUrl = useMemo(() => posOrderService.getReceiptUrl(order.id), [
    order.id,
  ]);

  const [receiptHtml, setReceiptHtml] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isTemplateSettingsOpen, setIsTemplateSettingsOpen] = useState(false);
  const { data: configResponse } = usePOSConfig(order.outlet_id, { enabled: open });
  const updateTemplateMutation = useUpdatePOSReceiptWhatsAppTemplate(order.outlet_id);
  const configuredTemplate = configResponse?.data?.receipt_whatsapp_template ?? null;
  const actionLayoutClass =
    canManageTemplate && showWhatsAppAction
      ? "grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-2"
      : canManageTemplate && !showWhatsAppAction
        ? "grid grid-cols-[minmax(0,1fr)_2.5rem] gap-2"
        : !canManageTemplate && showWhatsAppAction
          ? "grid grid-cols-2 gap-2"
          : "grid grid-cols-1 gap-2";

  const {
    template,
    whatsappUrl,
    templateValues,
  } = usePOSReceiptWhatsAppTemplate({
    order,
    template: configuredTemplate,
    customerName,
    customerPhone,
    outletName,
    tenderAmount,
  });

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadReceiptHtml() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const res = await fetch(receiptUrl, {
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "text/html",
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to load receipt (${res.status})`);
        }

        const html = await res.text();
        if (!cancelled) {
          setReceiptHtml(html);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t("loadError"));
          setReceiptHtml("");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadReceiptHtml();

    return () => {
      cancelled = true;
    };
  }, [open, receiptUrl, t]);

  function handlePrint() {
    if (!receiptHtml) return;

    const printWindow = window.open("", "_blank", "width=420,height=760");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function handleSendWhatsApp() {
    if (!whatsappUrl) return;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <div className="flex items-start justify-between gap-4">
          <DialogHeader className="text-left flex-1">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              {t("title")}
            </DialogTitle>
          </DialogHeader>

          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>

        <div className="rounded-md border bg-card overflow-hidden">
          {isLoading && (
            <div className="h-[60vh] flex items-center justify-center text-sm text-muted-foreground">
              {t("loading")}
            </div>
          )}
          {!isLoading && loadError && (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-3 p-4 text-center text-sm">
              <p className="text-destructive">{loadError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => window.open(receiptUrl, "_blank", "width=420,height=760")}
              >
                {t("openInNewTab")}
              </Button>
            </div>
          )}
          {!isLoading && !loadError && !!receiptHtml && (
            <iframe
              srcDoc={receiptHtml}
              title={`${t("title")} ${order.order_number}`}
              className="w-full h-[60vh] bg-white"
            />
          )}
        </div>

        {/* Actions */}
        <div className={actionLayoutClass}>
          <Button
            className="cursor-pointer"
            onClick={handlePrint}
            disabled={!receiptHtml || !!loadError}
          >
            <Printer className="h-4 w-4 mr-2" />
            {t("print")}
          </Button>
          {showWhatsAppAction && (
            <Button
              variant="secondary"
              className="cursor-pointer"
              onClick={handleSendWhatsApp}
              disabled={!whatsappUrl}
              title={!whatsappUrl ? t("sendDisabled") : undefined}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {t("sendWhatsApp")}
            </Button>
          )}
          {canManageTemplate && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 cursor-pointer justify-self-end"
              onClick={() => setIsTemplateSettingsOpen(true)}
              title={t("settings")}
              aria-label={t("settings")}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <POSWhatsAppTemplateDialog
          key={`${isTemplateSettingsOpen}-${template}`}
          open={isTemplateSettingsOpen}
          onOpenChange={setIsTemplateSettingsOpen}
          template={template}
          previewValues={templateValues}
          onSave={(nextTemplate) => {
            updateTemplateMutation.mutate({
              receipt_whatsapp_template: nextTemplate,
            });
          }}
          onReset={() => {
            updateTemplateMutation.mutate({
              receipt_whatsapp_template: "",
            });
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
