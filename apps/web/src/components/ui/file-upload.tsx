"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Read CSRF token from cookie (same as api-client). Required for POST to API when CSRF is enabled. */
function getCSRFToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)gims_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

interface FileUploadProps {
  readonly value?: string;
  readonly onChange: (url: string | undefined) => void;
  readonly onClear?: () => void;
  readonly accept?: string;
  readonly maxSize?: number; // in MB
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly uploadEndpoint?: "/upload/image" | "/upload/document";
}

export function FileUpload({
  value,
  onChange,
  onClear,
  accept = ".pdf,.doc,.docx,.xls,.xlsx",
  maxSize = 10,
  disabled = false,
  placeholder = "Click to upload file",
  uploadEndpoint = "/upload/document",
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const removeHandledRef = useRef(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    setError(undefined);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8087";
      const uploadUrl = `${baseUrl}/api/v1${uploadEndpoint}`;
      const csrfToken = getCSRFToken();
      const headers: HeadersInit = {};
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers,
      });

      const result = await response.json();

      if (!response.ok) {
        const message =
          (result as { error?: { message?: string } })?.error?.message ?? "Upload failed";
        throw new Error(message);
      }

      if (result.success && result.data?.url) {
        onChange(result.data.url);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload file");
      onChange(undefined);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (removeHandledRef.current) return;
    removeHandledRef.current = true;
    onChange(undefined);
    onClear?.();
    setError(undefined);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemovePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) handleRemove(e);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    if (!removeHandledRef.current && !disabled) handleRemove(e);
    removeHandledRef.current = false;
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {value && value.trim() !== "" ? (
        <div
          className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <File className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm flex-1 truncate">{value.split("/").pop()}</span>
          <button
            type="button"
            onClick={handleRemoveClick}
            onPointerDown={handleRemovePointerDown}
            disabled={disabled}
            className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50"
            aria-label="Remove file"
            data-file-upload-remove
          >
            <X className="h-4 w-4 pointer-events-none" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          disabled={disabled || isUploading}
          className={cn(
            "w-full h-24 border-dashed",
            error && "border-destructive"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{placeholder}</span>
                <span className="text-xs text-muted-foreground">
                  Max {maxSize}MB • {accept}
                </span>
              </>
            )}
          </div>
        </Button>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
