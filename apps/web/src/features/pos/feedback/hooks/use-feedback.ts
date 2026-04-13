import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { feedbackService } from "../services/feedback-service";
import type {
  CreateFeedbackFormRequest,
  FeedbackFormListParams,
  FeedbackListParams,
  SubmitFeedbackRequest,
  UpdateFeedbackFormRequest,
} from "../types";

const FORMS_KEY = "feedbackForms";
const RESPONSES_KEY = "feedbackResponses";

// ── Form queries ──────────────────────────────────────────────────────────────

export function useFeedbackForms(
  params?: FeedbackFormListParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [FORMS_KEY, params],
    queryFn: () => feedbackService.listForms(params),
    enabled: options?.enabled ?? true,
  });
}

export function useFeedbackForm(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [FORMS_KEY, id],
    queryFn: () => feedbackService.getFormById(id),
    enabled: options?.enabled ?? !!id,
  });
}

export function useFeedbackFormsByOutlet(
  outletId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [FORMS_KEY, "outlet", outletId],
    queryFn: () => feedbackService.getFormsByOutlet(outletId),
    enabled: options?.enabled ?? !!outletId,
  });
}

// ── Form mutations ────────────────────────────────────────────────────────────

export function useCreateFeedbackForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeedbackFormRequest) =>
      feedbackService.createForm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FORMS_KEY] });
    },
  });
}

export function useUpdateFeedbackForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateFeedbackFormRequest;
    }) => feedbackService.updateForm(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FORMS_KEY] });
    },
  });
}

export function useDeleteFeedbackForm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => feedbackService.deleteForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FORMS_KEY] });
    },
  });
}

// ── Response queries ──────────────────────────────────────────────────────────

export function useFeedbackResponses(
  params?: FeedbackListParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [RESPONSES_KEY, params],
    queryFn: () => feedbackService.listResponses(params),
    enabled: options?.enabled ?? true,
  });
}

export function useFeedbackResponse(
  id: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [RESPONSES_KEY, id],
    queryFn: () => feedbackService.getResponseById(id),
    enabled: options?.enabled ?? !!id,
  });
}

// ── Public hooks (no auth) ────────────────────────────────────────────────────

export function usePublicFeedbackForm(
  token: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["publicFeedback", token],
    queryFn: () => feedbackService.getPublicForm(token),
    enabled: options?.enabled ?? !!token,
    retry: false,
    staleTime: Infinity,
  });
}

export function useSubmitFeedback(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitFeedbackRequest) =>
      feedbackService.submitFeedback(token, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publicFeedback", token] });
    },
  });
}
