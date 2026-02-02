import { useRouter } from "@/i18n/routing";
import { useAuthStore } from "../stores/use-auth-store";
import { authService } from "../services/auth-service";
import type { LoginFormData } from "../schemas/login.schema";
import type { AuthError } from "../types/errors";
import { useState, useEffect } from "react";

export function useLogin() {
  const router = useRouter();
  const {
    setUser,
    setSessionVerified,
    isLoading: storeIsLoading,
    error: storeError,
    clearError,
  } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefetch CSRF token on mount
  useEffect(() => {
    authService.prefetchCSRFToken().catch(() => {
      // Ignore CSRF prefetch errors - will retry on login
    });
  }, []);

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      // Ensure CSRF token is set
      await authService.prefetchCSRFToken();

      const response = await authService.login({
        email: data.email,
        password: data.password,
      });

      if (response.success && response.data) {
        const { user } = response.data;
        // setUser also sets isAuthenticated: true
        setUser(user);
        // Mark session as verified since we just logged in successfully
        setSessionVerified(true);
        useAuthStore.setState({
          error: null,
        });
        // Redirect to dashboard - don't set isLoading false, let redirect complete
        router.replace("/dashboard");
        return; // Exit early, keep loading state until redirect
      }
    } catch (err) {
      const authError = err as AuthError;
      const errorMessage =
        authError.response?.data?.error?.message ||
        authError.message ||
        "Login failed";
      setError(errorMessage);
      useAuthStore.setState({ isAuthenticated: false, error: errorMessage });
      setIsLoading(false);
      throw err;
    }
  };

  return {
    handleLogin,
    isLoading: isLoading || storeIsLoading,
    error: error || storeError,
    clearError: () => {
      setError(null);
      clearError();
    },
  };
}
