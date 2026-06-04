"use client";

import { useState } from "react";
import {
  Building2,
  Users,
  Crown,
  Mail,
  Store,
  Warehouse,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenantDetail } from "../hooks/use-tenants";
import type { Tenant } from "../types";

type TenantDetailTab = "general" | "business" | "owner" | "compliance";

interface TenantDetailDialogProps {
  readonly tenant: Tenant | null;
  readonly open: boolean;
  readonly onClose: () => void;
}

export function TenantDetailDialog({ tenant, open, onClose }: TenantDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<TenantDetailTab>("general");
  const { data: detail, isLoading } = useTenantDetail(open ? (tenant?.id ?? null) : null);

  const displayTenant = detail ?? tenant;
  const usagePercent = displayTenant
    ? Math.min(100, ((displayTenant.current_users ?? 0) / displayTenant.max_users) * 100)
    : 0;
  const isAtLimit = (displayTenant?.current_users ?? 0) >= (displayTenant?.max_users ?? 1);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setActiveTab("general");
          onClose();
        }
      }}
    >
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">
                {displayTenant?.name ?? "Tenant Detail"}
              </DialogTitle>
              {displayTenant?.slug && (
                <p className="text-sm text-muted-foreground font-mono mt-0.5">
                  /{displayTenant.slug}
                </p>
              )}
            </div>
            {displayTenant && (
              <StatusBadge status={displayTenant.status} />
            )}
          </div>
        </DialogHeader>

        {isLoading && !displayTenant ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : displayTenant ? (
          <Tabs
            value={activeTab}
            onValueChange={(v) =>
              setActiveTab(v as TenantDetailTab)
            }
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="owner">Owner</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            {/* ── General Tab ── */}
            <TabsContent value="general" className="space-y-6 py-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 w-40">Tenant ID</TableCell>
                      <TableCell className="font-mono text-xs break-all">{displayTenant.id}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">Plan</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {displayTenant.plan}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">Status</TableCell>
                      <TableCell><StatusBadge status={displayTenant.status} /></TableCell>
                    </TableRow>
                    {displayTenant.created_at && (
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">Created</TableCell>
                        <TableCell>
                          {new Date(displayTenant.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  User Quota
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-40">Users</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                isAtLimit
                                  ? "font-semibold text-destructive"
                                  : "font-semibold"
                              }
                            >
                              {displayTenant.current_users ?? 0}
                            </span>
                            <span className="text-muted-foreground">
                              / {displayTenant.max_users} max
                            </span>
                            {isAtLimit && (
                              <Badge variant="destructive" className="text-xs">
                                Limit reached
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-2 px-1">
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isAtLimit ? "bg-destructive" : "bg-primary"
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {usagePercent.toFixed(0)}% used
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ── Business Tab ── */}
            <TabsContent value="business" className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  icon={<Building2 className="h-5 w-5 text-primary" />}
                  label="Companies"
                  value={displayTenant.company_count ?? 0}
                />
                <StatCard
                  icon={<Store className="h-5 w-5 text-primary" />}
                  label="Outlets"
                  value={displayTenant.outlet_count ?? 0}
                />
                <StatCard
                  icon={<Warehouse className="h-5 w-5 text-primary" />}
                  label="Warehouses"
                  value={displayTenant.warehouse_count ?? 0}
                />
              </div>

              <Separator />

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 w-40">Companies</TableCell>
                      <TableCell>
                        {displayTenant.company_count ?? 0} registered
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">Outlets</TableCell>
                      <TableCell>
                        {displayTenant.outlet_count ?? 0} registered
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50">Warehouses</TableCell>
                      <TableCell>
                        {displayTenant.warehouse_count ?? 0} registered
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ── Owner Tab ── */}
            <TabsContent value="owner" className="space-y-6 py-4">
              {displayTenant.owner_name || displayTenant.owner_email ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      {displayTenant.owner_name && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50 w-40">
                            <span className="flex items-center gap-2">
                              <Crown className="h-4 w-4" />
                              Name
                            </span>
                          </TableCell>
                          <TableCell>{displayTenant.owner_name}</TableCell>
                        </TableRow>
                      )}
                      {displayTenant.owner_email && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">
                            <span className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email
                            </span>
                          </TableCell>
                          <TableCell>
                            <a
                              href={`mailto:${displayTenant.owner_email}`}
                              className="text-primary hover:underline"
                            >
                              {displayTenant.owner_email}
                            </a>
                          </TableCell>
                        </TableRow>
                      )}
                      {displayTenant.owner_user_id && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50 w-40">User ID</TableCell>
                          <TableCell className="font-mono text-xs break-all">
                            {displayTenant.owner_user_id}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                  <Crown className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No owner assigned to this tenant</p>
                </div>
              )}
            </TabsContent>

            {/* ── Compliance Tab ── */}
            <TabsContent value="compliance" className="space-y-6 py-4">
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Legal Compliance & Consent History
                </h3>
                {displayTenant.consent_logs && displayTenant.consent_logs.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableBody>
                        {displayTenant.consent_logs.map((log, index) => (
                          <TableRow key={index} className="hover:bg-muted/30">
                            <TableCell className="w-1/3 bg-muted/30 align-top">
                              <div className="space-y-1">
                                <p className="font-semibold text-sm capitalize">
                                  {log.consent_type === "tos" ? "Terms of Service" : log.consent_type === "privacy" ? "Privacy Policy" : log.consent_type}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  Version: {log.version}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground space-y-1">
                              <p>
                                <span className="font-semibold text-foreground">Granted:</span>{" "}
                                {new Date(log.granted_at).toLocaleString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              <p>
                                <span className="font-semibold text-foreground">IP Address:</span>{" "}
                                <code className="bg-muted px-1 py-0.5 rounded font-mono">{log.ip_address}</code>
                              </p>
                              <p className="max-w-[450px] truncate" title={log.user_agent}>
                                <span className="font-semibold text-foreground">User Agent:</span>{" "}
                                {log.user_agent}
                              </p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center gap-3 border rounded-lg">
                    <ShieldCheck className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No compliance consent records logged for this tenant&apos;s owner.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { readonly status: string }) {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    trial: "secondary",
    suspended: "destructive",
  };
  return (
    <Badge variant={map[status] ?? "outline"} className="capitalize">
      {status}
    </Badge>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: number;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-center space-y-2">
      <div className="flex justify-center">{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}
