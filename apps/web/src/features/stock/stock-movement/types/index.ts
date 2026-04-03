import { PaginationMeta } from "@/features/stock/inventory/types";

export type StockMovementType = "IN" | "OUT" | "ADJUST" | "TRANSFER";

export interface StockMovement {
  id: string;
  date: string; // ISO Date
  type: StockMovementType;
  
  ref_type: string;
  ref_id: string;
  ref_number: string;
  
  source: string;
  
  qty_in: number;
  qty_out: number;
  balance: number;
  cost: number;
  
  product_id: string;
  product?: {
    id: string;
    name: string;
    code: string;
    unit_of_measure?: {
      name: string;
      symbol: string;
    }
  };
  
  warehouse_id: string;
  warehouse?: {
    id: string;
    name: string;
  };
  
  created_by: string;
  creator?: {
    id: string;
    name: string;
  };

  journal_entry_id?: string;
  created_at: string;
}

export interface StockMovementFilter {
  page: number;
  per_page: number;
  search?: string;
  warehouse_id?: string;
  product_id?: string;
  type?: StockMovementType | "all";
  start_date?: string;
  end_date?: string;
}

export interface StockMovementResponse {
  data: StockMovement[];
  meta: {
    pagination: PaginationMeta;
  };
}

export interface CreateStockMovementRequest {
  type: StockMovementType;
  product_id: string;
  warehouse_id: string;
  target_warehouse_id?: string;
  quantity: number;
  reference_number?: string;
  description?: string;
}
