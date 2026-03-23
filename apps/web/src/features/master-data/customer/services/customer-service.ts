import { apiClient } from "@/lib/api-client";
import type {
  CustomerType,
  CreateCustomerTypeData,
  UpdateCustomerTypeData,
  Customer,
  CreateCustomerData,
  UpdateCustomerData,
  CreateCustomerBankData,
  UpdateCustomerBankData,
  CustomerBank,
  CustomerListParams,
  CustomerListResponse,
  CustomerSingleResponse,
  CustomerFormDataResponse,
  ListParams,
} from "../types";

const BASE_PATH = "/customer";

// ============================================
// Customer Type Service
// ============================================
export const customerTypeService = {
  list: async (params?: ListParams) => {
    const response = await apiClient.get<CustomerListResponse<CustomerType>>(
      `${BASE_PATH}/customer-types`,
      { params },
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<CustomerSingleResponse<CustomerType>>(
      `${BASE_PATH}/customer-types/${id}`,
    );
    return response.data;
  },

  create: async (data: CreateCustomerTypeData) => {
    const response = await apiClient.post<CustomerSingleResponse<CustomerType>>(
      `${BASE_PATH}/customer-types`,
      data,
    );
    return response.data;
  },

  update: async (id: string, data: UpdateCustomerTypeData) => {
    const response = await apiClient.put<CustomerSingleResponse<CustomerType>>(
      `${BASE_PATH}/customer-types/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<CustomerSingleResponse<null>>(
      `${BASE_PATH}/customer-types/${id}`,
    );
    return response.data;
  },
};

// ============================================
// Customer Service
// ============================================
export const customerService = {
  list: async (params?: CustomerListParams) => {
    const response = await apiClient.get<CustomerListResponse<Customer>>(
      `${BASE_PATH}/customers`,
      { params },
    );
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get<CustomerSingleResponse<Customer>>(
      `${BASE_PATH}/customers/${id}`,
    );
    return response.data;
  },

  create: async (data: CreateCustomerData) => {
    const response = await apiClient.post<CustomerSingleResponse<Customer>>(
      `${BASE_PATH}/customers`,
      data,
    );
    return response.data;
  },

  update: async (id: string, data: UpdateCustomerData) => {
    const response = await apiClient.put<CustomerSingleResponse<Customer>>(
      `${BASE_PATH}/customers/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete<CustomerSingleResponse<null>>(
      `${BASE_PATH}/customers/${id}`,
    );
    return response.data;
  },

  // Form data (dropdown options)
  getFormData: async () => {
    const response = await apiClient.get<
      CustomerSingleResponse<CustomerFormDataResponse>
    >(`${BASE_PATH}/customers/form-data`);
    return response.data;
  },
  // Bank account operations
  addBankAccount: async (customerId: string, data: CreateCustomerBankData) => {
    const response = await apiClient.post<
      CustomerSingleResponse<CustomerBank>
    >(`${BASE_PATH}/customers/${customerId}/bank-accounts`, data);
    return response.data;
  },

  updateBankAccount: async (
    customerId: string,
    bankId: string,
    data: UpdateCustomerBankData,
  ) => {
    const response = await apiClient.put<
      CustomerSingleResponse<CustomerBank>
    >(`${BASE_PATH}/customers/${customerId}/bank-accounts/${bankId}`, data);
    return response.data;
  },

  deleteBankAccount: async (customerId: string, bankId: string) => {
    const response = await apiClient.delete<CustomerSingleResponse<null>>(
      `${BASE_PATH}/customers/${customerId}/bank-accounts/${bankId}`,
    );
    return response.data;
  },
};
