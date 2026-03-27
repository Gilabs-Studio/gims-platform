"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Upload, Trash2, FileImage, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useEmployeeSignature,
  useUploadEmployeeSignature,
  useDeleteEmployeeSignature,
} from "../../hooks/use-employees";
import { DeleteSignatureModal } from "./delete-signature-modal";
import type { EmployeeSignature } from "../../types";

interface EmployeeSignatureSectionProps {
  employeeId: string;
  employeeName?: string;
}

// Get the API base URL from environment or default
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export function EmployeeSignatureSection({
  employeeId,
  employeeName,
}: EmployeeSignatureSectionProps) {
  const t = useTranslations("employee");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: signature, isLoading } = useEmployeeSignature(employeeId);
  const uploadMutation = useUploadEmployeeSignature();
  const deleteMutation = useDeleteEmployeeSignature();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
        alert(t("signature.invalidFileType"));
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert(t("signature.fileTooLarge"));
        return;
      }
      handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      await uploadMutation.mutateAsync({ employeeId, file });
      setImageError(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Failed to upload signature:", error);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(employeeId);
      setImageError(false);
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Failed to delete signature:", error);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownload = async () => {
    if (!signature) return;

    setIsDownloading(true);
    try {
      const imageUrl = getImageUrl(signature);

      // Try fetch with CORS first
      const response = await fetch(imageUrl, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch image: ${response.status} ${response.statusText}`,
        );
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // Create temporary anchor element for download
      const link = document.createElement("a");
      link.href = blobUrl;
      // Use original filename from backend (e.g., "John Doe signature.jpg")
      const originalFilename = signature.file_name || "signature.jpg";
      link.download = originalFilename;

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL after a short delay
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);

      toast.success(t("signature.downloadSuccess"));
    } catch (error) {
      console.error("Failed to download signature with fetch:", error);

      // Fallback: Try direct download without CORS (opens in new tab if blocked)
      try {
        const imageUrl = getImageUrl(signature);
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = signature.file_name || "signature.jpg";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // If we reach here, the download might have worked or opened in new tab
        toast.success(t("signature.downloadSuccess"));
      } catch (fallbackError) {
        console.error("Fallback download also failed:", fallbackError);
        toast.error(t("signature.downloadError"));
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const getImageUrl = (sig: EmployeeSignature): string => {
    if (imageError) {
      return "";
    }
    // If file_url is already a full URL, use it
    if (
      sig.file_url &&
      (sig.file_url.startsWith("http://") ||
        sig.file_url.startsWith("https://"))
    ) {
      return sig.file_url;
    }
    // If file_path is a full URL, use it
    if (
      sig.file_path &&
      (sig.file_path.startsWith("http://") ||
        sig.file_path.startsWith("https://"))
    ) {
      return sig.file_path;
    }
    // Otherwise, prepend API base URL
    const path = sig.file_url || sig.file_path;
    if (path.startsWith("/")) {
      return `${API_BASE_URL}${path}`;
    }
    return `${API_BASE_URL}/${path}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("signature.title")}</CardTitle>
          <CardDescription>{t("signature.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png,image/jpeg,image/jpg"
            className="hidden"
          />

          {signature ? (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/50 flex justify-center items-center min-h-[150px]">
                {!imageError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getImageUrl(signature)}
                    alt={t("signature.altText")}
                    className="max-h-32 object-contain"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="text-center">
                    <FileImage className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {t("signature.previewNotAvailable")}
                    </p>
                  </div>
                )}
              </div>

              {imageError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t("signature.imageLoadError")}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  <p>
                    {t("signature.fileName")}: {signature.file_name}
                  </p>
                  <p>
                    {t("signature.fileSize")}:{" "}
                    {(signature.file_size / 1024).toFixed(2)} KB
                  </p>
                  <p>
                    {t("signature.uploadedAt")}:{" "}
                    {new Date(signature.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleButtonClick}
                  disabled={uploadMutation.isPending}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadMutation.isPending
                    ? t("signature.uploading")
                    : t("signature.replace")}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isDownloading
                    ? t("signature.downloading")
                    : t("signature.download")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteClick}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleteMutation.isPending
                    ? t("signature.deleting")
                    : t("signature.delete")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <FileImage className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t("signature.noSignature")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("signature.supportedFormats")}
                </p>
              </div>
              <Button
                onClick={handleButtonClick}
                disabled={uploadMutation.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadMutation.isPending
                  ? t("signature.uploading")
                  : t("signature.upload")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteSignatureModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
        employeeName={employeeName}
      />
    </>
  );
}
