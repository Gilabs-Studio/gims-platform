"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { authService } from "@/features/auth/services/auth-service";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

/**
 * /register/success?token=<UUID>
 *
 * Xendit redirects here after a successful payment.
 * Polls verifySession() until the backend webhook fires and the session cookie
 * is set, then redirects to the dashboard.
 */
export default function RegisterSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const { setUser, setSessionVerified } = useAuthStore();

  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 12; // Poll for up to ~60s (5s × 12)

  useEffect(() => {
    if (!token) {
      setStatus("failed");
      return;
    }

    let cancelled = false;
    let attempt = 0;

    const poll = async () => {
      if (attempt >= MAX_ATTEMPTS) {
        if (!cancelled) setStatus("failed");
        return;
      }
      attempt++;
      if (!cancelled) setAttempts(attempt);

      try {
        // verifySession() succeeds once the webhook fires and sets the session cookie.
        const res = await authService.verifySession();
        if (!cancelled && res?.data?.user) {
          setUser(res.data.user);
          setSessionVerified(true);
          setStatus("success");
          setTimeout(() => router.replace("/dashboard"), 1500);
          return;
        }
      } catch {
        // Not ready yet — continue polling.
      }

      if (!cancelled) {
        setTimeout(poll, 5000);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6 text-center"
      >
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div>
              <h2 className="text-xl font-bold">Confirming your payment…</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This usually takes just a few seconds. Please stay on this page.
              </p>
              {attempts > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Checking… ({attempts}/{MAX_ATTEMPTS})
                </p>
              )}
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div>
              <h2 className="text-xl font-bold">Payment confirmed!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your account is ready. Redirecting to dashboard…
              </p>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="h-12 w-12 text-destructive" />
            <div>
              <h2 className="text-xl font-bold">Something went wrong</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We could not confirm your registration automatically.
                Your payment may still have been processed — please contact support.
              </p>
              <p className="mt-1 text-xs text-muted-foreground break-all">
                Reference: {token ?? "n/a"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/register")}
            >
              Back to Registration
            </Button>
          </>
        )}
      </motion.div>
    </AuthLayout>
  );
}
