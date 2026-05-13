"use client";

import { useEffect, useState } from "react";
import { useController, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { createUserSchema, updateUserSchema, type CreateUserFormData, type UpdateUserFormData } from "../schemas/user.schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles } from "../hooks/use-users";
import { sortOptions } from "@/lib/utils";
import type { User } from "../types";

interface UserFormProps {
  readonly user?: User;
  readonly onSubmit: (data: CreateUserFormData | UpdateUserFormData) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
  readonly emailErrorMessage?: string;
}

export function UserForm({ user, onSubmit, onCancel, isLoading, emailErrorMessage }: UserFormProps) {
  const isEdit = !!user;
  const { data: rolesData } = useRoles();
  const roles = sortOptions(rolesData?.data || [], (role) => role.name);
  const t = useTranslations("userManagement.form");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateUserFormData | UpdateUserFormData>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: user
      ? {
          email: user.email,
          name: user.name,
          role_id: user.role_id,
        }
      : {},
  });

  const {
    field: roleField,
    fieldState: roleFieldState,
  } = useController({
    control,
    name: "role_id",
  });

  const selectedRoleId = roleField.value || "";

  // Re-sync form values when editing user data finishes loading.
  // defaultValues only runs on mount; this effect handles async fetch timing.
  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        name: user.name,
        role_id: user.role_id,
      });
    }
  }, [user, reset]);

  const handleFormSubmit = async (data: CreateUserFormData | UpdateUserFormData) => {
    // role_id is controlled via useController, ensure it's always in submission
    // with current selected value from the form field
    const submittedData: CreateUserFormData | UpdateUserFormData = {
      ...data,
      role_id: roleField.value, // Always use latest controlled value
    };
    await onSubmit(submittedData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Field orientation="vertical">
        <FieldLabel>{t("emailLabel")}</FieldLabel>
        <Input
          type="email"
          {...register("email")}
          disabled={isEdit}
          placeholder={t("emailPlaceholder")}
        />
        {errors.email && <FieldError>{errors.email.message}</FieldError>}
        {!errors.email && emailErrorMessage && <FieldError>{emailErrorMessage}</FieldError>}
      </Field>

      {!isEdit && (
        <Field orientation="vertical">
          <FieldLabel>{t("passwordLabel")}</FieldLabel>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              {...register("password")}
              placeholder={t("passwordPlaceholder")}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 cursor-pointer"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isLoading}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          {(
            errors as {
              password?: { message?: string };
            }
          ).password && (
            <FieldError>
              {(
                errors as {
                  password?: { message?: string };
                }
              ).password?.message}
            </FieldError>
          )}
        </Field>
      )}

      <Field orientation="vertical">
        <FieldLabel>{t("nameLabel")}</FieldLabel>
        <Input
          {...register("name")}
          placeholder={t("namePlaceholder")}
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field orientation="vertical">
        <FieldLabel>{t("roleLabel")}</FieldLabel>
        <Select
          value={selectedRoleId}
          onValueChange={roleField.onChange}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("rolePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.role_id && <FieldError>{errors.role_id.message}</FieldError>}
        {!errors.role_id && roleFieldState.error && (
          <FieldError>{roleFieldState.error.message}</FieldError>
        )}
      </Field>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? t("submitting")
            : isEdit
              ? t("submitUpdate")
              : t("submitCreate")}
        </Button>
      </div>
    </form>
  );
}

