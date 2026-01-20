import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { soSourceService } from "../services/so-source-service";
import type { SOSourceListParams, CreateSOSourceData, UpdateSOSourceData } from "../types";

const QUERY_KEY = "so-sources";

export function useSOSources(params?: SOSourceListParams) { return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => soSourceService.list(params) }); }
export function useSOSourceById(id: string) { return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => soSourceService.getById(id), enabled: !!id }); }
export function useCreateSOSource() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: CreateSOSourceData) => soSourceService.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useUpdateSOSource() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateSOSourceData }) => soSourceService.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useDeleteSOSource() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => soSourceService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
