"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";
import { useTranslations } from "next-intl";

export default function BlockPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const handleLogout = useLogout();
  const t = useTranslations("auth");

  useEffect(() => {
    // Auto logout after 5 seconds if user still doesn't have valid role
    const timer = setTimeout(() => {
      handleLogout();
    }, 5000);

    return () => clearTimeout(timer);
  }, [handleLogout]);

  const handleGoToLogin = () => {
    handleLogout();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">
            {t("block.title", { defaultValue: "Access Blocked" })}
          </CardTitle>
          <CardDescription>
            {t("block.description", {
              defaultValue: "You don't have permission to access this resource.",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              {t("block.reason", {
                defaultValue:
                  "Your role has been removed or your permissions have been revoked. Please contact your administrator.",
              })}
            </p>
            {user?.role && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("block.currentRole", {
                  defaultValue: "Current role:",
                })}{" "}
                <span className="font-medium">{user.role}</span>
              </p>
            )}
          </div>
          <Button onClick={handleGoToLogin} className="w-full" variant="default">
            {t("block.goToLogin", { defaultValue: "Go to Login" })}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {t("block.autoLogout", {
              defaultValue: "You will be automatically logged out in a few seconds.",
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

