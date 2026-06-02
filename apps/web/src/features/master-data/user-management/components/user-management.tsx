"use client";

import { Users, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserList } from "./user-list";
import { RoleList } from "./role-list";
import { useHasPermission } from "../hooks/use-has-permission";

export function UserManagement() {
  const hasRolesPermission = useHasPermission("role.read");
  const t = useTranslations("userManagement.tabs");
  const searchParams = useSearchParams();

  const requestedTab = (searchParams.get("tab") ?? "").trim().toLowerCase();

  let defaultTab = "users";
  if (requestedTab === "roles" && hasRolesPermission) {
    defaultTab = "roles";
  }

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
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserList />
        </TabsContent>

        {hasRolesPermission && (
        <TabsContent value="roles" className="mt-6">
          <RoleList />
        </TabsContent>
        )}
      </Tabs>
  );
}

