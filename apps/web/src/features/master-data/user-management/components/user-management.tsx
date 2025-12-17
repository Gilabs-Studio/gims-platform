"use client";

import { Users, Shield, Key } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserList } from "./user-list";
import { RoleList } from "./role-list";
import { PermissionList } from "./permission-list";
import { useHasPermission } from "../hooks/use-has-permission";

export function UserManagement() {
  const hasRolesPermission = useHasPermission("ROLES");
  const hasPermissionsPermission = useHasPermission("PERMISSIONS");
  const t = useTranslations("userManagement.tabs");

  // Determine default tab - use first available tab
  const defaultTab = "users";

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            {t("users")}
          </TabsTrigger>
          {hasRolesPermission && (
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            {t("roles")}
          </TabsTrigger>
          )}
          {hasPermissionsPermission && (
          <TabsTrigger value="permissions" className="gap-2">
            <Key className="h-4 w-4" />
            {t("permissions")}
          </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserList />
        </TabsContent>

        {hasRolesPermission && (
        <TabsContent value="roles" className="mt-6">
          <RoleList />
        </TabsContent>
        )}

        {hasPermissionsPermission && (
        <TabsContent value="permissions" className="mt-6">
          <PermissionList />
        </TabsContent>
        )}
      </Tabs>
  );
}

