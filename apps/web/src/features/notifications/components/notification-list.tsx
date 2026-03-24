"use client";

import { Bell, CheckCheck, RefreshCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
} from "../hooks/use-notifications";
import type { Notification } from "../types";

export function NotificationList() {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [page, setPage] = useState(1);

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useNotifications({
    page,
    per_page: 20,
  });

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = response?.data ?? [];
  const pagination = response?.meta?.pagination;

  const handleMarkAsRead = async (id: string) => {
    await markAsRead.mutateAsync(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead.mutateAsync();
  };

  const resolveEntityLink = (notification: Notification): string | null => {
    if (notification.entity_link) {
      return notification.entity_link;
    }

    switch (notification.entity_type) {
      case "sales_quotation":
        return `/sales/quotations?open_quotation=${notification.entity_id}`;
      case "sales_order":
        return `/sales/orders?open_order=${notification.entity_id}`;
      case "purchase_requisition":
        return `/purchase/purchase-requisitions?open_requisition=${notification.entity_id}`;
      case "purchase_order":
        return `/purchase/purchase-orders?open_order=${notification.entity_id}`;
      case "goods_receipt":
        return `/purchase/goods-receipt?open_receipt=${notification.entity_id}`;
      case "supplier_invoice":
        return `/purchase/supplier-invoices?open_invoice=${notification.entity_id}`;
      case "non_trade_payable":
        return `/finance/non-trade-payables?open_payable=${notification.entity_id}`;
      case "up_country_cost":
        return `/finance/up-country-cost?open_cost=${notification.entity_id}`;
      case "crm_visit":
        return `/crm/visits?open_visit=${notification.entity_id}`;
      case "company":
        return "/master-data/company";
      default:
        return null;
    }
  };

  const handleOpenNotification = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead.mutateAsync(notification.id);
    }

    const path = resolveEntityLink(notification);
    if (path) {
      router.push(path);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="mb-4 text-sm text-destructive">
            {error instanceof Error ? error.message : t("errorLoading")}
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="cursor-pointer">
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="mb-3 inline-block rounded-full bg-muted p-3">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </CardContent>
      </Card>
    );
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return (
    <div className="space-y-4">

      <div className="space-y-3">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={handleMarkAsRead}
            onOpen={handleOpenNotification}
          />
        ))}
      </div>

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("showing", {
              from: (pagination.page - 1) * pagination.per_page + 1,
              to: Math.min(pagination.page * pagination.per_page, pagination.total),
              total: pagination.total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={!pagination.has_prev || page === 1}
              className="cursor-pointer"
            >
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={!pagination.has_next}
              className="cursor-pointer"
            >
              {t("next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  readonly notification: Notification;
  readonly onMarkAsRead: (id: string) => void;
  readonly onOpen: (notification: Notification) => void;
}

function NotificationItem({ notification, onMarkAsRead, onOpen }: NotificationItemProps) {
  const t = useTranslations("notifications");
  const markAsRead = useMarkAsRead();

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  const handleMarkAsRead = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-sm ${
        !notification.is_read ? "border-primary/20 bg-primary/5" : ""
      }`}
      onClick={() => onOpen(notification)}
    >
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-start gap-2">
              {!notification.is_read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              )}
              <div className="flex-1">
                <h4 className={`text-sm font-medium ${!notification.is_read ? "font-semibold" : ""}`}>
                  {notification.title}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{timeAgo}</p>
              </div>
            </div>
          </div>

          {!notification.is_read && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(event) => {
                event.stopPropagation();
                handleMarkAsRead();
              }}
              disabled={markAsRead.isPending}
              title={t("markAsRead")}
              className="h-8 w-8 cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
