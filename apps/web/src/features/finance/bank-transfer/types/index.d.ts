export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
  next_page?: number | null;
  prev_page?: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
    filters?: Record<string, unknown>;
    sort?: { field: string; order: string };
  };
  error?: string;
}

export type BankTransferStatus = "pending" | "completed" | "cancelled";

export interface BankTransfer {
  id: string;
  company_id: string;
  transfer_number: string;
  from_bank_account_id: string;
  to_bank_account_id: string;
  amount: number;
  date: string;
  reference: string;
  description: string;
  status: BankTransferStatus;
  journal_entry_id?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListBankTransfersParams {
  page?: number;
  per_page?: number;
  company_id?: string;
  from_bank_account_id?: string;
  to_bank_account_id?: string;
  status?: BankTransferStatus;
  date_from?: string;
  date_to?: string;
  search?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface CreateBankTransferInput {
  company_id: string;
  from_bank_account_id: string;
  to_bank_account_id: string;
  amount: number;
  date: string;
  reference?: string;
  description?: string;
}

export interface CancelBankTransferInput {
  reason: string;
}
