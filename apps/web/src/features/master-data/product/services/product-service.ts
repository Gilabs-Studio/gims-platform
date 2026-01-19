import { apiClient } from "@/lib/api-client";
import type {
  ApiResponse,
  ProductCategory,
  CreateProductCategoryData,
  UpdateProductCategoryData,
  ProductBrand,
  CreateProductBrandData,
  UpdateProductBrandData,
  ProductSegment,
  CreateProductSegmentData,
  UpdateProductSegmentData,
  ProductType,
  CreateProductTypeData,
  UpdateProductTypeData,
  UnitOfMeasure,
  CreateUnitOfMeasureData,
  UpdateUnitOfMeasureData,
  Packaging,
  CreatePackagingData,
  UpdatePackagingData,
  ProcurementType,
  CreateProcurementTypeData,
  UpdateProcurementTypeData,
  Product,
  CreateProductData,
  UpdateProductData,
  ApproveProductData,
  ProductListParams,
  LookupListParams,
} from "../types";


const BASE_URL = "/product";

// ============================================
// ProductCategory Service
// ============================================
export const productCategoryService = {
  list: async (params?: LookupListParams): Promise<ApiResponse<ProductCategory[]>> => {
    const response = await apiClient.get<ApiResponse<ProductCategory[]>>(
      `${BASE_URL}/product-categories`,
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<ProductCategory>> => {
    const response = await apiClient.get<ApiResponse<ProductCategory>>(
      `${BASE_URL}/product-categories/${id}`
    );
    return response.data;
  },

  create: async (data: CreateProductCategoryData): Promise<ApiResponse<ProductCategory>> => {
    const response = await apiClient.post<ApiResponse<ProductCategory>>(
      `${BASE_URL}/product-categories`,
      data
    );
    return response.data;
  },

  update: async (id: string, data: UpdateProductCategoryData): Promise<ApiResponse<ProductCategory>> => {
    const response = await apiClient.put<ApiResponse<ProductCategory>>(
      `${BASE_URL}/product-categories/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `${BASE_URL}/product-categories/${id}`
    );
    return response.data;
  },
};

// ============================================
// ProductBrand Service
// ============================================
export const productBrandService = {
  list: async (params?: LookupListParams): Promise<ApiResponse<ProductBrand[]>> => {
    const response = await apiClient.get<ApiResponse<ProductBrand[]>>(
      `${BASE_URL}/product-brands`,
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<ProductBrand>> => {
    const response = await apiClient.get<ApiResponse<ProductBrand>>(
      `${BASE_URL}/product-brands/${id}`
    );
    return response.data;
  },

  create: async (data: CreateProductBrandData): Promise<ApiResponse<ProductBrand>> => {
    const response = await apiClient.post<ApiResponse<ProductBrand>>(
      `${BASE_URL}/product-brands`,
      data
    );
    return response.data;
  },

  update: async (id: string, data: UpdateProductBrandData): Promise<ApiResponse<ProductBrand>> => {
    const response = await apiClient.put<ApiResponse<ProductBrand>>(
      `${BASE_URL}/product-brands/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `${BASE_URL}/product-brands/${id}`
    );
    return response.data;
  },
};

// ============================================
// ProductSegment Service
// ============================================
export const productSegmentService = {
  list: async (params?: LookupListParams): Promise<ApiResponse<ProductSegment[]>> => {
    const response = await apiClient.get<ApiResponse<ProductSegment[]>>(
      `${BASE_URL}/product-segments`,
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<ProductSegment>> => {
    const response = await apiClient.get<ApiResponse<ProductSegment>>(
      `${BASE_URL}/product-segments/${id}`
    );
    return response.data;
  },

  create: async (data: CreateProductSegmentData): Promise<ApiResponse<ProductSegment>> => {
    const response = await apiClient.post<ApiResponse<ProductSegment>>(
      `${BASE_URL}/product-segments`,
      data
    );
    return response.data;
  },

  update: async (id: string, data: UpdateProductSegmentData): Promise<ApiResponse<ProductSegment>> => {
    const response = await apiClient.put<ApiResponse<ProductSegment>>(
      `${BASE_URL}/product-segments/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `${BASE_URL}/product-segments/${id}`
    );
    return response.data;
  },
};

// ============================================
// ProductType Service
// ============================================
export const productTypeService = {
  list: async (params?: LookupListParams): Promise<ApiResponse<ProductType[]>> => {
    const response = await apiClient.get<ApiResponse<ProductType[]>>(
      `${BASE_URL}/product-types`,
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<ProductType>> => {
    const response = await apiClient.get<ApiResponse<ProductType>>(
      `${BASE_URL}/product-types/${id}`
    );
    return response.data;
  },

  create: async (data: CreateProductTypeData): Promise<ApiResponse<ProductType>> => {
    const response = await apiClient.post<ApiResponse<ProductType>>(
      `${BASE_URL}/product-types`,
      data
    );
    return response.data;
  },

  update: async (id: string, data: UpdateProductTypeData): Promise<ApiResponse<ProductType>> => {
    const response = await apiClient.put<ApiResponse<ProductType>>(
      `${BASE_URL}/product-types/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `${BASE_URL}/product-types/${id}`
    );
    return response.data;
  },
};

// ============================================
// UnitOfMeasure Service
// ============================================
export const unitOfMeasureService = {
  list: async (params?: LookupListParams): Promise<ApiResponse<UnitOfMeasure[]>> => {
    const response = await apiClient.get<ApiResponse<UnitOfMeasure[]>>(
      `${BASE_URL}/units-of-measure`,
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<UnitOfMeasure>> => {
    const response = await apiClient.get<ApiResponse<UnitOfMeasure>>(
      `${BASE_URL}/units-of-measure/${id}`
    );
    return response.data;
  },

  create: async (data: CreateUnitOfMeasureData): Promise<ApiResponse<UnitOfMeasure>> => {
    const response = await apiClient.post<ApiResponse<UnitOfMeasure>>(
      `${BASE_URL}/units-of-measure`,
      data
    );
    return response.data;
  },

  update: async (id: string, data: UpdateUnitOfMeasureData): Promise<ApiResponse<UnitOfMeasure>> => {
    const response = await apiClient.put<ApiResponse<UnitOfMeasure>>(
      `${BASE_URL}/units-of-measure/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `${BASE_URL}/units-of-measure/${id}`
    );
    return response.data;
  },
};

// ============================================
// Packaging Service
// ============================================
export const packagingService = {
  list: async (params?: LookupListParams): Promise<ApiResponse<Packaging[]>> => {
    const response = await apiClient.get<ApiResponse<Packaging[]>>(
      `${BASE_URL}/packagings`,
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Packaging>> => {
    const response = await apiClient.get<ApiResponse<Packaging>>(
      `${BASE_URL}/packagings/${id}`
    );
    return response.data;
  },

  create: async (data: CreatePackagingData): Promise<ApiResponse<Packaging>> => {
    const response = await apiClient.post<ApiResponse<Packaging>>(
      `${BASE_URL}/packagings`,
      data
    );
    return response.data;
  },

  update: async (id: string, data: UpdatePackagingData): Promise<ApiResponse<Packaging>> => {
    const response = await apiClient.put<ApiResponse<Packaging>>(
      `${BASE_URL}/packagings/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `${BASE_URL}/packagings/${id}`
    );
    return response.data;
  },
};

// ============================================
// ProcurementType Service
// ============================================
export const procurementTypeService = {
  list: async (params?: LookupListParams): Promise<ApiResponse<ProcurementType[]>> => {
    const response = await apiClient.get<ApiResponse<ProcurementType[]>>(
      `${BASE_URL}/procurement-types`,
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<ProcurementType>> => {
    const response = await apiClient.get<ApiResponse<ProcurementType>>(
      `${BASE_URL}/procurement-types/${id}`
    );
    return response.data;
  },

  create: async (data: CreateProcurementTypeData): Promise<ApiResponse<ProcurementType>> => {
    const response = await apiClient.post<ApiResponse<ProcurementType>>(
      `${BASE_URL}/procurement-types`,
      data
    );
    return response.data;
  },

  update: async (id: string, data: UpdateProcurementTypeData): Promise<ApiResponse<ProcurementType>> => {
    const response = await apiClient.put<ApiResponse<ProcurementType>>(
      `${BASE_URL}/procurement-types/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `${BASE_URL}/procurement-types/${id}`
    );
    return response.data;
  },
};

// ============================================
// Product Service (Main Entity)
// ============================================
export const productService = {
  list: async (params?: ProductListParams): Promise<ApiResponse<Product[]>> => {
    const response = await apiClient.get<ApiResponse<Product[]>>(
      `${BASE_URL}/products`,
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<Product>> => {
    const response = await apiClient.get<ApiResponse<Product>>(
      `${BASE_URL}/products/${id}`
    );
    return response.data;
  },

  create: async (data: CreateProductData): Promise<ApiResponse<Product>> => {
    const response = await apiClient.post<ApiResponse<Product>>(
      `${BASE_URL}/products`,
      data
    );
    return response.data;
  },

  update: async (id: string, data: UpdateProductData): Promise<ApiResponse<Product>> => {
    const response = await apiClient.put<ApiResponse<Product>>(
      `${BASE_URL}/products/${id}`,
      data
    );
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(
      `${BASE_URL}/products/${id}`
    );
    return response.data;
  },

  submit: async (id: string): Promise<ApiResponse<Product>> => {
    const response = await apiClient.post<ApiResponse<Product>>(
      `${BASE_URL}/products/${id}/submit`
    );
    return response.data;
  },

  approve: async (id: string, data: ApproveProductData): Promise<ApiResponse<Product>> => {
    const response = await apiClient.post<ApiResponse<Product>>(
      `${BASE_URL}/products/${id}/approve`,
      data
    );
    return response.data;
  },
};
