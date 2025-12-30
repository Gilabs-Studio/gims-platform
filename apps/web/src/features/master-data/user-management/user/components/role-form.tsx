"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { createRoleSchema, updateRoleSchema, type CreateRoleFormData, type UpdateRoleFormData } from "../schemas/role.schema";
import type { Role } from "../types";

interface RoleFormProps {
  readonly role?: Role;
  readonly onSubmit: (data: CreateRoleFormData | UpdateRoleFormData) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
}

export function RoleForm({ role, onSubmit, onCancel, isLoading = false }: RoleFormProps) {
  const isEdit = !!role;
  const schema = isEdit ? updateRoleSchema : createRoleSchema;
  const t = useTranslations("userManagement.roleForm");
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateRoleFormData | UpdateRoleFormData>({
    resolver: zodResolver(schema),
    defaultValues: role
      ? {
          name: role.name,
          description: role.description || "",
        }
      : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field>
        <FieldLabel htmlFor="name">{t("nameLabel")}</FieldLabel>
        <Input
          id="name"
          {...register("name")}
          placeholder={t("namePlaceholder")}
          disabled={isLoading}
        />
        {errors.name && <FieldError>{errors.name.message}</FieldError>}
      </Field>

      <Field>
        <FieldLabel htmlFor="description">{t("descriptionLabel")}</FieldLabel>
        <Input
          id="description"
          {...register("description")}
          placeholder={t("descriptionPlaceholder")}
          disabled={isLoading}
        />
        {errors.description && <FieldError>{errors.description.message}</FieldError>}
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

