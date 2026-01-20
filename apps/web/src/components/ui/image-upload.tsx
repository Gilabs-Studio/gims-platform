"use client";

import * as React from "react";
import Image from "next/image";
import { Upload, X, Loader2, ImagePlus } from "lucide-react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  disabled?: boolean;
  className?: string;
  helperText?: string;
  labels?: {
    dragActive?: string;
    dragInactive?: string;
    uploadSuccess?: string;
    uploadFailed?: string;
    invalidFile?: string;
    removeImage?: string;
  };
}

interface UploadResponse {
  success: boolean;
  data: {
    url: string;
    filename: string;
    // other fields ignored
  };
}

export function ImageUpload({
  value,
  onChange,
  disabled,
  className,
  helperText = "SVG, PNG, JPG or GIF (max. 10MB)",
  labels = {
    dragActive: "Drop image here",
    dragInactive: "Click or drag image",
    uploadSuccess: "Image uploaded successfully",
    uploadFailed: "Upload failed",
    invalidFile: "Invalid file",
    removeImage: "Remove image",
  },
}: ImageUploadProps) {
  const [loading, setLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(value ?? null);

  // Sync internal preview with external value
  React.useEffect(() => {
    setPreview(value ?? null);
  }, [value]);

  const onDrop = React.useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        const error = fileRejections[0].errors[0];
        toast.error(labels.invalidFile ?? "Invalid file", {
          description: error.message,
        });
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      // Create preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await apiClient.post<UploadResponse>("/upload/image", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        if (res.data.success && res.data.data.url) {
          // Construct full URL if returned URL is relative
          // Assuming backend returns relative path like "/uploads/..." 
          // or fully qualified. If relative, prepend API_URL or serve statically.
          // The standard says "url": "/uploads/uuid.webp", so it's likely relative to domain root or static server.
          // For now, assume the URL is directly usable (or proxied).
          // But usually we need to prepend BE base URL if served by BE, or CDN.
          // Let's assume the URL is absolute or root-relative which works with <img src>.
          onChange(res.data.data.url);
          toast.success(labels.uploadSuccess ?? "Image uploaded successfully");
        } else {
          throw new Error(labels.uploadFailed ?? "Upload failed");
        }
      } catch (err) {
        setPreview(value ?? null); // Revert
        toast.error(labels.uploadFailed ?? "Upload failed", {
          description: "Something went wrong while uploading the image.",
        });
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [onChange, value]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [],
      "image/jpeg": [],
      "image/jpg": [],
      "image/gif": [],
      "image/webp": [],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
    disabled: disabled || loading,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setPreview(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition-colors bg-muted/5 xs:bg-background hover:bg-muted/10",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled && "opacity-50 cursor-not-allowed hover:bg-background",
          preview ? "p-0 aspect-square w-32 md:w-40 border-0 overflow-hidden" : "p-6 py-8"
        )}
      >
        <input {...getInputProps()} />

        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {preview ? (
          <div className="relative w-full h-full group">
            <div className="relative w-full h-full">
               {/* Use regular img tag for external URLs if Next/Image difficult to configure domain patterns immediately,
                   or if we are sure about domain configuration.
                   Using standard <img /> is often safer if we don't know the exact domain or if it varies (S3 etc).
                   The User asked for standard implementation. Next/Image is improved but standard requires domain config.
                   I will use standard <img /> or <Image /> with `unoptimized` if path is unknown.
                   Let's use <img /> with object-cover for simplicity and reliability with diverse backend URLs.
               */}
              <img
                src={preview}
                alt="Product preview"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            {!disabled && !loading && (
              <div
                className="absolute top-1 right-1 p-1 bg-destructive/90 text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-destructive"
                onClick={handleRemove}
                title={labels.removeImage ?? "Remove image"}
              >
                <X className="w-3 h-3" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center space-y-2">
            <div className="p-3 bg-muted rounded-full">
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {isDragActive ? (labels.dragActive ?? "Drop image here") : (labels.dragInactive ?? "Click or drag image")}
              </p>
              {helperText && (
                <p className="text-xs text-muted-foreground/70">{helperText}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
