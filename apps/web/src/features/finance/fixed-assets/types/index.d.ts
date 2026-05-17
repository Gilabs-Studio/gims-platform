// API Response Types
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
  };
  error?: string;
  timestamp?: string;
  request_id?: string;
}

// Batch Depreciation Types
export interface BatchDepreciationPreviewItem {
  asset_id: string;
  asset_code: string;
  asset_name: string;
  currency_code?: string;
  period?: string;
  method?: "SL" | "DB" | "NONE";
  depreciation_amount?: number;
  accumulated_depreciation?: number;
  book_value?: number;
  opening_book_value?: number;
  projected_book_value?: number;
  eligible?: boolean;
  status?: "new" | "already_depreciated" | "skipped";
  skip_reason?: string;
  error?: string;
}

export interface BatchDepreciationPreviewResponse {
  items?: BatchDepreciationPreviewItem[];
  preview_lines?: BatchDepreciationPreviewItem[];
  currency_code?: string;
  total_assets?: number;
  total_lines?: number;
  eligible?: number;
  successful?: number;
  failed?: number;
  skipped?: number;
  total_depreciation_amount?: number;
  total_amount?: number;
  errors?: string[];
}

export interface BatchDepreciationRunResponse {
  journal_ids?: string[];
  currency_code?: string;
  total_assets?: number;
  successful?: number;
  processed?: number;
  posted?: number;
  failed?: number;
  skipped?: number;
  total_amount?: number;
  errors?: string[];
  completed_at?: string;
  items?: Array<{
    asset_id?: string;
    asset_code?: string;
    asset_name?: string;
    currency_code?: string;
    amount?: number;
    status?: string;
    reason?: string;
    journal_entry_id?: string;
  }>;
}

export interface DepreciationScheduleItem {
  asset_id: string;
  asset_code: string;
  asset_name: string;
  category_id: string;
  category_name?: string;
  location_id: string;
  location_name?: string;
  method: string;
  period: string;
  acquisition_cost: number;
  accumulated_depreciation: number;
  net_book_value: number;
  depreciation_amount: number;
  posted: boolean;
  highlighted: boolean;
  journal_entry_id?: string | null;
  status: string;
  skip_reason?: string;
}

export interface DepreciationScheduleResponse {
  period: string;
  total_assets: number;
  posted: number;
  pending: number;
  total_amount: number;
  items: DepreciationScheduleItem[];
}

export interface DepreciationHistoryItem {
  depreciation_id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  period: string;
  amount: number;
  posted: boolean;
  journal_entry_id?: string | null;
  created_at: string;
}

export interface DepreciationHistoryResponse {
  period: string;
  total: number;
  posted: number;
  pending: number;
  items: DepreciationHistoryItem[];
}

export interface RunDepreciationRequest {
  period: string;
  asset_id?: string;
  category_id?: string;
  location_id?: string;
}

// Disposal Types
export interface DisposalPreviewResponse {
  asset_id: string;
  proceeds_amount: number;
  book_value: number;
  gain_loss_amount: number;
  suggested_account_id: string;
  journal_lines: JournalLinePreview[];
}

export interface JournalLinePreview {
  account: string;
  debit?: number;
  credit?: number;
  description: string;
}

export interface DisposalRequest {
  asset_id: string;
  proceeds_amount: number;
  disposal_account_id?: string;
  bank_account_id?: string;
  disposal_date: string;
  description?: string;
}

// Revaluation Types
export interface RevaluationRequest {
  new_value: number;
  revaluation_date: string;
  description?: string;
}

export interface RevaluationTransaction {
  id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  type: "revalue";
  amount: number;
  revaluation_delta: number;
  status: "draft" | "pending" | "approved" | "rejected";
  effective_date: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

// Asset for disposal/revaluation selection
export interface AssetForTransaction {
  id: string;
  code: string;
  name: string;
  category: string;
  acquisition_cost: number;
  accumulated_depreciation: number;
  book_value: number;
  status: string;
}
