"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { MapPinOff, RefreshCw, Globe, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLocationPermission } from "../hooks/use-location-permission";

interface LocationSettingsDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

type BrowserType = "chrome" | "firefox" | "safari" | "edge" | "other";

function detectBrowser(): BrowserType {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  // Order matters: Edge includes Chrome in UA, so check Edge first
  if (ua.includes("Edg/") || ua.includes("Edge/")) return "edge";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "chrome";
  if (ua.includes("Firefox/")) return "firefox";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "safari";
  return "other";
}

export function LocationSettingsDialog({
  open,
  onOpenChange,
}: LocationSettingsDialogProps) {
  const t = useTranslations("hrd.attendance");
  const { requestPermission, permissionState } = useLocationPermission();
  const browser = useMemo(() => detectBrowser(), []);

  const handleRetryPermission = useCallback(() => {
    requestPermission();
    // Give the browser a moment to process the permission change
    setTimeout(() => {
      if (permissionState === "granted") {
        onOpenChange(false);
      }
    }, 1500);
  }, [requestPermission, permissionState, onOpenChange]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const stepsKey = `location.settingsDialog.steps_${browser}` as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinOff className="h-5 w-5 text-destructive" />
            {t("location.settingsDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("location.settingsDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Browser-specific instructions */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Globe className="h-4 w-4 text-muted-foreground" />
              {t("location.settingsDialog.stepsTitle", { browser: browser.charAt(0).toUpperCase() + browser.slice(1) })}
            </div>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>{t(`${stepsKey}.1` as Parameters<typeof t>[0])}</li>
              <li>{t(`${stepsKey}.2` as Parameters<typeof t>[0])}</li>
              <li>{t(`${stepsKey}.3` as Parameters<typeof t>[0])}</li>
            </ol>
          </div>

          {/* Visual hint for the address bar icon */}
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-warning/5 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-warning/10 shrink-0">
              <ExternalLink className="h-4 w-4 text-warning dark:text-warning" />
            </div>
            <p className="text-xs text-warning dark:text-warning">
              {t("location.settingsDialog.addressBarHint")}
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <div className="flex w-full gap-2">
            <Button
              variant="outline"
              className="flex-1 cursor-pointer"
              onClick={handleRetryPermission}
            >
              <MapPinOff className="h-4 w-4 mr-2" />
              {t("location.settingsDialog.retryPermission")}
            </Button>
            <Button
              className="flex-1 cursor-pointer"
              onClick={handleReload}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("location.settingsDialog.reloadPage")}
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full cursor-pointer text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            {t("lateDialog.cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
