"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, MapPin, Calendar as CalendarIcon, Briefcase, Hash } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";
import { AvatarUpload } from "./avatar-upload";
import { PreferencesForm } from "./preferences-form";
import { useAuthStore } from "@/features/auth/stores/use-auth-store";

// Dynamic imports for lazy loading
const DashboardMetrics = dynamic(() =>
  import("./dashboard-metrics").then((mod) => ({ default: mod.DashboardMetrics })),
  {
    loading: () => <MetricsLoadingSkeletons />,
    ssr: false,
  }
);

function MetricsLoadingSkeletons() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function ProfileSidebar() {
  const t = useTranslations("profile");
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col space-y-8 pr-4 lg:pr-8 py-2 md:border-r border-border/40 h-full">
      {/* Profile Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <AvatarUpload />
          {/* <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreHorizontal className="h-5 w-5" />
          </Button> */}
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.employee_id || `#UID-${user?.id?.substring(0, 8) || "0000"}`}
          </p>
        </div>
      </div>

      {/* About */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">{t("about")}</h3>
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">-</span>
          </div>
          <div className="flex items-center gap-3 break-all">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-foreground">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">{t("addressLabel")}</h3>
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                <span className="text-muted-foreground">{t("addressLabel")}</span>
                <span className="text-foreground">-</span>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2 items-center">
                <span className="text-muted-foreground">{t("cityState")}</span>
                <span className="text-foreground">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Employee details */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">{t("employeeDetails")}</h3>
        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3">
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="grid grid-cols-[100px_1fr] gap-2 items-center w-full">
              <span className="text-muted-foreground">{t("dateOfBirth")}</span>
              <span className="text-foreground">-</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Briefcase className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="grid grid-cols-[100px_1fr] gap-2 items-center w-full">
              <span className="text-muted-foreground">{t("titleLabel")}</span>
              <span className="text-foreground">{user?.role?.name || "-"}</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
             <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
             <div className="grid grid-cols-[100px_1fr] gap-2 items-center w-full">
               <span className="text-muted-foreground">{t("hireDateLabel")}</span>
               <span className="text-foreground">-</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileView() {
  const t = useTranslations("profile");
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6 max-w-[1400px] w-full mx-auto">
      {/* Page Header matching image 1 perfectly */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">{t("profile")}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Clean top Tabs bar identical to reference image */}
        <div className="border-b border-border/40 w-full mb-6 relative">
          <TabsList className="flex w-full justify-start h-auto bg-transparent p-0 gap-6 overflow-x-auto overflow-y-hidden no-scrollbar rounded-none items-end">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-1 pb-3 pt-2 font-medium text-[14px] cursor-pointer border-b-2 border-transparent transition-none"
            >
              {t("overview")}
            </TabsTrigger>
            <TabsTrigger 
              value="general" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-1 pb-3 pt-2 font-medium text-[14px] cursor-pointer border-b-2 border-transparent transition-none"
            >
              {t("general")}
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-1 pb-3 pt-2 font-medium text-[14px] cursor-pointer border-b-2 border-transparent transition-none"
            >
              {t("security")}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* Sidebar */}
          <div className="col-span-1 md:col-span-4 lg:col-span-3">
            <ProfileSidebar />
          </div>

          {/* Main Content Area */}
          <div className="col-span-1 md:col-span-8 lg:col-span-9 min-w-0 py-2">
            <TabsContent value="overview" className="mt-0 space-y-10 animate-in fade-in-50 duration-500">
              
              {/* Job Information Header identical to reference image */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-lg font-semibold">{t("jobInformation")}</h3>
                </div>
                <div className="rounded-none border-b border-t border-border/40 py-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t("department")}</span>
                      <span className="font-medium text-foreground">Sales</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t("manager")}</span>
                      <span className="font-medium text-foreground">-</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t("hireDate")}</span>
                      <span className="font-medium text-foreground">-</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t("locationLabel")}</span>
                      <span className="font-medium text-foreground">Jakarta</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard Metrics replacing the generic activity */}
              <div>
                <Suspense fallback={<MetricsLoadingSkeletons />}>
                  <DashboardMetrics />
                </Suspense>
              </div>

            </TabsContent>

            <TabsContent value="general" className="mt-0 space-y-6 animate-in fade-in-50 duration-500">
              <div className="grid gap-6 max-w-2xl">
                <ProfileForm />
                <PreferencesForm />
              </div>
            </TabsContent>

            <TabsContent value="security" className="mt-0 space-y-6 animate-in fade-in-50 duration-500">
              <div className="grid gap-6 max-w-2xl">
                <PasswordForm />
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
