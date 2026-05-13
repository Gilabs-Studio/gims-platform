import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { systemAdminService } from "../services/system-admin-service";
import { useSystemAdminStore } from "../stores/use-system-admin-store";

export function useSystemAdminProfile() {
  const { setAdmin } = useSystemAdminStore();

  const updateProfileMutation = useMutation({
    mutationFn: systemAdminService.updateProfile,
    onSuccess: (res) => {
      if (res.success && res.data) {
        setAdmin(res.data);
        toast.success("Profile updated");
        return;
      }
      toast.error("Failed to update profile");
    },
    onError: (error: unknown) => {
      const axiosErr = error as {
        response?: { data?: { error?: { code?: string; message?: string } } };
      };
      const code = axiosErr.response?.data?.error?.code;
      if (code === "EMAIL_ALREADY_TAKEN") {
        toast.error("Email is already taken");
        return;
      }
      toast.error(axiosErr.response?.data?.error?.message ?? "Failed to update profile");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: systemAdminService.changePassword,
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Password updated");
        return;
      }
      toast.error("Failed to update password");
    },
    onError: (error: unknown) => {
      const axiosErr = error as {
        response?: { data?: { error?: { code?: string; message?: string } } };
      };
      const code = axiosErr.response?.data?.error?.code;
      if (code === "INVALID_CREDENTIALS") {
        toast.error("Current password is invalid");
        return;
      }
      toast.error(axiosErr.response?.data?.error?.message ?? "Failed to update password");
    },
  });

  return {
    updateProfile: updateProfileMutation,
    changePassword: changePasswordMutation,
  };
}
