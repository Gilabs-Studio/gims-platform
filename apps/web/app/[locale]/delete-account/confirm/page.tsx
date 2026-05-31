"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useConfirmAccountDeletion } from "@/features/settings/hooks/use-profile";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function DeletionConfirmContent() {
  const t = useTranslations("profile.deleteAccount");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const confirmMutation = useConfirmAccountDeletion();
  const hasFired = useRef(false);

  useEffect(() => {
    if (token && !hasFired.current) {
      hasFired.current = true;
      confirmMutation.mutate(token);
    }
  }, [token, confirmMutation]);

  const handleGoToLogin = () => {
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50/50 p-4 dark:bg-zinc-950/50">
      <Card className="w-full max-w-md border-zinc-200/80 shadow-lg dark:border-zinc-800/80">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {t("confirmPageTitle")}
          </CardTitle>
          <CardDescription>
            {t("confirmPageDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          {!token && (
            <div className="space-y-4">
              <XCircle className="mx-auto h-16 w-16 text-destructive" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("tokenNotFound")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("tokenNotFoundDesc")}
                </p>
              </div>
              <Button onClick={handleGoToLogin} className="w-full">
                {t("backToLogin")}
              </Button>
            </div>
          )}

          {token && confirmMutation.isPending && (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("verifying")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("verifyingDesc")}
                </p>
              </div>
            </div>
          )}

          {token && confirmMutation.isSuccess && (
            <div className="space-y-4">
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("successTitle")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("successDesc")}
                </p>
              </div>
            </div>
          )}

          {token && confirmMutation.isError && (
            <div className="space-y-4">
              <XCircle className="mx-auto h-16 w-16 text-destructive" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t("failedTitle")}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("failedDesc")}
                </p>
              </div>
              <Button onClick={handleGoToLogin} className="w-full">
                {t("backToLogin")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeletionConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50/50 dark:bg-zinc-950/50">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <DeletionConfirmContent />
    </Suspense>
  );
}
