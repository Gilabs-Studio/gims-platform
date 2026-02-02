"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Controller } from "react-hook-form";

import { passwordSchema, type PasswordFormData } from "../../schemas/password.schema";
import { useChangePassword } from "../../hooks/use-profile";

export function PasswordForm() {
  const t = useTranslations("profile");
  const { mutate: changePassword, isPending } = useChangePassword();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      old_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const onSubmit = (data: PasswordFormData) => {
    changePassword(data, {
      onSuccess: () => {
        reset();
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("changePassword")}</CardTitle>
        <CardDescription>{t("changePasswordDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
          <Controller
            control={control}
            name="old_password"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("currentPassword")}</FieldLabel>
                <Input type="password" placeholder="••••••••" {...field} />
                {errors.old_password && (
                  <FieldError>{errors.old_password.message}</FieldError>
                )}
              </Field>
            )}
          />

          <Controller
            control={control}
            name="new_password"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("newPassword")}</FieldLabel>
                <Input type="password" placeholder="••••••••" {...field} />
                {errors.new_password && (
                  <FieldError>{errors.new_password.message}</FieldError>
                )}
              </Field>
            )}
          />

          <Controller
            control={control}
            name="confirm_password"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("confirmPassword")}</FieldLabel>
                <Input type="password" placeholder="••••••••" {...field} />
                {errors.confirm_password && (
                  <FieldError>{errors.confirm_password.message}</FieldError>
                )}
              </Field>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("updatePassword")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
