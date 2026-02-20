"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EvaluationGroupList } from "./evaluation-group-list";
import { EmployeeEvaluationList } from "./employee-evaluation-list";

export function EvaluationPage() {
  const t = useTranslations("evaluation");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="evaluations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="evaluations" className="cursor-pointer">
            {t("tabs.evaluations")}
          </TabsTrigger>
          <TabsTrigger value="groups" className="cursor-pointer">
            {t("tabs.groups")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="evaluations">
          <EmployeeEvaluationList />
        </TabsContent>
        <TabsContent value="groups">
          <EvaluationGroupList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
