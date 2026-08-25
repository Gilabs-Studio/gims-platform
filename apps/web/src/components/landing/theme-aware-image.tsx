"use client";

import { useTheme } from "next-themes";
import { useState } from "react";
import { ProgressiveImage, type ProgressiveImageProps } from "@/components/ui/progressive-image";

type ThemeAwareImageProps = Omit<ProgressiveImageProps, "src"> & {
  lightSrc: string;
  darkSrc: string;
  fallback?: React.ReactNode;
  fetchPriority?: "high" | "low" | "auto";
};

export function ThemeAwareImage({
  lightSrc,
  darkSrc,
  alt,
  fallback,
  fetchPriority,
  ...props
}: ThemeAwareImageProps) {
  const { resolvedTheme } = useTheme();
  const [error, setError] = useState(false);
  const src = resolvedTheme === "dark" ? darkSrc : lightSrc;

  if (error && fallback) {
    return <>{fallback}</>;
  }

  return (
    <ProgressiveImage
      {...props}
      src={src}
      alt={alt}
      suppressHydrationWarning
      fetchPriority={fetchPriority}
      onError={() => setError(true)}
    />
  );
}


