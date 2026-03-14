"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { LocationSettingsDialog } from "./location-settings-dialog";
import { useTranslations } from "next-intl";
import { Camera, RefreshCw, Loader2, MapPinOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { attendanceRecordService } from "../services/attendance-record-service";
import { useLocationPermission } from "../hooks/use-location-permission";

interface ClockInCameraDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly checkInType: string;
  readonly isPending: boolean;
  readonly onConfirm: (photoUrl: string) => void;
}

type CameraState = "initializing" | "ready" | "captured" | "uploading" | "error";

export function ClockInCameraDialog({
  open,
  onOpenChange,
  checkInType,
  isPending,
  onConfirm,
}: ClockInCameraDialogProps) {
  const t = useTranslations("hrd.attendance");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { isDenied: isLocationDenied, requestPermissionOrFallback } = useLocationPermission();

  const [cameraState, setCameraState] = useState<CameraState>("initializing");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLocationSettings, setShowLocationSettings] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setCameraState("initializing");
    setErrorMessage("");
    setCapturedImage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("ready");
    } catch (err) {
      const error = err as Error;
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setErrorMessage(t("cameraDialog.permissionDenied"));
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setErrorMessage(t("cameraDialog.notAvailable"));
      } else {
        setErrorMessage(t("cameraDialog.notAvailable"));
      }
      setCameraState("error");
    }
  }, [t]);

  // Start camera when dialog opens
  useEffect(() => {
    if (!open) return;
    // Small delay so DOM is ready
    const timer = setTimeout(() => {
      startCamera();
    }, 100);
    return () => clearTimeout(timer);
  }, [open, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror the image (selfie camera)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    setCameraState("captured");
    stopCamera();
  }, [stopCamera]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const handleConfirm = useCallback(async () => {
    if (!capturedImage) return;

    setCameraState("uploading");

    try {
      // Convert data URL to File
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const file = new File([blob], `attendance-${checkInType.toLowerCase()}-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      // Upload via existing upload endpoint
      const uploadResult = await attendanceRecordService.uploadImage(file);
      if (uploadResult.success && uploadResult.data?.url) {
        onConfirm(uploadResult.data.url);
      } else {
        setErrorMessage(t("cameraDialog.uploadFailed"));
        setCameraState("captured");
      }
    } catch {
      setErrorMessage(t("cameraDialog.uploadFailed"));
      setCameraState("captured");
    }
  }, [capturedImage, checkInType, onConfirm, t]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      stopCamera();
      setCameraState("initializing");
      setCapturedImage(null);
      setErrorMessage("");
    }
    onOpenChange(nextOpen);
  }, [stopCamera, onOpenChange]);

  const isProcessing = cameraState === "uploading" || isPending;

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("cameraDialog.title")}</DialogTitle>
          <DialogDescription>
            {t(`cameraDialog.description_${checkInType}`)}
          </DialogDescription>
        </DialogHeader>

        {/* Location permission re-request banner */}
        {isLocationDenied && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-2.5 text-xs text-destructive">
            <MapPinOff className="h-4 w-4 shrink-0" />
            <p className="flex-1">{t("location.permissionDenied")}</p>
            <button
              type="button"
              className="shrink-0 rounded px-2 py-1 text-[10px] font-medium bg-destructive/10 hover:bg-destructive/20 cursor-pointer"
              onClick={() => requestPermissionOrFallback(() => setShowLocationSettings(true))}
            >
              {t("location.openSettings")}
            </button>
          </div>
        )}

        <div className="relative w-full aspect-4/3 bg-muted rounded-lg overflow-hidden">
          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {cameraState === "initializing" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {cameraState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
              <Camera className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("cameraDialog.retry")}
              </Button>
            </div>
          )}

          {(cameraState === "ready" || cameraState === "initializing") && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          )}

          {(cameraState === "captured" || cameraState === "uploading") && capturedImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {cameraState === "ready" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="cursor-pointer"
              >
                {t("lateDialog.cancel")}
              </Button>
              <Button onClick={handleCapture} className="cursor-pointer">
                <Camera className="h-4 w-4 mr-2" />
                {t("cameraDialog.capture")}
              </Button>
            </>
          )}

          {(cameraState === "captured" || cameraState === "uploading") && (
            <>
              <Button
                variant="outline"
                onClick={handleRetake}
                disabled={isProcessing}
                className="cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("cameraDialog.retake")}
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isProcessing}
                className="cursor-pointer"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {cameraState === "uploading"
                  ? t("cameraDialog.uploading")
                  : t("cameraDialog.confirm")}
              </Button>
            </>
          )}

          {cameraState === "error" && (
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="cursor-pointer"
            >
              {t("lateDialog.cancel")}
            </Button>
          )}

          {cameraState === "initializing" && (
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="cursor-pointer"
            >
              {t("lateDialog.cancel")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <LocationSettingsDialog
      open={showLocationSettings}
      onOpenChange={setShowLocationSettings}
    />
    </>);
}
