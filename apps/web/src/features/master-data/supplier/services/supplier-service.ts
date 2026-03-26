import { apiClient } from "@/lib/api-client";
import type {
  SupplierType,
  Bank,
  Supplier,
  SupplierContact,
  SupplierBank,
  CreateSupplierTypeData,
  UpdateSupplierTypeData,
  CreateBankData,
  UpdateBankData,
  CreateSupplierData,
  UpdateSupplierData,
  ApproveSupplierData,
  CreateContactData,
  UpdateContactData,
  CreateSupplierBankData,
  UpdateSupplierBankData,
  ListParams,
  SupplierListParams,
  SupplierListResponse,
  SupplierSingleResponse,
} from "../types";

const BASE_PATH = "/supplier";

function normalizeSupplier(supplier: Supplier): Supplier {
  return {
    ...supplier,
    contacts: supplier.contacts ?? supplier.phone_numbers ?? [],
  };
}

function normalizeSupplierList(payload: SupplierListResponse<Supplier>): SupplierListResponse<Supplier> {
  payload.data = payload.data.map(normalizeSupplier);
  return payload;
}

function normalizeSupplierSingle(payload: SupplierSingleResponse<Supplier>): SupplierSingleResponse<Supplier> {
  payload.data = normalizeSupplier(payload.data);
  return payload;
}

// ============================================
// Supplier Type Service
// ============================================

export const supplierTypeService = {
  async list(
    params?: ListParams
  ): Promise<SupplierListResponse<SupplierType>> {
    const response = await apiClient.get<SupplierListResponse<SupplierType>>(
      `${BASE_PATH}/supplier-types`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<SupplierSingleResponse<SupplierType>> {
    const response = await apiClient.get<SupplierSingleResponse<SupplierType>>(
      `${BASE_PATH}/supplier-types/${id}`
    );
    return response.data;
  },

  async create(
    data: CreateSupplierTypeData
  ): Promise<SupplierSingleResponse<SupplierType>> {
    const response = await apiClient.post<SupplierSingleResponse<SupplierType>>(
      `${BASE_PATH}/supplier-types`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateSupplierTypeData
  ): Promise<SupplierSingleResponse<SupplierType>> {
    const response = await apiClient.put<SupplierSingleResponse<SupplierType>>(
      `${BASE_PATH}/supplier-types/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<SupplierSingleResponse<null>> {
    const response = await apiClient.delete<SupplierSingleResponse<null>>(
      `${BASE_PATH}/supplier-types/${id}`
    );
    return response.data;
  },
};

// ============================================
// Bank Service
// ============================================

export const bankService = {
  async list(params?: ListParams): Promise<SupplierListResponse<Bank>> {
    const response = await apiClient.get<SupplierListResponse<Bank>>(
      `${BASE_PATH}/banks`,
      { params }
    );
    return response.data;
  },

  async getById(id: string): Promise<SupplierSingleResponse<Bank>> {
    const response = await apiClient.get<SupplierSingleResponse<Bank>>(
      `${BASE_PATH}/banks/${id}`
    );
    return response.data;
  },

  async create(data: CreateBankData): Promise<SupplierSingleResponse<Bank>> {
    const response = await apiClient.post<SupplierSingleResponse<Bank>>(
      `${BASE_PATH}/banks`,
      data
    );
    return response.data;
  },

  async update(
    id: string,
    data: UpdateBankData
  ): Promise<SupplierSingleResponse<Bank>> {
    const response = await apiClient.put<SupplierSingleResponse<Bank>>(
      `${BASE_PATH}/banks/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<SupplierSingleResponse<null>> {
    const response = await apiClient.delete<SupplierSingleResponse<null>>(
      `${BASE_PATH}/banks/${id}`
    );
    return response.data;
  },
};

// ============================================
// Supplier Service
// ============================================

export const supplierService = {
  async list(
    params?: SupplierListParams
  ): Promise<SupplierListResponse<Supplier>> {
    const response = await apiClient.get<SupplierListResponse<Supplier>>(
      `${BASE_PATH}/suppliers`,
      { params }
    );
    return normalizeSupplierList(response.data);
  },

  async getById(id: string): Promise<SupplierSingleResponse<Supplier>> {
    const response = await apiClient.get<SupplierSingleResponse<Supplier>>(
      `${BASE_PATH}/suppliers/${id}`
    );
    return normalizeSupplierSingle(response.data);
  },

  async create(
    data: CreateSupplierData
  ): Promise<SupplierSingleResponse<Supplier>> {
    const payload = {
      ...data,
      contacts: data.contacts,
    };
    const response = await apiClient.post<SupplierSingleResponse<Supplier>>(
      `${BASE_PATH}/suppliers`,
      payload
    );
    return normalizeSupplierSingle(response.data);
  },

  async update(
    id: string,
    data: UpdateSupplierData
  ): Promise<SupplierSingleResponse<Supplier>> {
    const response = await apiClient.put<SupplierSingleResponse<Supplier>>(
      `${BASE_PATH}/suppliers/${id}`,
      data
    );
    return response.data;
  },

  async delete(id: string): Promise<SupplierSingleResponse<null>> {
    const response = await apiClient.delete<SupplierSingleResponse<null>>(
      `${BASE_PATH}/suppliers/${id}`
    );
    return response.data;
  },

  // Approval workflow
  async submit(id: string): Promise<SupplierSingleResponse<Supplier>> {
    const response = await apiClient.post<SupplierSingleResponse<Supplier>>(
      `${BASE_PATH}/suppliers/${id}/submit`
    );
    return response.data;
  },

  async approve(
    id: string,
    data: ApproveSupplierData
  ): Promise<SupplierSingleResponse<Supplier>> {
    const response = await apiClient.post<SupplierSingleResponse<Supplier>>(
      `${BASE_PATH}/suppliers/${id}/approve`,
      data
    );
    return response.data;
  },

  // Nested contacts
  async addContact(
    supplierId: string,
    data: CreateContactData
  ): Promise<SupplierSingleResponse<SupplierContact>> {
    const response = await apiClient.post<
      SupplierSingleResponse<SupplierContact>
    >(`${BASE_PATH}/suppliers/${supplierId}/contacts`, data);
    return response.data;
  },

  async updateContact(
    supplierId: string,
    contactId: string,
    data: UpdateContactData
  ): Promise<SupplierSingleResponse<SupplierContact>> {
    const response = await apiClient.put<
      SupplierSingleResponse<SupplierContact>
    >(`${BASE_PATH}/suppliers/${supplierId}/contacts/${contactId}`, data);
    return response.data;
  },

  async deleteContact(
    supplierId: string,
    contactId: string
  ): Promise<SupplierSingleResponse<null>> {
    const response = await apiClient.delete<SupplierSingleResponse<null>>(
      `${BASE_PATH}/suppliers/${supplierId}/contacts/${contactId}`
    );
    return response.data;
  },

  // Nested bank accounts
  async addBankAccount(
    supplierId: string,
    data: CreateSupplierBankData
  ): Promise<SupplierSingleResponse<SupplierBank>> {
    const response = await apiClient.post<
      SupplierSingleResponse<SupplierBank>
    >(`${BASE_PATH}/suppliers/${supplierId}/bank-accounts`, data);
    return response.data;
  },

  async updateBankAccount(
    supplierId: string,
    bankId: string,
    data: UpdateSupplierBankData
  ): Promise<SupplierSingleResponse<SupplierBank>> {
    const response = await apiClient.put<SupplierSingleResponse<SupplierBank>>(
      `${BASE_PATH}/suppliers/${supplierId}/bank-accounts/${bankId}`,
      data
    );
    return response.data;
  },

  async deleteBankAccount(
    supplierId: string,
    bankId: string
  ): Promise<SupplierSingleResponse<null>> {
    const response = await apiClient.delete<SupplierSingleResponse<null>>(
      `${BASE_PATH}/suppliers/${supplierId}/bank-accounts/${bankId}`
    );
    return response.data;
  },
};
