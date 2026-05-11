"use client";

import { useMemo } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const scheduledPurgeAt = useMemo(() => {
    const date = new Date(Date.now() + GRACE_PERIOD_DAYS * MILLISECONDS_PER_DAY);
    return formatDateTime(date);
  }, []);

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
        <Dialog>
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
            <div className="space-y-3">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">{t("scheduledPurgeLabel")}</p>
                <p className="text-sm text-muted-foreground">{scheduledPurgeAt}</p>
              </div>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>{t("pointGrace")}</li>
                <li>{t("pointLocked")}</li>
                <li>{t("pointPermanent")}</li>
              </ul>
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
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate();
                }}
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
