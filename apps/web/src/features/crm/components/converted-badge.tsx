"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type ConvertedBadgeType =
  | "lead-to-deal"
  | "deal-to-quotation"
  | "deal-to-customer";

interface ConvertedBadgeProps {
  type: ConvertedBadgeType;
  targetId: string;
  targetLabel: string;
  targetUrl: string;
  compact?: boolean;
}

const TYPE_CONFIG: Record<
  ConvertedBadgeType,
  {
    labelKey: string;
    className: string;
    compactClassName: string;
  }
> = {
  "lead-to-deal": {
    labelKey: "leadToDeal",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/50",
    compactClassName:
      "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  },
  "deal-to-quotation": {
    labelKey: "dealToQuotation",
    className:
      "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-900/50",
    compactClassName:
      "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800",
  },
  "deal-to-customer": {
    labelKey: "dealToCustomer",
    className:
      "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/50",
    compactClassName:
      "bg-green-50 text-green-600 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  },
};

export function ConvertedBadge({
  type,
  targetLabel,
  targetUrl,
  compact = false,
}: ConvertedBadgeProps) {
  const t = useTranslations("convertedBadge");
  const config = TYPE_CONFIG[type];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={targetUrl}>
              <Badge
                variant="outline"
                className={cn(
                  "cursor-pointer gap-1 text-[10px] px-1.5 py-0 transition-colors",
                  config.compactClassName,
                )}
              >
                <ExternalLink className="!size-2.5" />
                {t(config.labelKey)}
              </Badge>
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {t("viewTarget")}: {targetLabel}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={targetUrl}>
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer gap-1.5 transition-colors",
                config.className,
              )}
            >
              <ExternalLink className="!size-3" />
              {t(config.labelKey)}: {targetLabel}
            </Badge>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{t("clickToView")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
