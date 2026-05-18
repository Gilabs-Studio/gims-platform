"use client";

import type { ReactNode } from "react";
import { useRouter, usePathname, Link } from "@/i18n/routing";
import {
  LayoutDashboard,
  Building2,
  LogOut,
  ShieldCheck,
  Ticket,
  CreditCard,
  Package,
  UserCircle,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSystemAdminStore } from "../stores/use-system-admin-store";
import { systemAdminService } from "../services/system-admin-service";
import { clearCSRFTokenMemory } from "@/lib/api-client";

interface SystemAdminLayoutProps {
  readonly children: ReactNode;
}

const sidebarLinks = [
  {
    label: "Dashboard",
    href: "/system/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Tenants",
    href: "/system/tenants",
    icon: Building2,
  },
  {
    label: "Coupons",
    href: "/system/coupons",
    icon: Ticket,
  },
  {
    label: "Plans",
    href: "/system/plans",
    icon: Package,
  },
  {
    label: "Subscriptions",
    href: "/system/subscriptions",
    icon: CreditCard,
  },
  {
    label: "Permissions",
    href: "/system/permissions",
    icon: KeyRound,
  },
  {
    label: "Profile",
    href: "/system/profile",
    icon: UserCircle,
  },
];

export function SystemAdminLayout({ children }: SystemAdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout: storeLogout } = useSystemAdminStore();

  const handleLogout = async () => {
    try {
      await systemAdminService.logout();
    } catch {
      // Continue even if API call fails
    }

    clearCSRFTokenMemory();
    storeLogout();

    const locale = pathname.split("/").filter(Boolean)[0] ?? "id";
    if (typeof window !== "undefined") {
      window.location.replace(`/${locale}/system/login`);
      return;
    }

    router.replace("/system/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r bg-card">
        {/* Header */}
        <div className="flex h-16 items-center gap-2 border-b px-4">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">SalesView Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-3">
          <div className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {admin?.username || admin?.name || admin?.email}
          </div>
          <div className="mb-2 truncate px-3 text-[11px] text-muted-foreground/80">
            {admin?.email}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
