"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useAuthStore } from "@/features/auth/stores/use-auth-store";
import { type ProfileFormData, profileSchema } from "../../schemas/profile.schema";
import { useUpdateProfile } from "../../hooks/use-profile";

export function ProfileForm() {
  const t = useTranslations("profile");
  
  const user = useAuthStore((state) => state.user);
  const { mutate: updateProfile, isPending } = useUpdateProfile();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
    },
    values: {
        name: user?.name ?? "",
        email: user?.email ?? "",
    }
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfile(data);
  };

  if (!user) {
      return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("profile")}</CardTitle>
        <CardDescription>
          {t("settingsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Field orientation="vertical">
                    <FieldLabel>{t("name")}</FieldLabel>
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <Input placeholder="Your name" {...field} />
                        )}
                    />
                    {errors.name && <FieldError>{errors.name.message}</FieldError>}
                </Field>

                <Field orientation="vertical">
                    <FieldLabel>{t("email")}</FieldLabel>
                    <Controller
                        name="email"
                        control={control}
                        render={({ field }) => (
                            <Input placeholder="Your email" {...field} type="email" />
                        )}
                    />
                    {errors.email && <FieldError>{errors.email.message}</FieldError>}
                </Field>

                <div className="flex justify-end">
                    <Button type="submit" disabled={isPending} className="cursor-pointer">
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isPending ? t("saving") : t("saveChanges")}
                    </Button>
                </div>
            </form>
        </div>
      </CardContent>
    </Card>
  );
}
