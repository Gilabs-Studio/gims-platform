"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PageMotion } from "@/components/motion";

interface UserManagementLayoutProps {
  children: React.ReactNode;
}

export default function UserManagementLayout({ children }: UserManagementLayoutProps) {
  const pathname = usePathname();
  const t = useTranslations("userManagement");

  const tabs = [
    { name: t("tabs.users"), href: "/data-master/user-management/user" },
    { name: t("tabs.roles"), href: "/data-master/user-management/role" },
    { name: t("tabs.permissions"), href: "/data-master/user-management/permission" },
  ];

  // Extract locale from pathname (e.g., /en/... or /id/...)
  const locale = pathname.split("/")[1];
  const currentPath = pathname.replace(`/${locale}`, "");

  return (
    <PageMotion className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = currentPath === tab.href;
            return (
              <Link
                key={tab.href}
                href={`/${locale}${tab.href}`}
                className={cn(
                  "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium cursor-pointer transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {children}
    </PageMotion>
  );
}
