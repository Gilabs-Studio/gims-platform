import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pipelineStageService } from "../services/pipeline-stage-service";
import type { PipelineStageListParams, CreatePipelineStageData, UpdatePipelineStageData } from "../types";

const QUERY_KEY = "pipeline-stages";

export function usePipelineStages(params?: PipelineStageListParams) { return useQuery({ queryKey: [QUERY_KEY, params], queryFn: () => pipelineStageService.list(params) }); }
export function usePipelineStageById(id: string) { return useQuery({ queryKey: [QUERY_KEY, id], queryFn: () => pipelineStageService.getById(id), enabled: !!id }); }
export function useCreatePipelineStage() { const qc = useQueryClient(); return useMutation({ mutationFn: (data: CreatePipelineStageData) => pipelineStageService.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useUpdatePipelineStage() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdatePipelineStageData }) => pipelineStageService.update(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
export function useDeletePipelineStage() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => pipelineStageService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEY] }) }); }
