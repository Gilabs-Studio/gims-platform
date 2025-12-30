/**
 * Menu Management Types
 *
 * Type definitions for menu management feature based on API documentation.
 */

export interface Menu {
  id: number;
  name: string;
  code: string;
  url_path: string;
  icon: string;
  order_no: number;
  is_active: boolean;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  children?: Menu[];
}

export interface MenuListResponse {
  data: Menu[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
    search: {
      search: string;
      searchBy: string;
    };
    searchable_columns: {
      string_columns: string[];
      numeric_columns: string[];
    };
    sort: {
      sort_by: string;
      sort_order: "asc" | "desc";
    };
    sortable_columns: {
      available_fields: string[];
    };
    filter: {
      start_date: string;
      end_date: string;
    };
  };
}

export interface MenuResponse {
  data: Menu;
  message?: string;
}

export interface MenuStatsResponse {
  data: {
    total: number;
  };
  message: string;
}

export interface CreateMenuRequest {
  name: string;
  code: string;
  url_path: string;
  icon: string;
  order_no: number;
  is_active: boolean;
  parent_id?: number | null;
}

export interface UpdateMenuRequest {
  name?: string;
  code?: string;
  url_path?: string;
  icon?: string;
  order_no?: number;
  is_active?: boolean;
  parent_id?: number | null;
}
