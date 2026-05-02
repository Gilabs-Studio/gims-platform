"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useSystemAdminStore } from "../stores/use-system-admin-store";
import { useSystemAdminProfile } from "../hooks/use-system-admin-profile";
import {
  systemAdminChangePasswordSchema,
  systemAdminUpdateProfileSchema,
  type SystemAdminChangePasswordFormData,
  type SystemAdminUpdateProfileFormData,
} from "../schemas/system-admin-profile.schema";

export function SystemAdminProfile() {
  const admin = useSystemAdminStore((state) => state.admin);
  const { updateProfile, changePassword } = useSystemAdminProfile();

  const profileForm = useForm<SystemAdminUpdateProfileFormData>({
    resolver: zodResolver(systemAdminUpdateProfileSchema),
    defaultValues: {
      username: admin?.username || admin?.name || "",
      email: admin?.email || "",
    },
  });

  const passwordForm = useForm<SystemAdminChangePasswordFormData>({
    resolver: zodResolver(systemAdminChangePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  useEffect(() => {
    profileForm.reset({
      username: admin?.username || admin?.name || "",
      email: admin?.email || "",
    });
  }, [admin, profileForm]);

  const handleUpdateProfile = (data: SystemAdminUpdateProfileFormData) => {
    updateProfile.mutate(data);
  };

  const handleChangePassword = (data: SystemAdminChangePasswordFormData) => {
    changePassword.mutate(
      {
        current_password: data.current_password,
        new_password: data.new_password,
      },
      {
        onSuccess: () => {
          passwordForm.reset();
        },
      },
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update internal system admin username and email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={profileForm.handleSubmit(handleUpdateProfile)}
            className="space-y-4"
          >
            <Field>
              <FieldLabel htmlFor="sys-admin-username">Username</FieldLabel>
              <Input
                id="sys-admin-username"
                placeholder="System admin username"
                {...profileForm.register("username")}
              />
              {profileForm.formState.errors.username && (
                <FieldError>
                  {profileForm.formState.errors.username.message}
                </FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="sys-admin-email">Email</FieldLabel>
              <Input
                id="sys-admin-email"
                type="email"
                placeholder="admin@example.com"
                {...profileForm.register("email")}
              />
              {profileForm.formState.errors.email && (
                <FieldError>
                  {profileForm.formState.errors.email.message}
                </FieldError>
              )}
            </Field>

            <Button
              type="submit"
              className="cursor-pointer"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Change password to secure this system admin account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit(handleChangePassword)}
            className="space-y-4"
          >
            <Field>
              <FieldLabel htmlFor="sys-admin-current-password">
                Current Password
              </FieldLabel>
              <Input
                id="sys-admin-current-password"
                type="password"
                {...passwordForm.register("current_password")}
              />
              {passwordForm.formState.errors.current_password && (
                <FieldError>
                  {passwordForm.formState.errors.current_password.message}
                </FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="sys-admin-new-password">
                New Password
              </FieldLabel>
              <Input
                id="sys-admin-new-password"
                type="password"
                {...passwordForm.register("new_password")}
              />
              {passwordForm.formState.errors.new_password && (
                <FieldError>
                  {passwordForm.formState.errors.new_password.message}
                </FieldError>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="sys-admin-confirm-password">
                Confirm New Password
              </FieldLabel>
              <Input
                id="sys-admin-confirm-password"
                type="password"
                {...passwordForm.register("confirm_password")}
              />
              {passwordForm.formState.errors.confirm_password && (
                <FieldError>
                  {passwordForm.formState.errors.confirm_password.message}
                </FieldError>
              )}
            </Field>

            <Button
              type="submit"
              variant="secondary"
              className="cursor-pointer"
              disabled={changePassword.isPending}
            >
              {changePassword.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
