import { useState } from "react";
import { useRouter } from "@/i18n/routing";
import { useSystemAdminStore } from "../stores/use-system-admin-store";
import { systemAdminService } from "../services/system-admin-service";
import type { SystemAdminLoginFormData } from "../schemas/system-admin-login.schema";

export function useSystemAdminLogin() {
  const router = useRouter();
  const { setAdmin } = useSystemAdminStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (data: SystemAdminLoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await systemAdminService.login({
        email: data.email,
        password: data.password,
      });

      if (response.success && response.data) {
        setAdmin(response.data.admin);
        router.replace("/system/dashboard");
        return;
      }
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string; code?: string } } }; message?: string };
      const code = axiosErr.response?.data?.error?.code;
      if (code === "INVALID_CREDENTIALS") {
        setError("Invalid email or password");
      } else if (code === "ACCOUNT_DISABLED") {
        setError("Account is disabled");
      } else {
        setError(axiosErr.response?.data?.error?.message ?? "Login failed");
      }
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { handleLogin, isLoading, error, clearError };
}
