"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  UserCheck,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Wallet,
  PieChart,
  FileText,
  Receipt,
  Award,
  Star,
  Truck,
  Map,
  Warehouse,
  ClipboardCheck,
  PackageCheck,
} from "lucide-react";
import { getWidgetsByCategory, WIDGET_REGISTRY } from "../config/widget-registry";
import type { WidgetType, WidgetConfig, WidgetCategory } from "../types";

const ICON_MAP: Record<string, React.ElementType> = {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  UserCheck,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Wallet,
  PieChart,
  FileText,
  Receipt,
  Award,
  Star,
  Truck,
  Map,
  Warehouse,
  ClipboardCheck,
  PackageCheck,
};

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  overview: "Overview",
  finance: "Finance",
  sales: "Sales",
  purchase: "Purchase",
  inventory: "Inventory",
  geographic: "Geographic",
  hr: "HR",
};

interface WidgetPickerProps {
  readonly existingWidgets: WidgetConfig[];
  readonly onAddWidget: (type: WidgetType) => void;
}

export function WidgetPicker({ existingWidgets, onAddWidget }: WidgetPickerProps) {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const grouped = useMemo(() => getWidgetsByCategory(), []);
  const existingTypes = useMemo(
    () => new Set(existingWidgets.map((w) => w.type)),
    [existingWidgets],
  );

  const categories = Object.keys(grouped);
  const filteredWidgets =
    selectedCategory === "all"
      ? Object.values(WIDGET_REGISTRY)
      : grouped[selectedCategory] ?? [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="cursor-pointer gap-1.5">
          <Plus className="h-4 w-4" />
          {t("addWidget")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("widgetPicker.title")}</DialogTitle>
        </DialogHeader>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={selectedCategory === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory("all")}
          >
            {t("widgetPicker.all")}
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(cat)}
            >
              {CATEGORY_LABELS[cat as WidgetCategory] ?? cat}
            </Badge>
          ))}
        </div>

        {/* Widget list */}
        <div className="max-h-80 space-y-1.5 overflow-y-auto">
          {filteredWidgets.map((entry) => {
            const Icon = ICON_MAP[entry.icon] ?? DollarSign;
            const exists = existingTypes.has(entry.type);

            return (
              <div
                key={entry.type}
                className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                  exists
                    ? "opacity-50"
                    : "cursor-pointer hover:bg-secondary"
                }`}
                onClick={() => {
                  if (!exists) {
                    onAddWidget(entry.type);
                    setOpen(false);
                  }
                }}
                role="button"
                tabIndex={exists ? -1 : 0}
                onKeyDown={(e) => {
                  if (!exists && (e.key === "Enter" || e.key === " ")) {
                    onAddWidget(entry.type);
                    setOpen(false);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {t(entry.titleKey as Parameters<typeof t>[0])}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(entry.descriptionKey as Parameters<typeof t>[0])}
                    </p>
                  </div>
                </div>
                {exists ? (
                  <Badge variant="secondary">{t("widgetPicker.added")}</Badge>
                ) : (
                  <Plus className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
