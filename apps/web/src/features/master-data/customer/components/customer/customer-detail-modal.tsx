"use client";

import { useTranslations } from "next-intl";
import { MapPin, Edit, Landmark, Users, ExternalLink, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { CustomerContactsTab } from "@/features/crm/contact/components/customer-contacts-tab";
import { useCustomer } from "../../hooks/use-customers";
import type { Customer } from "../../types";
import { useUserPermission } from "@/hooks/use-user-permission";
import { CustomerBankList } from "./customer-bank-list";
import { formatCurrency } from "@/lib/utils";
import { useLoyaltyMemberByCustomer, useLoyaltyLedger } from "@/features/loyalty/hooks/use-loyalty";
import { LoyaltyTierBadge } from "@/features/loyalty/components/loyalty-tier-badge";

interface CustomerDetailModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly customer?: Customer | null;
  readonly customerId?: string | null;
  readonly onEdit?: (customer: Customer) => void;
}

export function CustomerDetailModal({
  open,
  onOpenChange,
  customer,
  customerId,
  onEdit,
}: CustomerDetailModalProps) {
  const t = useTranslations("customer.customer");
  const tContact = useTranslations("crmContact");

  // Permission-based features (must be stable across renders)
  const canManageBanks = useUserPermission("customer.update");

  // Always fetch fresh detail when modal opens so relationships are populated
  const activeCustomerId = customerId ?? customer?.id ?? "";

  const { data: detailRes, isLoading } = useCustomer(activeCustomerId, {
    enabled: open && !!activeCustomerId,
  });

  const entity = detailRes?.data ?? customer;

  if (!entity) return null;

  // Resolve geographic hierarchy from nested village or direct FK fields
  const village = entity.village;
  const villageName = village?.name || entity.village_name || null;
  const districtVillage = village?.district;
  const cityVillage = districtVillage?.city;
  const provinceVillage = cityVillage?.province;

  // Prefer direct preloaded relations (Province/City/District are preloaded separately by the API);
  // fall back to the nested village chain for backward compatibility.
  const district = entity.district ?? districtVillage;
  const city = entity.city ?? cityVillage;
  const province = entity.province ?? provinceVillage;

  const areaText = [villageName, district?.name, city?.name, province?.name]
    .filter(Boolean)
    .join(", ");

  const hasSalesDefaults =
    entity.default_business_type_id ||
    entity.default_sales_rep_id ||
    entity.default_payment_terms_id ||
    entity.default_tax_rate != null ||
    entity.credit_is_active ||
    (entity.credit_limit ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">
                {entity.name}
              </DialogTitle>
              <div className="flex items-center gap-3">
                <Badge
                  variant={entity.is_active ? "default" : "secondary"}
                  className="text-xs font-medium"
                >
                  {entity.is_active ? t("common.active") : t("common.inactive")}
                </Badge>
                {entity.customer_type && (
                  <Badge variant="outline" className="text-xs font-medium">
                    {entity.customer_type.name}
                  </Badge>
                )}
                {entity.code && (
                  <span className="text-sm text-muted-foreground font-mono">
                    {entity.code}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onEdit(entity);
                    onOpenChange(false);
                  }}
                  className="cursor-pointer"
                  title={t("common.edit")}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">{t("common.viewDetails")}</TabsTrigger>
              <TabsTrigger value="contacts" className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {tContact("tab")}
                {(entity.contacts_count ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                    {entity.contacts_count}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="banks" className="flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5" />
                {t("sections.bankAccounts")}
                {(entity.bank_accounts?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                    {entity.bank_accounts?.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="loyalty" className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5" />
                {t("common.loyalty")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 py-4">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("sections.basicInfo")}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.contactPerson")}</TableCell>
                        <TableCell>{entity.contact_person ?? "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.email")}</TableCell>
                        <TableCell>
                          {entity.email ? (
                            <a 
                              href={`mailto:${entity.email}`}
                              className="text-primary text-sm cursor-pointer hover:underline"
                            >
                              {entity.email}
                            </a>
                          ) : "-"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("form.website")}</TableCell>
                        <TableCell>
                          {entity.website ? (
                            <a
                              href={entity.website.startsWith("http") ? entity.website : `https://${entity.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              {t("common.visitLink")}
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("form.npwp")}</TableCell>
                        <TableCell>{entity.npwp ?? "-"}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              {/* Address */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t("sections.address")}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.address")}</TableCell>
                        <TableCell colSpan={3} className="whitespace-pre-wrap">{entity.address ?? "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.province")}</TableCell>
                        <TableCell>{province?.name ?? "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.city")}</TableCell>
                        <TableCell>{city?.name ?? "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("form.district")}</TableCell>
                        <TableCell>{district?.name ?? "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("form.village")}</TableCell>
                        <TableCell>{villageName ?? "-"}</TableCell>
                      </TableRow>
                      {areaText && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("form.fullArea")}</TableCell>
                          <TableCell colSpan={3}>{areaText}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Coordinates */}
              {(entity.latitude != null || entity.longitude != null) && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3">{t("sections.coordinates")}</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium bg-muted/50 w-48">{t("form.latitude")}</TableCell>
                            <TableCell>
                              {entity.latitude != null ? (
                                <span className="font-mono">{Number(entity.latitude).toFixed(6)}</span>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="font-medium bg-muted/50 w-48">{t("form.longitude")}</TableCell>
                            <TableCell>
                              {entity.longitude != null ? (
                                <span className="font-mono">{Number(entity.longitude).toFixed(6)}</span>
                              ) : "-"}
                            </TableCell>
                          </TableRow>
                          {entity.latitude != null && entity.longitude != null && (
                            <TableRow>
                              <TableCell className="font-medium bg-muted/50">{t("common.googleMaps")}</TableCell>
                              <TableCell colSpan={3}>
                                <a
                                  href={`https://maps.google.com/?q=${entity.latitude},${entity.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {t("common.openInMaps")}
                                </a>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}

              {/* Advanced Properties */}
              {(((entity.bank_accounts ?? []).length > 0) || hasSalesDefaults) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bank Accounts */}
                    <div className="space-y-6">
                      {(entity.bank_accounts ?? []).length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Landmark className="h-4 w-4" />
                            {t("sections.bankAccounts")}
                          </h3>
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableBody>
                                {entity.bank_accounts?.map((bank) => (
                                  <TableRow key={bank.id}>
                                    <TableCell>
                                      <p className="font-medium">{bank.account_name}</p>
                                      <p className="text-sm text-muted-foreground">{bank.bank?.name}</p>
                                    </TableCell>
                                    <TableCell>
                                      <p>{bank.account_number}</p>
                                      {bank.currency?.code && <p className="text-sm text-muted-foreground">{bank.currency.code}</p>}
                                      {bank.branch && <p className="text-sm text-muted-foreground">{bank.branch}</p>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {bank.is_primary && (
                                        <Badge variant="secondary" className="text-[10px]">{t("common.primary")}</Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sales Defaults */}
                    {hasSalesDefaults && (
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-sm font-semibold mb-3">{t("sections.salesDefaults")}</h3>
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableBody>
                                {entity.default_business_type && (
                                  <TableRow>
                                    <TableCell className="font-medium bg-muted/50 w-48">{t("form.defaultBusinessType")}</TableCell>
                                    <TableCell>{entity.default_business_type.name}</TableCell>
                                  </TableRow>
                                )}
                                {entity.default_sales_rep && (
                                  <TableRow>
                                    <TableCell className="font-medium bg-muted/50">{t("form.defaultSalesRep")}</TableCell>
                                    <TableCell>{entity.default_sales_rep.name}</TableCell>
                                  </TableRow>
                                )}
                                {entity.default_payment_terms && (
                                  <TableRow>
                                    <TableCell className="font-medium bg-muted/50">{t("form.defaultPaymentTerms")}</TableCell>
                                    <TableCell>{entity.default_payment_terms.name}</TableCell>
                                  </TableRow>
                                )}
                                {entity.default_tax_rate != null && (
                                  <TableRow>
                                    <TableCell className="font-medium bg-muted/50">{t("form.defaultTaxRate")}</TableCell>
                                    <TableCell>{entity.default_tax_rate}%</TableCell>
                                  </TableRow>
                                )}
                                <TableRow>
                                  <TableCell className="font-medium bg-muted/50">{t("form.creditIsActive")}</TableCell>
                                  <TableCell>
                                    <Badge variant={entity.credit_is_active ? "default" : "secondary"}>
                                      {entity.credit_is_active ? t("common.active") : t("common.inactive")}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                                {entity.credit_is_active && (
                                  <TableRow>
                                    <TableCell className="font-medium bg-muted/50">{t("form.creditLimit")}</TableCell>
                                    <TableCell className="font-semibold text-primary">
                                      {formatCurrency(entity.credit_limit ?? 0)}
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Notes */}
              {entity.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3">{t("form.notes")}</h3>
                    <div className="p-4 border rounded-lg bg-muted/10">
                      <p className="whitespace-pre-wrap">{entity.notes}</p>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="banks" className="py-4">
              {entity.id && (
                <CustomerBankList
                  customerId={entity.id}
                  banks={entity.bank_accounts ?? []}
                  isReadOnly={!canManageBanks}
                />
              )}
            </TabsContent>

            <TabsContent value="contacts" className="py-4">
              {entity.id && <CustomerContactsTab customerId={entity.id} />}
            </TabsContent>

            <TabsContent value="loyalty" className="py-4">
              <CustomerLoyaltyTab customerId={entity.id ?? ""} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Internal sub-component — fetches and renders the loyalty summary for a customer
function CustomerLoyaltyTab({ customerId }: { customerId: string }) {
  const { data: memberRes, isLoading: memberLoading } = useLoyaltyMemberByCustomer(customerId);
  const member = memberRes?.data ?? null;

  const { data: ledgerData, isLoading: ledgerLoading } = useLoyaltyLedger(member?.id ?? "");
  const entries = (ledgerData?.data ?? []).slice(0, 10);

  if (memberLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center text-muted-foreground">
        <Star className="h-10 w-10 opacity-30" />
        <p className="text-sm">This customer is not a loyalty member yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Member summary */}
      <div className="grid grid-cols-2 gap-3 text-sm rounded-xl border p-4">
        <div>
          <p className="text-muted-foreground text-xs">Member Code</p>
          <p className="font-mono font-semibold">{member.member_code}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Tier</p>
          <LoyaltyTierBadge tier={member.current_tier} badgeColor={member.tier_badge_color} />
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Point Balance</p>
          <p className="font-semibold text-primary">{member.point_balance.toLocaleString()} pts</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Lifetime Points</p>
          <p className="font-medium">{member.lifetime_points.toLocaleString()}</p>
        </div>
      </div>

      <Separator />

      {/* Recent ledger */}
      <div>
        <p className="text-sm font-semibold mb-2">Recent Activity</p>
        {ledgerLoading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No point history yet.</p>
        ) : (
          <div className="space-y-0.5">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                <span className="text-muted-foreground">
                  {new Date(entry.created_at).toLocaleDateString()}
                </span>
                <Badge variant="outline" className="text-[10px] capitalize">{entry.entry_type}</Badge>
                <span className={entry.points >= 0 ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
                  {entry.points >= 0 ? "+" : ""}{entry.points} pts
                </span>
                <span className="text-muted-foreground tabular-nums">{entry.balance_after.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
