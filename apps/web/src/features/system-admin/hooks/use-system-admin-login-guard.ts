import { useEffect, useState, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { useSystemAdminStore } from "../stores/use-system-admin-store";
import { systemAdminService } from "../services/system-admin-service";

export function useSystemAdminLoginGuard() {
  const router = useRouter();
  const { isAuthenticated, isSessionVerified, setAdmin } =
    useSystemAdminStore();
  const [shouldShowLoginForm, setShouldShowLoginForm] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const checkRef = useRef(false);

  useEffect(() => {
    if (isSessionVerified && isAuthenticated) {
      router.replace("/system/dashboard");
      return;
    }

    if (checkRef.current) return;
    checkRef.current = true;

    // Non-blocking background session check
    systemAdminService
      .me()
      .then((res) => {
        if (res.success && res.data?.role === "system_admin") {
          setAdmin({
            id: res.data.id,
            email: res.data.email,
            name: res.data.name || res.data.username || res.data.email,
            username: res.data.username,
            status: "active",
          });
          router.replace("/system/dashboard");
        } else {
          setShouldShowLoginForm(true);
          setIsLoading(false);
        }
      })
      .catch(() => {
        setShouldShowLoginForm(true);
        setIsLoading(false);
      });
  }, [isAuthenticated, isSessionVerified, setAdmin, router]);

  return { isLoading, shouldShowLoginForm };
}
