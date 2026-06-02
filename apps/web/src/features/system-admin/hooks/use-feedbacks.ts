import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { systemAdminService } from "../services/system-admin-service";

export function useSupportFeedbacks(params?: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: ["system-admin", "support-feedbacks", params],
    queryFn: async () => {
      const res = await systemAdminService.getFeedbacks(params);
      return res;
    },
  });
}

export function useDeleteSupportFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => systemAdminService.deleteFeedback(id),
    onSuccess: async () => {
      toast.success("Feedback berhasil dihapus.");
      await queryClient.invalidateQueries({ queryKey: ["system-admin", "support-feedbacks"] });
    },
    onError: () => {
      toast.error("Gagal menghapus feedback.");
    },
  });
}
