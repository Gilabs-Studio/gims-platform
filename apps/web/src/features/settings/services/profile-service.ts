import { apiClient } from "@/lib/api-client";
import type { 
  ProfileApiResponse, 
  UpdateProfileRequest, 
  ChangePasswordRequest, 
  AvatarUploadApiResponse 
} from "../types";

const PROFILE_URL = "/profile";

export const profileService = {
  updateProfile: async (data: UpdateProfileRequest) => {
    const response = await apiClient.put<ProfileApiResponse>(
      PROFILE_URL,
      data
    );
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest) => {
    const response = await apiClient.put(
      `${PROFILE_URL}/password`,
      data
    );
    return response.data;
  },

  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await apiClient.post<AvatarUploadApiResponse>(
      `${PROFILE_URL}/avatar`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },
};
