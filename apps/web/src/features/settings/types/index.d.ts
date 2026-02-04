export interface UpdateProfileRequest {
  email: string;
  name: string;
}

export interface ProfileResponse {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  role: {
    code: string;
    name: string;
  };
  status: string;
  created_at: string;
}

export interface ProfileApiResponse {
  data: ProfileResponse;
  meta: Meta;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AvatarUploadResponse {
  avatar_url: string;
  filename: string;
}

export interface AvatarUploadApiResponse {
  data: AvatarUploadResponse;
  meta: Meta;
}
