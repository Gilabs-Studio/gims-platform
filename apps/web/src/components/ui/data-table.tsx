"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export interface Column<T> {
  id: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
}

export interface MobileGrid2Layout {
  readonly type: "grid2";
  readonly columns: readonly string[]; // Column IDs to display in 2-column grid
}

export interface MobileLayoutConfig {
  readonly titleColumn?: string; // Column ID for title (actions will be placed next to it)
  readonly grid2?: MobileGrid2Layout; // Optional grid2 layout for some columns
}

interface DataTableProps<T> {
  readonly columns: readonly Column<T>[];
  readonly data: readonly T[];
  readonly isLoading?: boolean;
  readonly emptyMessage?: string;
  readonly pagination?: {
    readonly page: number;
    readonly per_page: number;
    readonly total: number;
    readonly total_pages: number;
    readonly has_next: boolean;
    readonly has_prev: boolean;
  };
  readonly onPageChange?: (page: number) => void;
  readonly onPerPageChange?: (perPage: number) => void;
  readonly perPageOptions?: readonly number[]; // e.g., [10, 20, 50, 100]
  readonly onResetFilters?: () => void;
  readonly mobileLayout?: MobileLayoutConfig; // Optional mobile layout configuration
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No data found",
  pagination,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 20, 50, 100],
  onResetFilters,
  mobileLayout,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();

  const getMinimalPageNumbers = () => {
    if (!pagination) return [];

    const totalPages = pagination.total_pages;
    const currentPage = pagination.page;
    const pages: number[] = [];

    // Show max 2 pages: current and next (if exists)
    // If on first page, show page 1 and 2
    // If on last page, show previous and current
    if (totalPages <= 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage === 1) {
        // First page: show 1 and 2
        pages.push(1, 2);
      } else if (currentPage === totalPages) {
        // Last page: show previous and current
        pages.push(totalPages - 1, totalPages);
      } else {
        // Middle: show current and next
        pages.push(currentPage, currentPage + 1);
      }
    }
    return pages;
  };

  // Mobile card view
  if (isMobile) {
    return (
      <div className="border rounded-lg">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton
                key={`skeleton-card-${i}`}
                className="h-32 w-full rounded-lg"
              />
            ))}
          </div>
        ) : (
          <>
            {data.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 px-4">
                {emptyMessage}
              </div>
            ) : (
              <div className="divide-y">
                {data.map((row) => {
                  // Find actions column (always look for it)
                  const actionsColumnIndex = columns.findIndex((col) => col.id === "actions");
                  const actionsColumn = actionsColumnIndex === -1 ? null : columns[actionsColumnIndex];

                  // If mobile layout is configured, use custom layout
                  if (mobileLayout) {
                    const titleColumnId = mobileLayout.titleColumn || columns[0]?.id;
                    const titleColumnIndex = columns.findIndex((col) => col.id === titleColumnId);
                    const titleColumn = titleColumnIndex === -1 ? columns[0] : columns[titleColumnIndex];

                    // Get columns for grid2 layout if configured
                    const grid2Columns: Column<T>[] = [];
                    if (mobileLayout.grid2) {
                      mobileLayout.grid2.columns.forEach((colId) => {
                        const col = columns.find((c) => c.id === colId);
                        if (col) grid2Columns.push(col);
                      });
                    }

                    // Get all other columns (excluding title, actions, and grid2 columns)
                    const otherColumns = columns.filter(
                      (col) =>
                        col.id !== titleColumnId &&
                        col.id !== "actions" &&
                        !mobileLayout.grid2?.columns.includes(col.id),
                    );

                    return (
                      <div
                        key={row.id}
                        className="p-4 hover:bg-muted/30 transition-colors border-b last:border-b-0"
                      >
                        <div className="space-y-2.5">
                          {/* Title + Actions Row */}
                          {titleColumn && (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  {titleColumn.header}
                                </div>
                                {actionsColumn && (
                                  <div className="shrink-0">
                                    {actionsColumn.accessor(row)}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm font-semibold text-foreground">
                                {titleColumn.accessor(row)}
                              </div>
                            </div>
                          )}

                          {/* Other columns (non-grid) */}
                          {otherColumns.map((column) => (
                            <div key={column.id} className="flex flex-col gap-1">
                              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {column.header}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {column.accessor(row)}
                              </div>
                            </div>
                          ))}

                          {/* Grid2 Layout */}
                          {grid2Columns.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                              {grid2Columns.map((column) => (
                                <div key={column.id} className="flex flex-col gap-1">
                                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {column.header}
                                  </div>
                                  <div className="text-sm">
                                    {column.accessor(row)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Default layout for tables without mobile layout config
                  return (
                    <div
                      key={row.id}
                      className="p-4 hover:bg-muted/30 transition-colors border-b last:border-b-0"
                    >
                      <div className="space-y-2.5">
                        {columns
                          .filter(() => {
                            // In default layout, show actions column normally
                            // Only skip if mobileLayout is configured (actions will be shown with title)
                            return true;
                          })
                          .map((column, index) => {
                            const isFirstColumn = index === 0;
                            return (
                              <div
                                key={column.id}
                                className={cn(
                                  "flex flex-col gap-1",
                                  isFirstColumn && "pb-2 border-b border-border/50",
                                )}
                              >
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  {column.header}
                                </div>
                                <div
                                  className={cn(
                                    "text-sm",
                                    isFirstColumn &&
                                      "font-semibold text-foreground",
                                  )}
                                >
                                  {column.accessor(row)}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Mobile Pagination */}
            {pagination && (
              <div className="border-t bg-muted/30 px-4 py-3 space-y-3">
                {/* Rows per page selector */}
                {onPerPageChange && (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="rows-per-page-mobile" className="text-sm">
                      Rows per page
                    </Label>
                    <Select
                      value={String(pagination.per_page)}
                      onValueChange={(value) => {
                        onPerPageChange?.(Number(value));
                        onPageChange?.(1);
                      }}
                    >
                      <SelectTrigger
                        id="rows-per-page-mobile"
                        className="w-20 h-8 text-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {perPageOptions.map((option) => (
                          <SelectItem key={option} value={String(option)}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Page info */}
                <div className="text-center text-sm text-muted-foreground">
                  <span className="text-foreground font-semibold">
                    {(pagination.page - 1) * pagination.per_page + 1}-
                    {Math.min(
                      pagination.page * pagination.per_page,
                      pagination.total,
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="text-foreground font-semibold">
                    {pagination.total}
                  </span>
                </div>

                {/* Minimalist Pagination controls */}
                {pagination.total_pages > 1 && (
                  <div className="flex items-center justify-center gap-1">
                    <PaginationPrevious
                      onClick={() =>
                        onPageChange?.(Math.max(1, pagination.page - 1))
                      }
                      disabled={!pagination.has_prev || isLoading}
                      className={cn(
                        "h-8 px-3 text-sm font-normal rounded-md border-0 bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors",
                        "disabled:pointer-events-none disabled:opacity-40",
                        (!pagination.has_prev || isLoading) &&
                          "pointer-events-none opacity-40 cursor-not-allowed",
                      )}
                      aria-disabled={!pagination.has_prev || isLoading}
                    />
                    
                    {getMinimalPageNumbers().map((pageNumber) => {
                      const isActive = pageNumber === pagination.page;
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => onPageChange?.(pageNumber)}
                          disabled={isLoading}
                          className={cn(
                            "h-8 min-w-8 px-3 text-sm font-medium rounded-md transition-all duration-200",
                            "disabled:pointer-events-none disabled:opacity-50",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                          )}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}

                    <PaginationNext
                      onClick={() => onPageChange?.(pagination.page + 1)}
                      disabled={!pagination.has_next || isLoading}
                      className={cn(
                        "h-8 px-3 text-sm font-normal rounded-md border-0 bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors",
                        "disabled:pointer-events-none disabled:opacity-40",
                        (!pagination.has_next || isLoading) &&
                          "pointer-events-none opacity-40 cursor-not-allowed",
                      )}
                      aria-disabled={!pagination.has_next || isLoading}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="border rounded-lg">
      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={`skeleton-row-${i}`} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.id} className={cn(column.className)}>
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-muted-foreground py-8"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/50">
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(column.className)}
                      >
                        {column.accessor(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {pagination && (
            <div className="border-t bg-muted/30 px-6 py-4">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                {/* Rows per page selector */}
                {onPerPageChange && (
                  <div className="flex items-center gap-3 order-3 lg:order-1">
                    <Label
                      htmlFor="rows-per-page"
                      className="text-sm whitespace-nowrap"
                    >
                      Rows per page
                    </Label>
                    <Select
                      value={String(pagination.per_page)}
                      onValueChange={(value) => {
                        onPerPageChange?.(Number(value));
                        // Reset to page 1 when changing per page
                        onPageChange?.(1);
                      }}
                    >
                      <SelectTrigger
                        id="rows-per-page"
                        className="w-fit whitespace-nowrap h-9"
                      >
                        <SelectValue placeholder="Select rows" />
                      </SelectTrigger>
                      <SelectContent>
                        {perPageOptions.map((option) => (
                          <SelectItem key={option} value={String(option)}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Page number information */}
                <div className="flex grow justify-center lg:justify-end text-sm whitespace-nowrap text-muted-foreground order-2 lg:order-2">
                  <p
                    className="text-sm whitespace-nowrap text-muted-foreground"
                    aria-live="polite"
                  >
                    <span className="text-foreground font-semibold">
                      {(pagination.page - 1) * pagination.per_page + 1}-
                      {Math.min(
                        pagination.page * pagination.per_page,
                        pagination.total,
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="text-foreground font-semibold">
                      {pagination.total}
                    </span>
                  </p>
                </div>

                {/* Minimalist Pagination controls + optional reset filters */}
                {pagination.total_pages > 1 && (
                  <div className="flex items-center gap-3 order-1 lg:order-3">
                    {onResetFilters && (
                      <button
                        type="button"
                        onClick={() => onResetFilters()}
                        className="text-xs font-medium text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                      >
                        Reset filters
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                      <PaginationPrevious
                        onClick={() =>
                          onPageChange?.(Math.max(1, pagination.page - 1))
                        }
                        disabled={!pagination.has_prev || isLoading}
                        className={cn(
                          "h-8 px-3 text-sm font-normal rounded-md border-0 bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors",
                          "disabled:pointer-events-none disabled:opacity-40",
                          (!pagination.has_prev || isLoading) &&
                            "pointer-events-none opacity-40 cursor-not-allowed",
                        )}
                        aria-disabled={!pagination.has_prev || isLoading}
                      />
                      
                      {getMinimalPageNumbers().map((pageNumber) => {
                        const isActive = pageNumber === pagination.page;
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => onPageChange?.(pageNumber)}
                            disabled={isLoading}
                            className={cn(
                              "h-8 min-w-8 px-3 text-sm font-medium rounded-md transition-all duration-200",
                              "disabled:pointer-events-none disabled:opacity-50",
                              isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            )}
                            aria-current={isActive ? "page" : undefined}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}

                      <PaginationNext
                        onClick={() => onPageChange?.(pagination.page + 1)}
                        disabled={!pagination.has_next || isLoading}
                        className={cn(
                          "h-8 px-3 text-sm font-normal rounded-md border-0 bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors",
                          "disabled:pointer-events-none disabled:opacity-40",
                          (!pagination.has_next || isLoading) &&
                            "pointer-events-none opacity-40 cursor-not-allowed",
                        )}
                        aria-disabled={!pagination.has_next || isLoading}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
