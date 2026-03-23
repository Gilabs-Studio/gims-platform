
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface GLTransactionRow {
  id: string;
  journal_id: string;
  entry_date: string;
  description: string;
  memo: string;
  reference_type: string | null;
  reference_id: string | null;
  reference_code: string;
  debit: number;
  credit: number;
  running_balance: number;
}

export interface GeneralLedgerAccount {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  transactions: GLTransactionRow[];
}

export interface GeneralLedgerResponse {
  start_date: string;
  end_date: string;
  accounts: GeneralLedgerAccount[];
}
