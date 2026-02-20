"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { AvatarUpload } from "./avatar-upload";
import { PreferencesForm } from "./preferences-form";

export function ProfileView() {
  const t = useTranslations("profile");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("settings")}</h2>
        <p className="text-muted-foreground">
          {t("settingsDescription")}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Sidebar - Profile Card */}
        <div className="md:col-span-4 lg:col-span-3">
          <AvatarUpload />
        </div>

        {/* Right Content - Tabs & Forms */}
        <div className="md:col-span-8 lg:col-span-9">
          <Tabs defaultValue="general" className="space-y-4">
             {/* Custom Tab List Styling to match premium look if needed, using default for now but ensuring full width */}
            <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
              <TabsTrigger value="general" className="flex-1 md:flex-none">{t("general")}</TabsTrigger>
              <TabsTrigger value="security" className="flex-1 md:flex-none">{t("security")}</TabsTrigger>
              <TabsTrigger value="preferences" className="flex-1 md:flex-none">{t("preferences")}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4 animate-in fade-in-50 duration-300">
               <div className="grid gap-6">
                 {/* Provide title context inside the tab content as well if card doesn't have it, but standard form usually has header */}
                 <ProfileForm />
               </div>
            </TabsContent>
            
            <TabsContent value="security" className="space-y-4 animate-in fade-in-50 duration-300">
              <PasswordForm />
            </TabsContent>
            
            <TabsContent value="preferences" className="space-y-4 animate-in fade-in-50 duration-300">
              <PreferencesForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
