import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { contactService } from "../services/contact-service";
import { customerKeys } from "@/features/master-data/customer/hooks/use-customers";
import type { Contact, ContactListParams, CreateContactData, UpdateContactData } from "../types";

const QUERY_KEY = "crm-contacts";
type ContactListResult = Awaited<ReturnType<typeof contactService.list>>;

function updateListCaches(
  qc: ReturnType<typeof useQueryClient>,
  updater: (contacts: Contact[]) => Contact[]
) {
  const queries = qc.getQueryCache().findAll({ queryKey: [QUERY_KEY] });

  queries.forEach((query) => {
    const key = query.queryKey;
    if (key.length !== 2) {
      return;
    }

    const params = key[1];
    if (typeof params !== "object" || params === null || Array.isArray(params)) {
      return;
    }

    qc.setQueryData<ContactListResult>(key, (prev) => {
      if (!prev?.data) {
        return prev;
      }

      return {
        ...prev,
        data: updater(prev.data),
      };
    });
  });
}

export function useContacts(
  params?: ContactListParams,
  options?: Omit<UseQueryOptions<ContactListResult, Error>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: [QUERY_KEY, params],
    queryFn: () => contactService.list(params),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
    ...options,
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
    onSuccess: (result) => {
      const created = result.data;
      if (created) {
        updateListCaches(qc, (contacts) => {
          const next = [...contacts, created];
          return next.sort((a, b) => a.name.localeCompare(b.name));
        });
      }

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
    onSuccess: (result, variables) => {
      const updated = result.data;
      if (updated) {
        updateListCaches(qc, (contacts) =>
          contacts.map((contact) =>
            contact.id === variables.id ? { ...contact, ...updated } : contact
          )
        );
      }

      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactService.delete(id),
    onSuccess: (_, id) => {
      updateListCaches(qc, (contacts) => contacts.filter((contact) => contact.id !== id));
      qc.invalidateQueries({ queryKey: [QUERY_KEY] });
      // Refresh customer contacts_count in list and detail views
      qc.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
