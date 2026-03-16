"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { LeadGenerateSource } from "../types";

import googleMapsWorkflow from "../n8n/google-maps-workflow.json";
import linkedinWorkflow from "../n8n/linkedin-workflow.json";
import universalWorkflow from "../n8n/universal-workflow.json";

interface GenerateLeadsState {
  source: LeadGenerateSource;
  keyword: string;
  city: string;
  limit: number;
  leadSourceId: string;
  n8nWebhookUrl: string;
  isRunning: boolean;
  isTesting: boolean;
}

const WORKFLOW_MAP = {
  google_maps: googleMapsWorkflow,
  linkedin: linkedinWorkflow,
  universal: universalWorkflow,
} as const;

const DEFAULT_WEBHOOK_URL =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_N8N_LEADS_WEBHOOK_URL ?? "")
    : "";

interface UseGenerateLeadsProps {
  onSuccess?: () => void;
}

export function useGenerateLeads({ onSuccess }: UseGenerateLeadsProps = {}) {
  const t = useTranslations("crmLead");

  const [state, setState] = useState<GenerateLeadsState>({
    source: "google_maps",
    keyword: "",
    city: "",
    limit: 10,
    leadSourceId: "",
    n8nWebhookUrl: DEFAULT_WEBHOOK_URL,
    isRunning: false,
    isTesting: false,
  });

  const setSource = useCallback((source: LeadGenerateSource) => {
    setState((prev) => ({ ...prev, source }));
  }, []);

  const setKeyword = useCallback((keyword: string) => {
    setState((prev) => ({ ...prev, keyword }));
  }, []);

  const setCity = useCallback((city: string) => {
    setState((prev) => ({ ...prev, city }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setState((prev) => ({ ...prev, limit }));
  }, []);

  const setLeadSourceId = useCallback((id: string) => {
    setState((prev) => ({ ...prev, leadSourceId: id }));
  }, []);

  const setN8nWebhookUrl = useCallback((url: string) => {
    setState((prev) => ({ ...prev, n8nWebhookUrl: url }));
  }, []);

  /** Builds the JSON payload to POST to the n8n webhook */
  const buildPayload = useCallback(
    () => {
      // Auto-assign the LeadSource ID based on the CRM Default Seeders if the user didn't pick one
      let autoSourceId = null;
      if (!state.leadSourceId) {
        if (state.source === "google_maps") autoSourceId = "cb000001-0000-0000-0000-000000000006";
        else if (state.source === "linkedin") autoSourceId = "cb000001-0000-0000-0000-000000000007";
      }

      return {
        type: state.source,
        keyword: state.keyword,
        city: state.city,
        limit: state.limit,
        lead_source_id: state.leadSourceId || autoSourceId,
        erp_base_url:
          process.env.NEXT_PUBLIC_N8N_ERP_BASE_URL ||
          process.env.NEXT_PUBLIC_API_URL ||
          (typeof window !== "undefined"
            ? window.location.origin.replace(/:\d+$/, ":8080")
            : ""),
      };
    },
    [state]
  );

  /**
   * Verify the n8n webhook URL is reachable by routing through the Next.js server proxy.
   * Server-side HEAD request avoids browser CORS restrictions.
   */
  const testN8nConnection = useCallback(async () => {
    if (!state.n8nWebhookUrl) {
      toast.error(t("generate.testErrorNoUrl"));
      return;
    }

    setState((prev) => ({ ...prev, isTesting: true }));

    try {
      const res = await fetch("/api/n8n/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: state.n8nWebhookUrl, method: "HEAD" }),
      });

      const data = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `Status ${res.status}`);
      }

      toast.success(t("generate.testSuccess"));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t("generate.testError", { message }));
    } finally {
      setState((prev) => ({ ...prev, isTesting: false }));
    }
  }, [state.n8nWebhookUrl, t]);

  /**
   * POST the lead generation payload to the n8n webhook via the server-side proxy.
   * Avoids browser CORS restrictions on cross-origin POST requests.
   */
  const triggerWorkflow = useCallback(async () => {
    if (!state.n8nWebhookUrl) {
      toast.error(t("generate.testErrorNoUrl"));
      return;
    }
    if (!state.keyword.trim()) {
      toast.error(t("generate.errorNoKeyword"));
      return;
    }
    if (!state.city.trim()) {
      toast.error(t("generate.errorNoCity"));
      return;
    }

    setState((prev) => ({ ...prev, isRunning: true }));

    try {
      const res = await fetch("/api/n8n/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: state.n8nWebhookUrl,
          payload: buildPayload(),
          method: "POST",
        }),
      });

      const data = await res.json().catch(() => ({})) as Record<string, unknown>;

      if (!res.ok) {
        throw new Error((data.error as string) || `Status ${res.status}`);
      }

      // Detect /webhook-test/ mode — workflow nodes did not run
      if (data.test_mode) {
        toast.warning(
          "Workflow triggered in TEST mode — nodes did not run. " +
          "Change your URL from /webhook-test/ to /webhook/ and activate the workflow."
        );
        if (onSuccess) {
          onSuccess();
        }
        return;
      }

      // Proxy warning (empty upstream response)
      if (data.triggered && data.warning) {
        toast.warning(data.warning as string);
        return;
      }

      const erpResult = data?.erp_result as Record<string, unknown> | undefined;
      const resultData = erpResult?.data as Record<string, unknown> | undefined;
      const created = (resultData?.created ?? 0) as number;
      const updated = (resultData?.updated ?? 0) as number;

      toast.success(t("generate.runSuccess", { created, updated }));
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(t("generate.runError", { message }));
    } finally {
      setState((prev) => ({ ...prev, isRunning: false }));
    }
  }, [state, buildPayload, t]);

  /** Downloads the n8n workflow JSON for manual import into n8n */
  const downloadWorkflow = useCallback(
    (type: LeadGenerateSource | "universal" = state.source) => {
      const workflow = WORKFLOW_MAP[type];
      const blob = new Blob([JSON.stringify(workflow, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gims-lead-gen-${type}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(t("generate.workflowDownloaded"));
    },
    [state.source, t]
  );

  /**
   * Copies the n8n workflow JSON content to clipboard so the user can
   * paste it directly into n8n's "Import from clipboard" dialog.
   */
  const copyWorkflowJson = useCallback(async () => {
    const workflow = WORKFLOW_MAP[state.source];
    try {
      await navigator.clipboard.writeText(JSON.stringify(workflow, null, 2));
      toast.success(t("generate.jsonCopied"));
    } catch {
      toast.error(t("generate.copyFailed"));
    }
  }, [state.source, t]);

  return {
    state,
    actions: {
      setSource,
      setKeyword,
      setCity,
      setLimit,
      setLeadSourceId,
      setN8nWebhookUrl,
      testN8nConnection,
      triggerWorkflow,
      downloadWorkflow,
      copyWorkflowJson,
    },
  };
}
