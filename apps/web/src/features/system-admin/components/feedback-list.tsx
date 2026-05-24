"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "next-intl";
import { PageMotion } from "@/components/motion/page-motion";
import { useSupportFeedbacks, useDeleteSupportFeedback } from "../hooks/use-feedbacks";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, Trash2, Image as ImageIcon } from "lucide-react";
import type { SupportFeedback } from "../types";

export function FeedbackList() {
  const t = useTranslations("systemAdmin");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [viewingFeedback, setViewingFeedback] = useState<SupportFeedback | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useSupportFeedbacks({ page, per_page: perPage });
  const deleteMutation = useDeleteSupportFeedback();

  const feedbacks = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      setDeletingId(null);
    } catch {
      // Handled in mutation
    }
  };

  if (isError) {
    return (
      <PageMotion>
        <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
          {t("supportFeedback.failedToLoad")}
        </div>
      </PageMotion>
    );
  }

  return (
    <PageMotion>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {t("supportFeedback.title")}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {t("supportFeedback.description")}
            </p>
          </div>
          {pagination && (
            <span className="text-xs text-muted-foreground font-medium">
              {t("supportFeedback.totalFeedbacks", { count: pagination.total })}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border/40 overflow-hidden bg-background">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[160px] text-xs font-semibold uppercase text-muted-foreground">
                  {t("supportFeedback.tableDate")}
                </TableHead>
                <TableHead className="w-[200px] text-xs font-semibold uppercase text-muted-foreground">
                  {t("supportFeedback.tableUser")}
                </TableHead>
                <TableHead className="w-[200px] text-xs font-semibold uppercase text-muted-foreground">
                  {t("supportFeedback.tableTenant")}
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("supportFeedback.tableMessage")}
                </TableHead>
                <TableHead className="w-[100px] text-center text-xs font-semibold uppercase text-muted-foreground">
                  {t("supportFeedback.tableAttachment")}
                </TableHead>
                <TableHead className="w-[100px] text-right text-xs font-semibold uppercase text-muted-foreground">
                  {t("supportFeedback.tableActions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: perPage }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : feedbacks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs italic">
                    {t("supportFeedback.noFeedbacks")}
                  </TableCell>
                </TableRow>
              ) : (
                feedbacks.map((fb) => (
                  <TableRow key={fb.id} className="hover:bg-muted/10">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(fb.created_at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-foreground">
                          {fb.user_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{fb.user_email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-foreground">
                          {fb.tenant_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{fb.tenant_id}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <div className="text-xs truncate text-muted-foreground" title={fb.message}>
                        {fb.message}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {fb.image_url ? (
                        <div className="flex items-center justify-center">
                          <ImageIcon className="h-3.5 w-3.5 text-primary" />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                          onClick={() => setViewingFeedback(fb)}
                          title={t("supportFeedback.viewDetail")}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 cursor-pointer"
                          onClick={() => setDeletingId(fb.id)}
                          title={t("supportFeedback.delete")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && (
          <DataTablePagination
            pageIndex={pagination.page}
            pageSize={pagination.per_page}
            rowCount={pagination.total}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPerPage(size);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!viewingFeedback} onOpenChange={(open) => !open && setViewingFeedback(null)}>
        <DialogContent className="max-w-2xl overflow-hidden max-h-[85vh] flex flex-col p-6">
          {viewingFeedback && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-semibold">
                  {t("supportFeedback.detailTitle")}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {t("supportFeedback.detailDesc", {
                    user: viewingFeedback.user_name,
                    email: viewingFeedback.user_email,
                    tenant: viewingFeedback.tenant_name,
                  })}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-3">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted/20 border border-border/40 rounded-lg text-xs">
                  <div>
                    <span className="text-muted-foreground block mb-0.5">
                      {t("supportFeedback.detailSentAt")}
                    </span>
                    <span className="font-semibold text-foreground">
                      {new Date(viewingFeedback.created_at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-0.5">
                      {t("supportFeedback.detailFeedbackId")}
                    </span>
                    <span className="font-mono text-foreground">{viewingFeedback.id}</span>
                  </div>
                </div>

                {/* Message Body */}
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    {t("supportFeedback.detailMessageLabel")}
                  </span>
                  <div className="border rounded-md p-3.5 bg-muted/10 prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{viewingFeedback.message}</ReactMarkdown>
                  </div>
                </div>

                {/* Attachment */}
                {viewingFeedback.image_url && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground block">
                      {t("supportFeedback.detailAttachmentLabel")}
                    </span>
                    <div className="border rounded-md overflow-hidden max-w-md bg-muted/15 flex items-center justify-center p-1.5">
                      <a href={viewingFeedback.image_url} target="_blank" rel="noopener noreferrer" className="relative group block">
                        <img
                          src={viewingFeedback.image_url}
                          alt="Screenshot Lampiran"
                          className="max-h-60 object-contain rounded-md"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium rounded-md">
                          {t("supportFeedback.clickToOpenImage")}
                        </div>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="border-t pt-3 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setViewingFeedback(null)} className="cursor-pointer">
                  {t("supportFeedback.close")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{t("supportFeedback.deleteConfirmTitle")}</DialogTitle>
            <DialogDescription className="text-xs">
              {t("supportFeedback.deleteConfirmDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setDeletingId(null)} className="cursor-pointer">
              {t("supportFeedback.deleteCancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="cursor-pointer"
            >
              {deleteMutation.isPending ? t("supportFeedback.deleting") : t("supportFeedback.deleteSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageMotion>
  );
}
