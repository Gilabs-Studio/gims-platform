import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contactRoleService } from "../services/contact-role-service";
import type { ContactRoleListParams, CreateContactRoleData, UpdateContactRoleData } from "../types";

const QUERY_KEY = "contact-roles";

export function useContactRoles(params?: ContactRoleListParams) { return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => contactRoleService.list(params) }); }
export function useContactRoleById(id: string) { return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => contactRoleService.getById(id), enabled: !!id }); }
export function useCreateContactRole() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: CreateContactRoleData) => contactRoleService.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useUpdateContactRole() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateContactRoleData }) => contactRoleService.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useDeleteContactRole() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => contactRoleService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
