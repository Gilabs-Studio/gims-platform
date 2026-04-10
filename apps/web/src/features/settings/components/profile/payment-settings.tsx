"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, CheckCircle2, WifiOff, Plug, Unplug } from "lucide-react";
import {
  useXenditConnectionStatus,
  useXenditConfig,
  useConnectXendit,
  useUpdateXenditConfig,
  useDisconnectXendit,
} from "@/features/pos/terminal/hooks/use-pos";
import type { ConnectXenditRequest, UpdateXenditConfigRequest } from "@/features/pos/terminal/types";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const connectSchema = z.object({
  secret_key: z.string().min(1, "Secret key is required"),
  xendit_account_id: z.string().optional(),
  business_name: z.string().optional(),
  environment: z.enum(["sandbox", "production"]),
  webhook_token: z.string().optional(),
});

const updateSchema = z.object({
  environment: z.enum(["sandbox", "production"]).optional(),
  business_name: z.string().optional(),
  is_active: z.boolean().optional(),
});

type ConnectFormValues = z.infer<typeof connectSchema>;
type UpdateFormValues = z.infer<typeof updateSchema>;

// ─── Connection status badge ──────────────────────────────────────────────────

function ConnectionStatusBadge({ status }: { status: string }) {
  if (status === "connected") {
    return (
      <Badge className="bg-green-100 text-green-700 gap-1.5 px-2.5 py-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Connected
      </Badge>
    );
  }
  if (status === "suspended") {
    return (
      <Badge variant="destructive" className="gap-1.5 px-2.5 py-1">
        <WifiOff className="h-3.5 w-3.5" />
        Suspended
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-muted-foreground">
      <WifiOff className="h-3.5 w-3.5" />
      Not Connected
    </Badge>
  );
}

// ─── Connect form ─────────────────────────────────────────────────────────────

function ConnectXenditForm() {
  const connectMutation = useConnectXendit();

  const form = useForm<ConnectFormValues>({
    resolver: zodResolver(connectSchema),
    defaultValues: {
      secret_key: "",
      xendit_account_id: "",
      business_name: "",
      environment: "sandbox",
      webhook_token: "",
    },
  });

  async function onSubmit(values: ConnectFormValues) {
    const payload: ConnectXenditRequest = {
      secret_key: values.secret_key,
      xendit_account_id: values.xendit_account_id || undefined,
      business_name: values.business_name || undefined,
      environment: values.environment,
      webhook_token: values.webhook_token || undefined,
    };
    await connectMutation.mutateAsync(payload);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="secret_key">
          Secret Key <span className="text-destructive">*</span>
        </Label>
        <Input
          id="secret_key"
          type="password"
          placeholder="xnd_production_xxxxxx or xnd_development_xxxxxx"
          {...form.register("secret_key")}
        />
        {form.formState.errors.secret_key && (
          <p className="text-xs text-destructive">{form.formState.errors.secret_key.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="xendit_account_id">Xendit Account ID (Sub-account)</Label>
        <Input
          id="xendit_account_id"
          placeholder="user-xxxxxx (optional, for XenPlatform)"
          {...form.register("xendit_account_id")}
        />
        <p className="text-xs text-muted-foreground">
          Required for XenPlatform sub-account routing. Leave empty if using a standalone account.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="business_name">Business Name</Label>
        <Input
          id="business_name"
          placeholder="e.g. Toko Maju Jaya"
          {...form.register("business_name")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="environment">
          Environment <span className="text-destructive">*</span>
        </Label>
        <Select
          defaultValue="sandbox"
          onValueChange={(v) =>
            form.setValue("environment", v as "sandbox" | "production")
          }
        >
          <SelectTrigger id="environment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
            <SelectItem value="production">Production</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="webhook_token">Webhook Verification Token</Label>
        <Input
          id="webhook_token"
          type="password"
          placeholder="Optional — used to verify Xendit webhook signatures"
          {...form.register("webhook_token")}
        />
      </div>

      <Button
        type="submit"
        className="cursor-pointer gap-2"
        disabled={connectMutation.isPending}
      >
        {connectMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plug className="h-4 w-4" />
        )}
        Connect Xendit Account
      </Button>
    </form>
  );
}

// ─── Update form ──────────────────────────────────────────────────────────────

function UpdateXenditConfigForm({
  currentEnvironment,
  currentBusinessName,
}: {
  currentEnvironment?: string;
  currentBusinessName?: string;
}) {
  const updateMutation = useUpdateXenditConfig();

  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      environment: (currentEnvironment as "sandbox" | "production") ?? "sandbox",
      business_name: currentBusinessName ?? "",
    },
  });

  async function onSubmit(values: UpdateFormValues) {
    const payload: UpdateXenditConfigRequest = {
      environment: values.environment,
      business_name: values.business_name || undefined,
    };
    await updateMutation.mutateAsync(payload);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="upd_business_name">Business Name</Label>
        <Input
          id="upd_business_name"
          placeholder="e.g. Toko Maju Jaya"
          {...form.register("business_name")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="upd_environment">Environment</Label>
        <Select
          defaultValue={currentEnvironment ?? "sandbox"}
          onValueChange={(v) =>
            form.setValue("environment", v as "sandbox" | "production")
          }
        >
          <SelectTrigger id="upd_environment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
            <SelectItem value="production">Production</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="cursor-pointer"
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Save Changes
      </Button>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PaymentSettings() {
  const [showConnectForm, setShowConnectForm] = useState(false);
  const { data: statusData, isLoading: statusLoading } = useXenditConnectionStatus();
  const { data: configData, isLoading: configLoading } = useXenditConfig();
  const disconnectMutation = useDisconnectXendit();

  const isConnected = statusData?.data?.is_connected === true;
  const connectionStatus = statusData?.data?.status ?? "not_connected";
  const config = configData?.data;

  if (statusLoading || configLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading payment settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Digital Payment Gateway</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Connect your Xendit account to accept digital payments at the POS terminal.
          </p>
        </div>
        <ConnectionStatusBadge status={connectionStatus} />
      </div>

      <Separator />

      {isConnected && config ? (
        <div className="space-y-6">
          {/* Current config overview */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Account Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Business Name
                </span>
                <span>{config.business_name || "-"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Environment
                </span>
                <span className="capitalize">{config.environment ?? "-"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Xendit Account ID
                </span>
                <span className="font-mono text-xs">
                  {config.xendit_account_id || "—"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Status
                </span>
                <span className="capitalize">{config.connection_status}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Update form */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Update Settings</h4>
            <UpdateXenditConfigForm
              currentEnvironment={config.environment}
              currentBusinessName={config.business_name}
            />
          </div>

          <Separator />

          {/* Danger zone */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
            <p className="text-sm text-muted-foreground">
              Disconnecting will prevent all digital payments at the POS terminal until reconnected.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="cursor-pointer gap-2">
                  <Unplug className="h-4 w-4" />
                  Disconnect Xendit Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Xendit?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the payment gateway configuration. Cashiers will no longer be
                    able to process digital payments until you reconnect an account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="cursor-pointer"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {!showConnectForm ? (
            <div className="flex flex-col items-start gap-4">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  No payment gateway is connected. Connect your Xendit account to enable digital
                  payments (QRIS, Virtual Account, E-Wallet) at the POS terminal.
                </p>
              </div>
              <Button
                className="cursor-pointer gap-2"
                onClick={() => setShowConnectForm(true)}
              >
                <Plug className="h-4 w-4" />
                Connect Xendit Account
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Connect Xendit Account</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer text-muted-foreground"
                  onClick={() => setShowConnectForm(false)}
                >
                  Cancel
                </Button>
              </div>
              <ConnectXenditForm />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
