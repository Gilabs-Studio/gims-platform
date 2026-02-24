import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactService } from "../services/contact-service";
import { customerKeys } from "@/features/master-data/customer/hooks/use-customers";
import type { ContactListParams, CreateContactData, UpdateContactData } from "../types";

const QUERY_KEY = "crm-contacts";

export function useContacts(params?: ContactListParams) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => contactService.list(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useContactById(id: string) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => contactService.getById(id),
    enabled: !!id,
  });
}

export function useContactFormData(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [QUERY_KEY, "form-data"],
    queryFn: () => contactService.getFormData(),
    staleTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateContactData) => contactService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      // Refresh customer contacts_count in list and detail views
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactData }) =>
      contactService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      // Refresh customer contacts_count in list and detail views
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
