"use client";

import { useTranslations } from "next-intl";
import { FileJson, Globe, Linkedin, Play, Wifi, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGenerateLeads } from "../hooks/use-generate-leads";
import type { LeadGenerateSource } from "../types";

interface GenerateLeadsDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SOURCE_OPTIONS: { value: LeadGenerateSource; label: string; icon: typeof Globe; description: string }[] = [
  {
    value: "google_maps",
    label: "Google Maps",
    icon: Globe,
    description: "Serper.dev + Groq AI — 2,500 free searches/month",
  },
  {
    value: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    description: "Apollo.io + Groq AI + Tavily — 50 free exports/month",
  },
];

export function GenerateLeadsDialog({ open, onClose, onSuccess }: GenerateLeadsDialogProps) {
  const t = useTranslations("crmLead");
  const { state, actions } = useGenerateLeads({ onSuccess });

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t("generate.title")}
          </DialogTitle>
          <DialogDescription>{t("generate.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Source Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("generate.selectSource")}</Label>
            <div className="grid grid-cols-2 gap-3">
              {SOURCE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = state.source === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => actions.setSource(option.value)}
                    className={`cursor-pointer flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="gen-keyword" className="text-sm">
                {t("generate.keyword")}
              </Label>
              <Input
                id="gen-keyword"
                placeholder={t("generate.keywordPlaceholder")}
                value={state.keyword}
                onChange={(e) => actions.setKeyword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gen-city" className="text-sm">
                {t("generate.city")}
              </Label>
              <Input
                id="gen-city"
                placeholder={t("generate.cityPlaceholder")}
                value={state.city}
                onChange={(e) => actions.setCity(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gen-limit" className="text-sm">
              {t("generate.limit")}
            </Label>
            <Input
              id="gen-limit"
              type="number"
              min={1}
              max={state.source === "linkedin" ? 25 : 20}
              value={state.limit}
              onChange={(e) => actions.setLimit(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {state.source === "google_maps"
                ? t("generate.limitHintMaps")
                : t("generate.limitHintLinkedin")}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">{t("generate.serverManagedMessage")}</p>

          <Separator />

          {/* Workflow Instructions */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {t("generate.howToUse")}
            </h4>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>{t("generate.step1")}</li>
              <li>{t("generate.step2")}</li>
              <li>{t("generate.step3")}</li>
              <li>{t("generate.step4")}</li>
              <li>{t("generate.step5")}</li>
            </ol>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className="text-xs">Groq (Free AI)</Badge>
              <Badge variant="outline" className="text-xs">
                {state.source === "google_maps" ? "Serper.dev" : "Apollo.io"}
              </Badge>
              {state.source === "linkedin" && (
                <Badge variant="outline" className="text-xs">Tavily (Research)</Badge>
              )}
              <Badge variant="secondary" className="text-xs">{t("generate.freeApis")}</Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => actions.copyWorkflowJson()}
            className="cursor-pointer"
          >
            <FileJson className="mr-2 h-4 w-4" />
            {t("generate.copyJson")}
          </Button>
          <Button
            variant="outline"
            onClick={() => actions.testN8nConnection()}
            disabled={state.isTesting}
            className="cursor-pointer"
          >
            <Wifi className="mr-2 h-4 w-4" />
            {state.isTesting ? t("generate.testing") : t("generate.test")}
          </Button>
          <Button
            onClick={() => actions.triggerWorkflow()}
            disabled={state.isRunning || !state.keyword || !state.city}
            className="cursor-pointer"
          >
            <Play className="mr-2 h-4 w-4" />
            {state.isRunning ? t("generate.running") : t("generate.run")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
