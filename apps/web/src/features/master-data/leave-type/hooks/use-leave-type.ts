import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leaveTypeService } from "../services/leave-type-service";
import type { LeaveTypeListParams, CreateLeaveTypeData, UpdateLeaveTypeData } from "../types";

const QUERY_KEY = "leave-types";

export function useLeaveTypes(params?: LeaveTypeListParams) { return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => leaveTypeService.list(params) }); }
export function useLeaveTypeById(id: string) { return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => leaveTypeService.getById(id), enabled: !!id }); }
export function useCreateLeaveType() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: CreateLeaveTypeData) => leaveTypeService.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useUpdateLeaveType() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateLeaveTypeData }) => leaveTypeService.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useDeleteLeaveType() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => leaveTypeService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
