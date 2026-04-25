import { useMutation } from "@tanstack/react-query";
import { profileService } from "../services/profile-service";
import type { UpdateProfileRequest, ChangePasswordRequest } from "../types";
import type { User } from "@/features/auth/types";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { AxiosError } from "axios";

type ApiErrorResponse = {
  message?: string;
};

export function useUpdateProfile() {
  const setUser = useAuthStore((state) => state.setUser);
  const t = useTranslations("Common");

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => profileService.updateProfile(data),
    onSuccess: (response) => {
      // Update local user state
      // The response structure matches User type mostly, need to verify
      // response.data is ProfileResponse
      const updatedUser = response.data;
      if (updatedUser) {
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) {
            return;
          }

          const mergedUser: User = {
              ...currentUser,
              id: updatedUser.id,
              email: updatedUser.email,
              name: updatedUser.name,
              avatar_url: updatedUser.avatar_url,
          };
          setUser(mergedUser); 
      }
      toast.success(t("savedSuccessfully"));
    },
    onError: (error: unknown) => {
      // Error handling is usually done globally or via toast
      console.error("Profile update failed", error);
      const message = (error as AxiosError<ApiErrorResponse>).response?.data?.message;
      toast.error(message || t("somethingWentWrong"));
    },
  });
}

export function useChangePassword() {
  const t = useTranslations("Common");

  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => profileService.changePassword(data),
    onSuccess: () => {
      toast.success(t("passwordChangedSuccessfully"));
    },
    onError: (error: unknown) => {
      console.error("Change password failed", error);
      const message = (error as AxiosError<ApiErrorResponse>).response?.data?.message;
      toast.error(message || t("somethingWentWrong"));
    },
  });
}

export function useUploadAvatar() {
  const setUser = useAuthStore((state) => state.setUser);
  const t = useTranslations("Common");

  return useMutation({
    mutationFn: (file: File) => profileService.uploadAvatar(file),
    onSuccess: (response) => {
      const avatarUrl = response.data.avatar_url;
      if (avatarUrl) {
          const currentUser = useAuthStore.getState().user;
           if (currentUser) {
             const updatedUser = {
                 ...currentUser,
                 avatar_url: avatarUrl // Ensure this matches User type property, assuming snake_case from backend maps or is kept
             };
             setUser(updatedUser);
           }
      }
      toast.success(t("avatarUpdatedSuccessfully"));
    },
     onError: (error: unknown) => {
       console.error("Avatar upload failed", error);
       const message = (error as AxiosError<ApiErrorResponse>).response?.data?.message;
       toast.error(message || t("somethingWentWrong"));
    },
  });
}
