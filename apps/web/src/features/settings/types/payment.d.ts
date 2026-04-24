// Payment Transaction Types

export type PaymentProvider = "xendit" | "midtrans" | "internal";

export type PaymentMethod =
  | "card"
  | "bank_transfer"
  | "ewallet"
  | "dana"
  | "ovo"
  | "gcash"
  | "coupon";

export type PaymentTransactionStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "canceled";

export interface PaymentTransaction {
  id: string;
  provider: PaymentProvider;
  status: PaymentTransactionStatus;
  payment_method?: PaymentMethod;
  amount_idr: number;
  provider_invoice_id?: string;
  receipt_url?: string;
  invoice_url?: string;
  description?: string;
  paid_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface PaymentHistoryListResponse {
  success: boolean;
  data: {
    data: PaymentTransaction[];
  };
  meta?: {
    pagination?: {
      page: number;
      per_page: number;
      total: number;
      total_pages: number;
    };
  };
}
