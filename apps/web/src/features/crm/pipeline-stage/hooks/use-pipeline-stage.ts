import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { pipelineStageService } from "../services/pipeline-stage-service";
import type { PipelineStageListParams, CreatePipelineStageData, UpdatePipelineStageData } from "../types";

const QUERY_KEY = "pipeline-stages";

const pipelineStageKeys = {
	all: [QUERY_KEY] as const,
	list: (params?: PipelineStageListParams) => [...pipelineStageKeys.all, "list", params ?? {}] as const,
	detail: (id: string) => [...pipelineStageKeys.all, "detail", id] as const,
};

export function usePipelineStages(params?: PipelineStageListParams, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: pipelineStageKeys.list(params),
		queryFn: () => pipelineStageService.list(params),
		staleTime: 5 * 60 * 1000,
		enabled: options?.enabled ?? true,
	});
}

export function usePipelineStageById(id: string, options?: { enabled?: boolean }) {
	return useQuery({
		queryKey: pipelineStageKeys.detail(id),
		queryFn: () => pipelineStageService.getById(id),
		enabled: (options?.enabled ?? true) && !!id,
	});
}

export function useCreatePipelineStage() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreatePipelineStageData) => pipelineStageService.create(data),
		onSuccess: () => qc.invalidateQueries({ queryKey: pipelineStageKeys.all }),
	});
}

export function useUpdatePipelineStage() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdatePipelineStageData }) => pipelineStageService.update(id, data),
		onSuccess: () => qc.invalidateQueries({ queryKey: pipelineStageKeys.all }),
	});
}

export function useDeletePipelineStage() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => pipelineStageService.delete(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: pipelineStageKeys.all }),
	});
}
