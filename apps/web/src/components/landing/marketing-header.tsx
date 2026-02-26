"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function MarketingHeader() {
  const pathname = usePathname();

  const navItems = [
    { label: "Features", href: "/#features" },
    { label: "Modules", href: "/#modules" },
    { label: "Pricing", href: "/pricing" },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container flex h-14 items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="group flex items-center gap-2 transition-opacity hover:opacity-75"
        >
          <span className="text-lg font-semibold tracking-tight text-foreground">
            GIMS
          </span>
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline-block">
            by GILABS
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors hover:text-foreground",
                pathname === item.href
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="cursor-pointer">
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
