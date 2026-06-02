"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Hash, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  POS_RECEIPT_WHATSAPP_TEMPLATE_TAGS,
  type ReceiptWhatsAppTemplateValues,
  renderReceiptWhatsAppTemplate,
} from "../hooks/use-pos-receipt-whatsapp-template";

interface POSWhatsAppTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: string;
  previewValues: ReceiptWhatsAppTemplateValues;
  onSave: (template: string) => void;
  onReset: () => void;
}

export function POSWhatsAppTemplateDialog({
  open,
  onOpenChange,
  template,
  previewValues,
  onSave,
  onReset,
}: POSWhatsAppTemplateDialogProps) {
  const t = useTranslations("posTerminal.whatsappTemplate");
  const [draft, setDraft] = useState(template);

  const previewMessage = useMemo(
    () => renderReceiptWhatsAppTemplate(draft.trim(), previewValues),
    [draft, previewValues],
  );

  const insertTag = (tag: string) => {
    setDraft((previous) => {
      const token = `#${tag}`;
      const nextValue = previous.trimEnd();
      return nextValue.length > 0 ? `${nextValue} ${token}` : token;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="gap-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-4 w-4" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t("templateLabel")}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 cursor-pointer text-muted-foreground"
                onClick={() => setDraft(template)}
              >
                <RotateCcw className="h-4 w-4 mr-1.5" />
                {t("restoreDefault")}
              </Button>
            </div>
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-[180px] font-mono text-sm"
              placeholder={t("templatePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("templateHelp")}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">{t("availableTags")}</p>
            <div className="flex flex-wrap gap-2">
              {POS_RECEIPT_WHATSAPP_TEMPLATE_TAGS.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-full px-3 text-xs cursor-pointer"
                  onClick={() => insertTag(tag)}
                  title={t(`tags.${tag}` as Parameters<typeof t>[0])}
                >
                  #{tag}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("previewLabel")}</p>
            <ScrollArea className="h-36 rounded-md border bg-muted/30 p-3">
              <pre className="whitespace-pre-wrap wrap-break-word text-sm text-muted-foreground font-sans">{previewMessage}</pre>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => {
              setDraft(template);
              onOpenChange(false);
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => {
              onReset();
              setDraft(template);
            }}
          >
            {t("reset")}
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}