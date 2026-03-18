"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Search, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecruitmentRequest } from "../types";
import { RecruitmentCard } from "./recruitment-card";

interface RecruitmentOverviewProps {
  readonly requests: RecruitmentRequest[];
  readonly isLoading: boolean;
  readonly onRequestClick: (request: RecruitmentRequest) => void;
  readonly searchTerm?: string;
}

function RecruitmentCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 h-full flex flex-col">
      {/* Header skeleton */}
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-5 w-16 shrink-0" />
      </div>

      {/* Position skeleton */}
      <Skeleton className="h-4 w-40 mb-4" />

      {/* Badges skeleton */}
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-20" />
      </div>

      {/* Progress skeleton */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-1.5 w-full" />
      </div>

      {/* Details skeleton */}
      <div className="space-y-2 pt-2 border-t border-dashed">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

export function RecruitmentOverview({
  requests,
  isLoading,
  onRequestClick,
  searchTerm,
}: RecruitmentOverviewProps) {
  const t = useTranslations("recruitment");

  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <RecruitmentCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center py-16 px-4"
      >
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          {searchTerm ? (
            <Search className="h-8 w-8 text-muted-foreground" />
          ) : (
            <Inbox className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {searchTerm ? t("common.noResults") : t("notFound")}
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {searchTerm
            ? `No recruitment requests match "${searchTerm}". Try a different search term.`
            : "There are no recruitment requests to display. Create a new request to get started."}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
      {requests.map((request, index) => (
        <RecruitmentCard
          key={request.id}
          request={request}
          onClick={onRequestClick}
          index={index}
        />
      ))}
    </div>
  );
}
