import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activityTypeService } from "../services/activity-type-service";
import type { ActivityTypeListParams, CreateActivityTypeData, UpdateActivityTypeData } from "../types";

const QUERY_KEY = "activity-types";

export function useActivityTypes(params?: ActivityTypeListParams, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: [QUERY_KEY, params],
		queryFn: () => activityTypeService.list(params),
		enabled: options?.enabled ?? true,
	});
}
export function useActivityTypeById(id: string) { return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => activityTypeService.getById(id), enabled: !!id }); }
export function useCreateActivityType() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: CreateActivityTypeData) => activityTypeService.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useUpdateActivityType() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateActivityTypeData }) => activityTypeService.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useDeleteActivityType() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => activityTypeService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
