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
export interface BatchDepreciationPreviewLine {
  asset_id: string;
  asset_code: string;
  asset_name: string;
  period: string;
  method: "SL" | "DB" | "NONE";
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value: number;
  status: "new" | "already_depreciated" | "skipped";
  error?: string;
}

export interface BatchDepreciationPreviewResponse {
  preview_lines: BatchDepreciationPreviewLine[];
  total_lines: number;
  successful: number;
  failed: number;
  skipped: number;
  total_depreciation_amount: number;
  errors: string[];
}

export interface BatchDepreciationRunResponse {
  journal_ids: string[];
  total_assets: number;
  successful: number;
  failed: number;
  skipped: number;
  total_amount: number;
  errors: string[];
  completed_at: string;
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
