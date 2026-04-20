"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { BarChart2, ShoppingCart, DollarSign, LayoutDashboard, Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_WIDGETS } from "../config/widget-registry";
import type { WidgetConfig } from "../types";

// ─── Template definitions ────────────────────────────────────────────────────

const MINIMAL_WIDGETS: WidgetConfig[] = [
  { id: "t-1", type: "total_revenue",   title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 0, visible: true },
  { id: "t-2", type: "total_orders",    title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 1, visible: true },
  { id: "t-3", type: "total_customers", title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 2, visible: true },
  { id: "t-4", type: "total_products",  title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 3, visible: true },
];

const SALES_WIDGETS: WidgetConfig[] = [
  { id: "t-1", type: "total_orders",         title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 0, visible: true },
  { id: "t-2", type: "total_revenue",        title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 1, visible: true },
  { id: "t-3", type: "total_customers",      title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 2, visible: true },
  { id: "t-4", type: "total_products",       title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 3, visible: true },
  { id: "t-5", type: "revenue_bar_chart",    title: "", size: "md", colSpan: 2, rowSpan: 2, order: 4, visible: true },
  { id: "t-6", type: "track_orders",         title: "", size: "md", colSpan: 2, rowSpan: 2, order: 5, visible: true },
  { id: "t-7", type: "track_purchase_orders",title: "", size: "md", colSpan: 2, rowSpan: 2, order: 6, visible: true },
];

const FINANCE_WIDGETS: WidgetConfig[] = [
  { id: "t-1", type: "kpi_net_profit_margin",  title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 0, visible: true },
  { id: "t-2", type: "kpi_gross_profit_margin", title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 1, visible: true },
  { id: "t-3", type: "kpi_roe",                title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 2, visible: true },
  { id: "t-4", type: "kpi_roa",                title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 3, visible: true },
  { id: "t-5", type: "revenue_bar_chart",       title: "", size: "md", colSpan: 2, rowSpan: 2, order: 4, visible: true },
  { id: "t-6", type: "kpi_opex_vs_capex",      title: "", size: "md", colSpan: 2, rowSpan: 2, order: 5, visible: true },
  { id: "t-7", type: "kpi_ccc",                title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 6, visible: true },
  { id: "t-8", type: "kpi_ar_days",            title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 7, visible: true },
  { id: "t-9", type: "kpi_ap_days",            title: "", size: "sm", colSpan: 1, rowSpan: 1, order: 8, visible: true },
];

interface Template {
  id: string;
  nameKey: string;
  descriptionKey: string;
  icon: React.ElementType;
  widgets: WidgetConfig[];
  previewBlocks: Array<{ cols: number }>;
}

const TEMPLATES: Template[] = [
  {
    id: "minimal",
    nameKey: "templatePicker.templates.minimal.name",
    descriptionKey: "templatePicker.templates.minimal.description",
    icon: Grid2X2,
    widgets: MINIMAL_WIDGETS,
    previewBlocks: [{ cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }],
  },
  {
    id: "sales",
    nameKey: "templatePicker.templates.sales.name",
    descriptionKey: "templatePicker.templates.sales.description",
    icon: ShoppingCart,
    widgets: SALES_WIDGETS,
    previewBlocks: [{ cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 2 }, { cols: 2 }],
  },
  {
    id: "finance",
    nameKey: "templatePicker.templates.finance.name",
    descriptionKey: "templatePicker.templates.finance.description",
    icon: DollarSign,
    widgets: FINANCE_WIDGETS,
    previewBlocks: [{ cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 2 }, { cols: 2 }],
  },
  {
    id: "complete",
    nameKey: "templatePicker.templates.complete.name",
    descriptionKey: "templatePicker.templates.complete.description",
    icon: LayoutDashboard,
    widgets: DEFAULT_WIDGETS,
    previewBlocks: [{ cols: 4 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 1 }, { cols: 2 }, { cols: 2 }],
  },
];

// ─── Mini preview grid ───────────────────────────────────────────────────────

function TemplatePreview({ blocks }: { blocks: Array<{ cols: number }> }) {
  return (
    <div className="grid grid-cols-4 gap-1 rounded-md bg-muted/50 p-2">
      {blocks.map((block, i) => (
        <div
          key={i}
          className="h-4 rounded-sm bg-muted-foreground/20"
          style={{ gridColumn: `span ${block.cols}` }}
        />
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface DashboardTemplatePickerProps {
  readonly onSelect: (widgets: WidgetConfig[]) => void;
}

export function DashboardTemplatePicker({ onSelect }: DashboardTemplatePickerProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-3xl"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-muted-foreground">
            <BarChart2 className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("templatePicker.title")}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("templatePicker.description")}
          </p>
        </div>

        {/* Template cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {TEMPLATES.map((tpl, i) => {
            const Icon = tpl.icon;
            return (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                className="group flex flex-col gap-3 rounded-xl border bg-card p-4 hover:border-primary/50 hover:shadow-sm"
              >
                {/* Card header */}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight">
                      {t(tpl.nameKey as Parameters<typeof t>[0])}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(tpl.descriptionKey as Parameters<typeof t>[0])}
                    </p>
                  </div>
                </div>

                {/* Mini layout preview */}
                <TemplatePreview blocks={tpl.previewBlocks} />

                {/* Action */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full cursor-pointer text-xs transition-colors group-hover:border-primary/50 group-hover:bg-primary group-hover:text-primary-foreground"
                  onClick={() => onSelect(tpl.widgets)}
                >
                  {t("templatePicker.useTemplate")}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
