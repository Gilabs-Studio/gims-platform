import type { ReactNode } from "react";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type StandardTableProps = {
  readonly isLoading: boolean;
  readonly columnCount: number;
  readonly skeletonRows?: number;
  readonly header: ReactNode;
  readonly children: ReactNode;
};

export function StandardTable({
  isLoading,
  columnCount,
  skeletonRows = 6,
  header,
  children,
}: StandardTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>{header}</TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: skeletonRows }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={columnCount} className="p-3">
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : children}
        </TableBody>
      </Table>
    </div>
  );
}
