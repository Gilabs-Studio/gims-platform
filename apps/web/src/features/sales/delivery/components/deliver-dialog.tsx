import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ui/image-upload";

interface DeliverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { signatureUrl: string; receiverName: string }) => Promise<void>;
  isLoading: boolean;
  initialReceiverName?: string;
}

export function DeliverDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  initialReceiverName = "",
}: DeliverDialogProps) {
  const t = useTranslations("delivery");
  const [signatureUrl, setSignatureUrl] = useState("");
  const [receiverName, setReceiverName] = useState(initialReceiverName);

  // Update state when initialReceiverName changes or dialog opens
  if (open && receiverName === "" && initialReceiverName !== "" && receiverName !== initialReceiverName) {
     setReceiverName(initialReceiverName);
  }

  useEffect(() => {
    if (open) {
      setSignatureUrl("");
      setReceiverName(initialReceiverName || "");
    }
  }, [open, initialReceiverName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signatureUrl || !receiverName) return;
    
    await onConfirm({
      signatureUrl,
      receiverName,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("actions.deliver")}</DialogTitle>
          <DialogDescription>
            {t("dialogs.uploadProofDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="receiver_name">{t("receiverName")}</Label>
              <Input
                id="receiver_name"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder={t("placeholders.receiverName")}
                disabled={isLoading}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>{t("receiverSignature")}</Label>
              <ImageUpload
                value={signatureUrl}
                onChange={setSignatureUrl}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !signatureUrl || !receiverName}
              className="cursor-pointer"
            >
              {isLoading ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 animate-bounce" />
                  {t("common.saving")}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t("actions.deliver")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
