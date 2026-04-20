import { useEffect, useRef, useMemo } from "react";
import { useRouter } from "@/i18n/routing";
import { useSystemAdminStore } from "../stores/use-system-admin-store";
import { systemAdminService } from "../services/system-admin-service";

export function useSystemAdminGuard() {
  const router = useRouter();
  const { admin, isAuthenticated, isSessionVerified, setAdmin, logout } =
    useSystemAdminStore();
  const verifyRef = useRef(false);

  const verificationComplete = useMemo(
    () => isSessionVerified && !!admin,
    [isSessionVerified, admin],
  );

  useEffect(() => {
    if (verificationComplete) return;

    if (verifyRef.current) return;
    verifyRef.current = true;

    systemAdminService
      .me()
      .then((res) => {
        if (res.success && res.data?.role === "system_admin") {
          setAdmin({
            id: res.data.id,
            email: res.data.email,
            name: res.data.email,
            status: "active",
          });
        } else {
          logout();
          router.replace("/system/login");
        }
      })
      .catch(() => {
        logout();
        router.replace("/system/login");
      });
  }, [verificationComplete, setAdmin, logout, router]);

  return {
    isAuthenticated,
    isLoading: !verificationComplete,
    admin,
    isSessionVerified,
    verificationComplete,
  };
}
