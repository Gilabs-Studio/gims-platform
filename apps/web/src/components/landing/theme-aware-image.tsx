"use client";

import Image, { type ImageProps } from "next/image";
import { useTheme } from "next-themes";

type ThemeAwareImageProps = Omit<ImageProps, "src"> & {
  lightSrc: string;
  darkSrc: string;
};

export function ThemeAwareImage({
  lightSrc,
  darkSrc,
  alt,
  ...props
}: ThemeAwareImageProps) {
  const { resolvedTheme } = useTheme();

  const src = resolvedTheme === "dark" ? darkSrc : lightSrc;

  return <Image {...props} src={src} alt={alt} suppressHydrationWarning />;
}

