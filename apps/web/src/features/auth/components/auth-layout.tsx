"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";

interface AuthLayoutProps {
  readonly children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { resolvedTheme } = useTheme();

  const bgImageSrc = useMemo(() => {
    if (resolvedTheme === "dark") {
      return "/login2.png";
    }
    return "/login.png";
  }, [resolvedTheme]);

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Full Image (2/3) */}
      <div className="hidden lg:block lg:w-2/3 p-6">
        <div className="relative h-full w-full overflow-hidden rounded-lg shadow-lg">
          <Image
            src={bgImageSrc}
            alt="GIMS Platform"
            fill
            className="object-cover"
            priority
            suppressHydrationWarning
          />
        </div>
      </div>

      {/* Right Side - Form (1/3) */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/3">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex size-10 aspect-square items-center justify-center rounded-xl shadow-lg overflow-hidden">
              <Image
                src="/logo.webp"
                alt="GIMS"
                width={40}
                height={40}
                className="object-contain"
                suppressHydrationWarning
              />
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="text-xl font-bold text-primary">GIMS</span>
              <span className="text-xs text-muted-foreground">
                GILABS Integrated Management System
              </span>
            </div>
          </div>

          {/* Form Content */}
          {children}
        </div>
      </div>
    </div>
  );
}
