"use client";

import { Link } from "@/i18n/routing";
import { ChevronRight } from "lucide-react";
import { useBreadcrumb } from "@/hooks/use-breadcrumb";
import { usePathname } from "@/i18n/routing";
import { useDealById } from "@/features/crm/deal/hooks/use-deals";
import { useUserPermissions } from "@/features/master-data/user-management/hooks/use-user-permissions";
import type { MenuWithActions } from "@/features/master-data/user-management/types";
import { getMenuIcon } from "@/lib/menu-icons";
import { cn } from "@/lib/utils";

export function Breadcrumb() {
  const { data: permissionsData } = useUserPermissions();
  const menus = permissionsData?.data?.menus as MenuWithActions[] | undefined;
  const breadcrumbItems = useBreadcrumb(menus);
  const pathname = usePathname();

  // Normalize pathname (remove locale prefix)
  const normalizedPath = (() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "id" || segments[0] === "en") {
      return "/" + segments.slice(1).join("/");
    }
    return pathname;
  })();

  // Extract deal id if on deal detail route and call hook unconditionally
  const _match = normalizedPath.match(/^\/crm\/pipeline\/([^/]+)$/);
  const dealId = _match ? _match[1] : "";
  const { data: dealResp } = useDealById(dealId);

  let overriddenItems = breadcrumbItems;
  const dealTitle = dealResp?.data?.title;
  if (dealTitle && breadcrumbItems.length > 0 && dealId) {
    overriddenItems = breadcrumbItems.map((it, idx) =>
      idx === breadcrumbItems.length - 1 ? { ...it, label: dealTitle } : it
    );
  }

  // Don't show breadcrumb if only dashboard (single item)
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <ol className="flex items-center gap-2">
        {overriddenItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const icon = item.icon ? getMenuIcon(item.icon) : null;

          return (
            <li key={`${item.href}-${index}`} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              )}
              {isLast ? (
                <span
                  className={cn(
                    "flex items-center gap-1.5 font-medium text-foreground",
                    !isLast && "hover:text-foreground"
                  )}
                  aria-current="page"
                >
                  {icon && <span className="[&>svg]:h-4 [&>svg]:w-4 shrink-0">{icon}</span>}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
                >
                  {icon && <span className="[&>svg]:h-4 [&>svg]:w-4 shrink-0">{icon}</span>}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
