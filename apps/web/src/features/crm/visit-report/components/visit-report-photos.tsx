"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { toast } from "sonner";
import { Camera, X, Upload, Loader2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveImageUrl } from "@/lib/utils";
import { useUploadVisitPhotos, useUploadVisitImage } from "../hooks/use-visit-reports";

interface VisitReportPhotosProps {
  readonly visitId: string;
  readonly photos: string | string[] | null | undefined;
  readonly isEditable: boolean;
}

const MAX_PHOTOS = 5;

export function VisitReportPhotos({ visitId, photos, isEditable }: VisitReportPhotosProps) {
  const t = useTranslations("crmVisitReport");
  const tCommon = useTranslations("common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadMutation = useUploadVisitPhotos();
  const uploadImageMutation = useUploadVisitImage();

  const parsedPhotos: string[] = (() => {
    if (!photos) return [];
    if (Array.isArray(photos)) return photos;
    try {
      const parsed: unknown = JSON.parse(photos as string);
      return Array.isArray(parsed) ? parsed as string[] : [];
    } catch {
      return [];
    }
  })();

  const remainingSlots = MAX_PHOTOS - parsedPhotos.length;

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (filesToUpload.length === 0) {
      toast.error(t("photos.maxReached"));
      return;
    }

    setUploading(true);
    try {
      // Upload each file to the image upload endpoint first
      const uploadedUrls: string[] = [];
      for (const file of filesToUpload) {
        const result = await uploadImageMutation.mutateAsync(file);
        if (result?.data?.url) {
          uploadedUrls.push(result.data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        // Then associate URLs with the visit report
        await uploadMutation.mutateAsync({ id: visitId, photoUrls: uploadedUrls });
        toast.success(t("photos.uploaded"));
      }
    } catch {
      toast.error(tCommon("error"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [visitId, remainingSlots, uploadMutation, uploadImageMutation, t, tCommon]);

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase">
          {t("sections.photos")}
        </h3>
        {isEditable && remainingSlots > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {t("photos.upload")}
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {parsedPhotos.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {parsedPhotos.map((url, idx) => {
            const resolvedSrc = resolveImageUrl(url) ?? url;
            return (
            <div
              key={`photo-${idx}`}
              className="relative aspect-video rounded-lg overflow-hidden border bg-muted cursor-pointer group"
              onClick={() => setPreviewUrl(resolvedSrc)}
            >
              <Image
                src={resolvedSrc}
                alt={`${t("sections.photos")} ${idx + 1}`}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover transition-transform group-hover:scale-105"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
            );
          })}

          {/* Upload placeholder slots */}
          {isEditable && remainingSlots > 0 && (
            <button
              type="button"
              className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-6 w-6" />
              <span className="text-xs">{remainingSlots} {t("photos.remaining")}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <ImageIcon className="h-10 w-10 mb-2" />
          <p className="text-sm">{t("photos.empty")}</p>
          {isEditable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-4 w-4 mr-2" />
              {t("photos.upload")}
            </Button>
          )}
        </div>
      )}

      {/* Full-size preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setPreviewUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewUrl(null);
            }}
          >
            <X className="h-6 w-6" />
          </Button>
          <Image
            src={resolveImageUrl(previewUrl) ?? previewUrl}
            alt={t("sections.photos")}
            width={1600}
            height={1200}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            unoptimized
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
