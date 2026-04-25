"use client";

import { useTranslations } from "next-intl";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

import type { LoyaltyProgram } from "../types";

interface LoyaltyProgramDetailDialogProps {
  program: LoyaltyProgram | null;
  open: boolean;
  onClose: () => void;
}

export function LoyaltyProgramDetailDialog({
  program,
  open,
  onClose,
}: LoyaltyProgramDetailDialogProps) {
  const t = useTranslations("loyalty");

  if (!program) return null;

  const { config } = program;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {program.name}
            <Badge variant={program.is_active ? "default" : "secondary"}>
              {program.is_active ? t("programs.active") : t("programs.inactive")}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Basic info */}
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="text-muted-foreground w-36">{t("programs.form.outlet")}</TableCell>
                <TableCell>
                  {program.outlet_id ? (
                    <Badge variant="outline" className="text-xs font-normal">{t("programs.scopeOutlet")}</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs font-normal">{t("programs.scopeGlobal")}</Badge>
                  )}
                </TableCell>
              </TableRow>
              {program.description && (
                <TableRow>
                  <TableCell className="text-muted-foreground">{t("programs.form.description")}</TableCell>
                  <TableCell>{program.description}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="text-muted-foreground">Members</TableCell>
                <TableCell>{(program.member_count ?? program.members_count ?? 0).toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-muted-foreground">Created</TableCell>
                <TableCell>{format(new Date(program.created_at), "dd MMM yyyy")}</TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Point rules */}
          <div>
            <p className="font-semibold mb-2">Point Rules</p>
            <Separator className="mb-3" />
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="text-muted-foreground w-48">Points per amount</TableCell>
                  <TableCell>{config?.point_rules?.points_per_amount ?? "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Amount per point (IDR)</TableCell>
                  <TableCell>{config?.point_rules?.amount_per_point?.toLocaleString() ?? "—"}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-muted-foreground">Point expiry (days)</TableCell>
                  <TableCell>{config?.point_expiry_days ?? "—"}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Tiers */}
          {config?.tiers?.length > 0 && (
            <div>
              <p className="font-semibold mb-2">Tiers</p>
              <Separator className="mb-3" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Min Points</TableHead>
                    <TableHead className="text-right">Multiplier</TableHead>
                    <TableHead>Color</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.tiers.map((tier, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{tier.name}</TableCell>
                      <TableCell className="text-right">{tier.min_lifetime_points.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{tier.multiplier}×</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded-full border"
                            style={{ backgroundColor: tier.badge_color }}
                          />
                          <span className="text-xs text-muted-foreground">{tier.badge_color}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Rewards */}
          {config?.rewards?.length > 0 && (
            <div>
              <p className="font-semibold mb-2">Rewards</p>
              <Separator className="mb-3" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Points Required</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.rewards.map((reward) => (
                    <TableRow key={reward.id}>
                      <TableCell className="font-medium">{reward.name}</TableCell>
                      <TableCell className="capitalize text-muted-foreground text-xs">{reward.type.replace("_", " ")}</TableCell>
                      <TableCell className="text-right">
                        {reward.type === "discount_percent"
                          ? `${reward.value}%`
                          : reward.type === "discount_fixed"
                          ? `Rp ${reward.value.toLocaleString()}`
                          : reward.merch_description ?? `Rp ${reward.value.toLocaleString()}`}
                      </TableCell>
                      <TableCell className="text-right">{reward.points_required.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={reward.is_active ? "default" : "secondary"} className="text-xs">
                          {reward.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
