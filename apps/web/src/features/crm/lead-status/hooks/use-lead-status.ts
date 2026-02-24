import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadStatusService } from "../services/lead-status-service";
import type { LeadStatusListParams, CreateLeadStatusData, UpdateLeadStatusData } from "../types";

const QUERY_KEY = "lead-statuses";

export function useLeadStatuses(params?: LeadStatusListParams) { return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => leadStatusService.list(params) }); }
export function useLeadStatusById(id: string) { return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => leadStatusService.getById(id), enabled: !!id }); }
export function useCreateLeadStatus() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: CreateLeadStatusData) => leadStatusService.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useUpdateLeadStatus() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateLeadStatusData }) => leadStatusService.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useDeleteLeadStatus() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => leadStatusService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
