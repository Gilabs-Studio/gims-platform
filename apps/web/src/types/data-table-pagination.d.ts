declare module "@/components/ui/data-table-pagination" {
  import React from "react";

  export interface DataTablePaginationProps {
    pageIndex: number;
    pageSize: number;
    rowCount: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    showPageSize?: boolean;
    pageSizeOptions?: number[];
  }

  export function DataTablePagination(props: DataTablePaginationProps): React.JSX.Element;

  export {};
}
