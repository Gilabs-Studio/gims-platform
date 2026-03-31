import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactRoleService } from "../services/contact-role-service";
import type { ContactRoleListParams, CreateContactRoleData, UpdateContactRoleData } from "../types";

const QUERY_KEY = "contact-roles";

const contactRoleKeys = {
	all: [QUERY_KEY] as const,
	list: (params?: ContactRoleListParams) => [...contactRoleKeys.all, "list", params ?? {}] as const,
	detail: (id: string) => [...contactRoleKeys.all, "detail", id] as const,
};

export function useContactRoles(params?: ContactRoleListParams, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: contactRoleKeys.list(params),
		queryFn: () => contactRoleService.list(params),
		staleTime: 5 * 60 * 1000,
		enabled: options?.enabled ?? true,
	});
}

export function useContactRoleById(id: string, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: contactRoleKeys.detail(id),
		queryFn: () => contactRoleService.getById(id),
		enabled: (options?.enabled ?? true) && !!id,
	});
}

export function useCreateContactRole() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateContactRoleData) => contactRoleService.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: contactRoleKeys.all }),
	});
}

export function useUpdateContactRole() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateContactRoleData }) => contactRoleService.update(id, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: contactRoleKeys.all }),
	});
}

export function useDeleteContactRole() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => contactRoleService.delete(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: contactRoleKeys.all }),
	});
}
