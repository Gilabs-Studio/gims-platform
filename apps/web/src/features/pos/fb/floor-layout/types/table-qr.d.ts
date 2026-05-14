// Types for POS table QR token management

export interface TableQRToken {
  id: string;
  floor_plan_id: string;
  table_object_id: string;
  table_label: string;
  token: string;
  is_active: boolean;
  created_at: string;
  /** Public self-order URL for this table. Populated by the backend using the request origin. */
  self_order_url?: string;
  /** Base64 data URI (data:image/png;base64,...) for inline QR display and printing. */
  qr_base64?: string;
}

export interface GenerateTableTokenData {
  table_label: string;
}

export interface TableQRTokenSingleResponse {
  success: boolean;
  data: TableQRToken;
}

export interface TableQRTokenListResponse {
  success: boolean;
  data: TableQRToken[];
}
