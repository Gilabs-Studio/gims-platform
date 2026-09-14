import { useState, useMemo } from "react";
import type { BorrowingRequest, BorrowingStatus } from "../types";
import { INITIAL_BORROWINGS, INITIAL_ASSETS } from "../services/mock-data";
import type {
  CreateBorrowingFormValues,
  ApprovalFormValues,
  ReturnAssetFormValues,
} from "../schemas/asset-borrowing.schema";

export function useAssetBorrowings() {
  const [borrowings, setBorrowings] =
    useState<BorrowingRequest[]>(INITIAL_BORROWINGS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BorrowingStatus | "all">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredBorrowings = useMemo(() => {
    return borrowings.filter((req) => {
      const matchesSearch =
        search === "" ||
        req.request_number.toLowerCase().includes(search.toLowerCase()) ||
        req.asset_name.toLowerCase().includes(search.toLowerCase()) ||
        req.asset_code.toLowerCase().includes(search.toLowerCase()) ||
        req.borrower_name.toLowerCase().includes(search.toLowerCase()) ||
        req.borrower_department.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || req.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [borrowings, search, statusFilter]);

  const paginatedBorrowings = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBorrowings.slice(start, start + pageSize);
  }, [filteredBorrowings, page, pageSize]);

  const pendingApprovals = useMemo(() => {
    return borrowings.filter((b) => b.status === "pending");
  }, [borrowings]);

  const statistics = useMemo(() => {
    const total = borrowings.length;
    const active = borrowings.filter((b) => b.status === "borrowed").length;
    const pending = borrowings.filter((b) => b.status === "pending").length;
    const returned = borrowings.filter((b) => b.status === "returned").length;
    return { total, active, pending, returned };
  }, [borrowings]);

  const handleCreateBorrowing = (data: CreateBorrowingFormValues) => {
    const asset = INITIAL_ASSETS.find((a) => a.id === data.asset_id);
    const newId = `req-${Date.now()}`;
    const reqNum = `BRW-202608-000${borrowings.length + 1}`;

    const newRequest: BorrowingRequest = {
      id: newId,
      request_number: reqNum,
      asset_id: data.asset_id,
      asset_code: asset?.code ?? "AST-MOCK",
      asset_name: asset?.name ?? "Mock Asset",
      asset_category: asset?.category ?? "electronics",
      borrower_id: "emp-current",
      borrower_name: "Admin User",
      borrower_department: "IT & HRD",
      borrow_date: data.borrow_date,
      expected_return_date: data.expected_return_date,
      purpose: data.purpose,
      initial_condition_notes: data.initial_condition_notes,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    setBorrowings((prev) => [newRequest, ...prev]);
    return newRequest;
  };

  const handleApproveReject = (id: string, data: ApprovalFormValues) => {
    setBorrowings((prev) =>
      prev.map((req) => {
        if (req.id === id) {
          const newStatus: BorrowingStatus =
            data.status === "approved" ? "borrowed" : "rejected";
          return {
            ...req,
            status: newStatus,
            approver_name: "Admin User",
            approval_date: new Date().toISOString().split("T")[0],
            rejection_reason:
              data.status === "rejected" ? data.notes : undefined,
          };
        }
        return req;
      }),
    );
  };

  const handleReturnAsset = (id: string, data: ReturnAssetFormValues) => {
    setBorrowings((prev) =>
      prev.map((req) => {
        if (req.id === id) {
          return {
            ...req,
            status: "returned",
            actual_return_date: new Date().toISOString().split("T")[0],
            return_condition_notes: `[Condition: ${data.return_condition}] ${
              data.return_notes ?? ""
            }`,
          };
        }
        return req;
      }),
    );
  };

  const handleCancelRequest = (id: string) => {
    setBorrowings((prev) =>
      prev.map((req) =>
        req.id === id ? { ...req, status: "cancelled" } : req,
      ),
    );
  };

  const getBorrowingsByAssetId = (assetId: string): BorrowingRequest[] => {
    return borrowings.filter((b) => b.asset_id === assetId);
  };

  return {
    borrowings: paginatedBorrowings,
    allBorrowings: borrowings,
    pendingApprovals,
    totalCount: filteredBorrowings.length,
    search,
    setSearch: (val: string) => {
      setSearch(val);
      setPage(1);
    },
    statusFilter,
    setStatusFilter: (val: BorrowingStatus | "all") => {
      setStatusFilter(val);
      setPage(1);
    },
    page,
    setPage,
    pageSize,
    setPageSize,
    statistics,
    handleCreateBorrowing,
    handleApproveReject,
    handleReturnAsset,
    handleCancelRequest,
    getBorrowingsByAssetId,
  };
}
