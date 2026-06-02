"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { AuthLayout } from "./auth-layout";
import { ButtonLoading } from "@/components/loading";
import { getResetPasswordSchema, type ResetPasswordFormData } from "../password-reset/schemas/password-reset.schema";
import { useResetPassword, useValidateResetToken } from "../password-reset/hooks/use-password-reset";

type ResetStatus = "validating" | "valid" | "invalid" | "success";

export default function ResetPasswordForm() {
  const t = useTranslations("passwordReset");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<ResetStatus>(token ? "validating" : "invalid");
  const [errorMessage, setErrorMessage] = useState<string>(token ? "" : t("invalidToken"));

  const validateTokenMutation = useValidateResetToken();
  const resetPasswordMutation = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(getResetPasswordSchema(t)),
    defaultValues: {
      new_password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    if (!token) return;

    validateTokenMutation.mutate(token, {
      onSuccess: () => {
        setStatus("valid");
      },
      onError: (error: unknown) => {
        setStatus("invalid");
        const apiError = error as { response?: { data?: { error?: { code?: string } } } };
        const code = apiError?.response?.data?.error?.code;
        if (code === "RESET_TOKEN_EXPIRED") {
          setErrorMessage(t("expiredToken"));
        } else if (code === "RESET_TOKEN_ALREADY_USED") {
          setErrorMessage(t("alreadyUsedToken"));
        } else {
          setErrorMessage(t("invalidToken"));
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, t]);

  const onSubmit = (data: ResetPasswordFormData) => {
    if (!token) return;

    resetPasswordMutation.mutate(
      {
        token,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      },
      {
        onSuccess: () => {
          setStatus("success");
        },
      }
    );
  };

  return (
    <AuthLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <Card className="border border-border/60 bg-card/90 shadow-sm">
          {status === "validating" && (
            <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">{t("validateToken")}</p>
            </CardContent>
          )}

          {status === "invalid" && (
            <>
              <CardHeader className="space-y-2 px-6 pb-2 pt-6 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl">{t("resetPassword")}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {errorMessage}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-4 space-y-4">
                <Link href="/forgot-password" className="inline-flex w-full">
                  <Button className="h-11 w-full text-sm font-semibold tracking-wide">
                    {t("forgotPassword")}
                  </Button>
                </Link>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  <Link href="/login" className="text-primary hover:underline cursor-pointer">
                    {t("backToLogin")}
                  </Link>
                </div>
              </CardContent>
            </>
          )}

          {status === "valid" && (
            <>
              <CardHeader className="space-y-2 px-6 pb-2 pt-6">
                <CardTitle className="text-2xl">{t("resetPassword")}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {t("resetPasswordDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-2">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <FieldGroup className="space-y-4">
                    <Field className="space-y-2">
                      <FieldLabel htmlFor="new_password">{t("newPassword")}</FieldLabel>
                      <Input
                        id="new_password"
                        type="password"
                        placeholder="••••••••"
                        {...register("new_password")}
                        disabled={resetPasswordMutation.isPending}
                        aria-invalid={!!errors.new_password}
                        className="h-11"
                      />
                      {errors.new_password && <FieldError>{errors.new_password.message}</FieldError>}
                    </Field>

                    <Field className="space-y-2">
                      <FieldLabel htmlFor="confirm_password">{t("confirmPassword")}</FieldLabel>
                      <Input
                        id="confirm_password"
                        type="password"
                        placeholder="••••••••"
                        {...register("confirm_password")}
                        disabled={resetPasswordMutation.isPending}
                        aria-invalid={!!errors.confirm_password}
                        className="h-11"
                      />
                      {errors.confirm_password && (
                        <FieldError>{errors.confirm_password.message}</FieldError>
                      )}
                    </Field>

                    <Field className="pt-1">
                      <Button
                        type="submit"
                        disabled={resetPasswordMutation.isPending}
                        className="h-11 w-full text-sm font-semibold tracking-wide"
                      >
                        <ButtonLoading
                          loading={resetPasswordMutation.isPending}
                          loadingText={t("sending")}
                        >
                          {t("resetPassword")}
                        </ButtonLoading>
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              </CardContent>
            </>
          )}

          {status === "success" && (
            <>
              <CardHeader className="space-y-2 px-6 pb-2 pt-6 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success animate-bounce">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl">{t("resetPassword")}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {t("resetPasswordSuccess")}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-4">
                <Link href="/login" className="inline-flex w-full">
                  <Button className="h-11 w-full text-sm font-semibold tracking-wide">
                    {t("backToLogin")}
                  </Button>
                </Link>
              </CardContent>
            </>
          )}
        </Card>
      </motion.div>
    </AuthLayout>
  );
}
