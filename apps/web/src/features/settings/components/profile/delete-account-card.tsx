"use client";

import { useMemo, useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRequestAccountDeletion } from "../../hooks/use-profile";

const GRACE_PERIOD_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function DeleteAccountCard() {
  const t = useTranslations("profile.deleteAccount");
  const deleteMutation = useRequestAccountDeletion();
  const [password, setPassword] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const scheduledPurgeAt = useMemo(() => {
    // Using constructor ensures pure calculation without Date.now() at render time
    const now = new Date();
    const purgeDate = new Date(now.getTime() + GRACE_PERIOD_DAYS * MILLISECONDS_PER_DAY);
    return formatDateTime(purgeDate);
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setPassword("");
    }
  };

  const handleConfirm = () => {
    deleteMutation.mutate(password, {
      onSuccess: () => {
        setIsOpen(false);
        setPassword("");
      },
    });
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <TriangleAlert className="h-4 w-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("warning")}</p>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="cursor-pointer">
              {t("action")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("confirmTitle")}</DialogTitle>
              <DialogDescription>{t("confirmDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">{t("scheduledPurgeLabel")}</p>
                <p className="text-sm text-muted-foreground">{scheduledPurgeAt}</p>
              </div>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>{t("pointGrace")}</li>
                <li>{t("pointLocked")}</li>
                <li>{t("pointPermanent")}</li>
              </ul>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="delete-account-password">
                  Konfirmasi Kata Sandi
                </label>
                <Input
                  id="delete-account-password"
                  type="password"
                  placeholder="Masukkan kata sandi Anda untuk memverifikasi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="cursor-pointer" disabled={deleteMutation.isPending}>
                  {t("cancel")}
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                className="cursor-pointer"
                disabled={deleteMutation.isPending || !password.trim()}
                onClick={handleConfirm}
              >
                {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("confirmAction")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
