"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getImageThumbnail } from "@/lib/image-thumbnails";

export type ProgressiveImageProps = ImageProps & {
  thumbSrc?: string;
  wrapperClassName?: string;
};

export function ProgressiveImage({
  src,
  alt,
  className,
  wrapperClassName,
  thumbSrc,
  onLoad,
  fill,
  ...props
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const srcString = typeof src === "string" ? src : "";

  // Get ultra-low thumbnail (base64 data URL or path)
  const thumbnail = thumbSrc || (srcString ? getImageThumbnail(srcString) : undefined);

  return (
    <div className={cn("relative overflow-hidden", fill ? "h-full w-full" : "inline-block", wrapperClassName)}>
      {/* Instant Ultra-Low Size Blurred Placeholder */}
      {thumbnail && !isLoaded ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full object-cover scale-105 filter blur-md transition-opacity duration-500",
            isLoaded ? "opacity-0" : "opacity-100"
          )}
        />
      ) : null}

      {/* Main Crisp HD Image */}
      <Image
        {...props}
        src={src}
        alt={alt}
        fill={fill}
        className={cn(
          className,
          "transition-all duration-500",
          thumbnail && !isLoaded ? "opacity-0 scale-[1.01] blur-sm" : "opacity-100 scale-100 blur-0"
        )}
        onLoad={(e) => {
          setIsLoaded(true);
          onLoad?.(e);
        }}
      />
    </div>
  );
}
