import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadSourceService } from "../services/lead-source-service";
import type { LeadSourceListParams, CreateLeadSourceData, UpdateLeadSourceData } from "../types";

const QUERY_KEY = "lead-sources";

export function useLeadSources(params?: LeadSourceListParams, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: [QUERY_KEY, params],
		queryFn: () => leadSourceService.list(params),
		enabled: options?.enabled ?? true,
	});
}
export function useLeadSourceById(id: string) { return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => leadSourceService.getById(id), enabled: !!id }); }
export function useCreateLeadSource() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: CreateLeadSourceData) => leadSourceService.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useUpdateLeadSource() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateLeadSourceData }) => leadSourceService.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useDeleteLeadSource() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => leadSourceService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
