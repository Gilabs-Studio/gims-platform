"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Eye, MoreHorizontal, Pencil, RotateCcw, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserPermission } from "@/hooks/use-user-permission";
import {
  usePostFinanceJournal,
  useReverseFinanceJournal,
} from "../hooks/use-finance-journals";
import { getErrorMessage, parseApiError } from "../utils/error-parser";
import type { UnifiedJournalRow } from "./journal-table";

interface JournalActionMenuProps {
  row: UnifiedJournalRow;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSourceDetail?: (row: UnifiedJournalRow) => void;
}

export function JournalActionMenu({
  row,
  onView,
  onEdit,
  onDelete,
  onSourceDetail,
}: JournalActionMenuProps) {
  const t = useTranslations("financeJournals");
  const item = row.original as { is_system_generated?: boolean };
  const status = (row.status || "").toLowerCase();

  const canUpdate = useUserPermission("journal.update");
  const canDelete = useUserPermission("journal.delete");
  const canPost = useUserPermission("journal.post");
  const canReverse = useUserPermission("journal.reverse");

  const postMutation = usePostFinanceJournal();
  const reverseMutation = useReverseFinanceJournal();

  const isDraft = status === "draft";
  const isPosted = status === "posted";
  const isSystemGenerated = !!item.is_system_generated;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => onView?.(row.id)}
        >
          <Eye className="h-4 w-4 mr-2" />
          {t("actions.view")}
        </DropdownMenuItem>

        {onSourceDetail && row.sourceHref && (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => onSourceDetail(row)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Source Document
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {isDraft && !isSystemGenerated && canUpdate && (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => onEdit?.(row.id)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {t("actions.edit")}
          </DropdownMenuItem>
        )}

        {isDraft && canPost && (
          <DropdownMenuItem
            className="cursor-pointer text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
            onClick={async () => {
              try {
                await postMutation.mutateAsync(row.id);
                toast.success(t("toast.posted"));
              } catch (error: unknown) {
                const parsedError = parseApiError(error);
                toast.error(getErrorMessage(parsedError, (key) => t(key)));
              }
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {t("actions.post")}
          </DropdownMenuItem>
        )}

        {isDraft && !isSystemGenerated && canDelete && (
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/5"
            onClick={() => onDelete?.(row.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t("actions.delete")}
          </DropdownMenuItem>
        )}

        {isPosted && canReverse && (
          <DropdownMenuItem
            className="cursor-pointer text-orange-600 focus:text-orange-600 focus:bg-orange-50"
            onClick={async () => {
              try {
                await reverseMutation.mutateAsync(row.id);
                toast.success(t("toast.reversed"));
              } catch (error: unknown) {
                const parsedError = parseApiError(error);
                toast.error(getErrorMessage(parsedError, (key) => t(key)));
              }
            }}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("actions.reverse")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
