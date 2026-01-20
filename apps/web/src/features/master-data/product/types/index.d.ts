// ============================================
// Product Module Types
// ============================================

// === ProductCategory ===
export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  parent_id?: string | null;
  parent?: ProductCategory | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductCategoryData {
  name: string;
  description?: string;
  parent_id?: string | null;
  is_active?: boolean;
}

export interface UpdateProductCategoryData {
  name?: string;
  description?: string;
  parent_id?: string | null;
  is_active?: boolean;
}

// === Category Tree Types ===
export interface CategoryTreeNode {
  id: string;
  name: string;
  description: string;
  parent_id?: string | null;
  product_count: number;
  children: CategoryTreeNode[];
  has_children: boolean;
  is_active: boolean;
  level: number;
}

export interface CategoryTreeParams {
  parent_id?: string;
  depth?: number;
  include_count?: boolean;
  only_active?: boolean;
}

// === ProductBrand ===
export interface ProductBrand {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductBrandData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateProductBrandData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// === ProductSegment ===
export interface ProductSegment {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductSegmentData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateProductSegmentData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// === ProductType ===
export interface ProductType {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductTypeData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateProductTypeData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// === UnitOfMeasure ===
export interface UnitOfMeasure {
  id: string;
  name: string;
  symbol: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUnitOfMeasureData {
  name: string;
  symbol: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateUnitOfMeasureData {
  name?: string;
  symbol?: string;
  description?: string;
  is_active?: boolean;
}

// === Packaging ===
export interface Packaging {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePackagingData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdatePackagingData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// === ProcurementType ===
export interface ProcurementType {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProcurementTypeData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateProcurementTypeData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

// === Product (Main Entity) ===
export type ProductStatus = "draft" | "pending" | "approved" | "rejected";

export interface ProductCategoryBasic {
  id: string;
  name: string;
}

export interface ProductBrandBasic {
  id: string;
  name: string;
}

export interface ProductSegmentBasic {
  id: string;
  name: string;
}

export interface ProductTypeBasic {
  id: string;
  name: string;
}

export interface UnitOfMeasureBasic {
  id: string;
  name: string;
  symbol: string;
}

export interface PackagingBasic {
  id: string;
  name: string;
}

export interface ProcurementTypeBasic {
  id: string;
  name: string;
}

export interface SupplierBasic {
  id: string;
  code: string;
  name: string;
}

export interface BusinessUnitBasic {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  image_url?: string | null;
  category_id?: string | null;
  category?: ProductCategoryBasic | null;
  brand_id?: string | null;
  brand?: ProductBrandBasic | null;
  segment_id?: string | null;
  segment?: ProductSegmentBasic | null;
  type_id?: string | null;
  type?: ProductTypeBasic | null;
  uom_id?: string | null;
  uom?: UnitOfMeasureBasic | null;
  packaging_id?: string | null;
  packaging?: PackagingBasic | null;
  procurement_type_id?: string | null;
  procurement_type?: ProcurementTypeBasic | null;
  supplier_id?: string | null;
  supplier?: SupplierBasic | null;
  business_unit_id?: string | null;
  business_unit?: BusinessUnitBasic | null;
  cost_price: number;
  selling_price: number;
  current_hpp: number;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  barcode: string;
  sku: string;
  weight: number;
  volume: number;
  notes: string;
  status: ProductStatus;
  is_approved: boolean;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  is_active: boolean;
  
  // Added fields
  manufacturer_part_number?: string | null;
  purchase_uom_id?: string | null;
  purchase_uom?: UnitOfMeasureBasic | null;
  purchase_uom_conversion: number;
  tax_type?: string | null;
  is_tax_inclusive: boolean;
  lead_time_days: number;

  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  code: string;
  name: string;
  description?: string;
  image_url?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  segment_id?: string | null;
  type_id?: string | null;
  uom_id?: string | null;
  packaging_id?: string | null;
  procurement_type_id?: string | null;
  supplier_id?: string | null;
  business_unit_id?: string | null;
  cost_price?: number;
  selling_price?: number;
  min_stock?: number;
  max_stock?: number;
  barcode?: string;
  sku?: string;
  weight?: number;
  volume?: number;
  notes?: string;
  manufacturer_part_number?: string;
  purchase_uom_id?: string | null;
  purchase_uom_conversion?: number;
  tax_type?: string;
  is_tax_inclusive?: boolean;
  lead_time_days?: number;
  is_active?: boolean;
}

export interface UpdateProductData {
  code?: string;
  name?: string;
  name?: string;
  description?: string;
  image_url?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  segment_id?: string | null;
  type_id?: string | null;
  uom_id?: string | null;
  packaging_id?: string | null;
  procurement_type_id?: string | null;
  supplier_id?: string | null;
  business_unit_id?: string | null;
  cost_price?: number;
  selling_price?: number;
  min_stock?: number;
  max_stock?: number;
  barcode?: string;
  sku?: string;
  weight?: number;
  volume?: number;
  notes?: string;
  manufacturer_part_number?: string;
  purchase_uom_id?: string | null;
  purchase_uom_conversion?: number;
  tax_type?: string;
  is_tax_inclusive?: boolean;
  lead_time_days?: number;
  is_active?: boolean;
}

export interface ApproveProductData {
  action: "approve" | "reject";
  reason?: string;
}

// === API Response Types ===
export interface ProductListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
  category_id?: string;
  brand_id?: string;
  segment_id?: string;
  type_id?: string;
  supplier_id?: string;
  status?: ProductStatus;
  is_approved?: boolean;
}

export interface LookupListParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: string;
  sort?: string; // Support for simple sort string if needed
}

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
    filters?: Record<string, unknown>;
  };
  error?: string;
}
