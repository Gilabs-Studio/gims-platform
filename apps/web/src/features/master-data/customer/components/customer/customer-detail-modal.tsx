"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Edit, Phone, Landmark, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerContactsTab } from "@/features/crm/contact/components/customer-contacts-tab";
import { useCustomer } from "../../hooks/use-customers";
import type { Customer } from "../../types";

interface CustomerDetailModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly customer?: Customer | null;
  readonly onEdit?: (customer: Customer) => void;
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5 flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3 shrink-0" />}
        {label}
      </span>
      <span className="text-xs font-medium wrap-break-word">{value ?? "-"}</span>
    </div>
  );
}

function GroupBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

export function CustomerDetailModal({
  open,
  onOpenChange,
  customer,
  onEdit,
}: CustomerDetailModalProps) {
  const t = useTranslations("customer.customer");
  const tContact = useTranslations("crmContact");
  const [activeTab, setActiveTab] = useState("details");

  // Always fetch fresh detail when modal opens so relationships are populated
  const { data: detailRes, isLoading } = useCustomer(customer?.id ?? "", {
    enabled: open && !!customer?.id,
  });

  const entity = detailRes?.data ?? customer;

  if (!entity) return null;

  // Resolve geographic hierarchy from nested village or direct FK fields
  const village = entity.village;
  const districtVillage = village?.district;
  const cityVillage = districtVillage?.city;
  const provinceVillage = cityVillage?.province;

  // Prefer direct preloaded relations (Province/City/District are preloaded separately by the API);
  // fall back to the nested village chain for backward compatibility.
  const district = entity.district ?? districtVillage;
  const city = entity.city ?? cityVillage;
  const province = entity.province ?? provinceVillage;

  const areaText = [village?.name, district?.name, city?.name, province?.name]
    .filter(Boolean)
    .join(", ");

  const hasSalesDefaults =
    entity.default_business_type_id ||
    entity.default_area_id ||
    entity.default_sales_rep_id ||
    entity.default_payment_terms_id ||
    entity.default_tax_rate != null;

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v) setActiveTab("details");
      onOpenChange(v);
    }}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight truncate">
                {entity.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {entity.code}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge
                  variant={entity.is_active ? "default" : "secondary"}
                  className="h-5 text-[10px]"
                >
                  {entity.is_active ? t("common.active") : t("common.inactive")}
                </Badge>
                {entity.customer_type && (
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {entity.customer_type.name}
                  </Badge>
                )}
              </div>
            </div>

            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 cursor-pointer"
                onClick={() => {
                  onEdit(entity);
                  onOpenChange(false);
                }}
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                {t("common.edit")}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Tab navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-5 pt-0">
          <TabsList className="w-full">
            <TabsTrigger value="details" className="cursor-pointer">
              {t("common.viewDetails")}
            </TabsTrigger>
            <TabsTrigger value="contacts" className="cursor-pointer">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              {tContact("tab")}
              {(entity.contacts_count ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">
                  {entity.contacts_count}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Contacts tab content */}
        {activeTab === "contacts" && entity.id && (
          <div className="overflow-y-auto flex-1 px-5 py-4">
            <CustomerContactsTab customerId={entity.id} />
          </div>
        )}

        {/* Details tab content */}
        <div className={`overflow-y-auto flex-1 px-5 py-4 space-y-4 ${activeTab !== "details" ? "hidden" : ""}`}>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              {/* Basic Info + Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GroupBox title={t("sections.basicInfo")}>
                  <InfoRow label={t("form.contactPerson")} value={entity.contact_person} />
                  <InfoRow label={t("form.email")} value={entity.email} />
                  <InfoRow label={t("form.website")} value={entity.website} />
                  <InfoRow label={t("form.npwp")} value={entity.npwp} />
                </GroupBox>

                <GroupBox title={t("sections.address")}>
                  <InfoRow label={t("form.address")} icon={MapPin} value={entity.address} />
                  <InfoRow label={t("form.province")} value={province?.name} />
                  <InfoRow label={t("form.city")} value={city?.name} />
                  <InfoRow label={t("form.district")} value={district?.name} />
                  <InfoRow label={t("form.village")} value={village?.name} />
                  {areaText && <InfoRow label={t("form.fullArea")} value={areaText} />}
                </GroupBox>
              </div>

              {/* Coordinates */}
              {(entity.latitude != null || entity.longitude != null) && (
                <GroupBox title={t("sections.coordinates")}>
                  <InfoRow
                    label={t("form.latitude")}
                    value={
                      entity.latitude != null ? (
                        <span className="font-mono text-xs">
                          {Number(entity.latitude).toFixed(6)}
                        </span>
                      ) : undefined
                    }
                  />
                  <InfoRow
                    label={t("form.longitude")}
                    value={
                      entity.longitude != null ? (
                        <span className="font-mono text-xs">
                          {Number(entity.longitude).toFixed(6)}
                        </span>
                      ) : undefined
                    }
                  />
                  {entity.latitude != null && entity.longitude != null && (
                    <InfoRow
                      label="Google Maps"
                      value={
                        <a
                          href={`https://maps.google.com/?q=${entity.latitude},${entity.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 text-xs"
                        >
                          Open in Maps
                        </a>
                      }
                    />
                  )}
                </GroupBox>
              )}

              {/* Phone Numbers */}
              {entity.phone_numbers && entity.phone_numbers.length > 0 && (
                <GroupBox title={t("sections.phoneNumbers")}>
                  <div className="space-y-1.5 pt-1">
                    {entity.phone_numbers.map((phone) => (
                      <div
                        key={phone.id}
                        className="flex items-center justify-between rounded border bg-background px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium">{phone.phone_number}</span>
                          {phone.label && (
                            <span className="text-xs text-muted-foreground">({phone.label})</span>
                          )}
                        </div>
                        {phone.is_primary && (
                          <Badge variant="default" className="h-4 text-[9px] px-1.5">
                            Primary
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </GroupBox>
              )}

              {/* Bank Accounts */}
              {entity.bank_accounts && entity.bank_accounts.length > 0 && (
                <GroupBox title={t("sections.bankAccounts")}>
                  <div className="space-y-1.5 pt-1">
                    {entity.bank_accounts.map((bank) => (
                      <div
                        key={bank.id}
                        className="flex items-start justify-between rounded border bg-background px-3 py-2"
                      >
                        <div className="flex items-start gap-2">
                          <Landmark className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium">{bank.account_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {bank.bank?.name ?? ""} · {bank.account_number}
                              {bank.branch ? ` · ${bank.branch}` : ""}
                            </p>
                          </div>
                        </div>
                        {bank.is_primary && (
                          <Badge variant="default" className="h-4 text-[9px] px-1.5 shrink-0">
                            Primary
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </GroupBox>
              )}

              {/* Sales Defaults */}
              {hasSalesDefaults && (
                <GroupBox title={t("sections.salesDefaults")}>
                  {entity.default_business_type && (
                    <InfoRow
                      label={t("form.defaultBusinessType")}
                      value={entity.default_business_type.name}
                    />
                  )}
                  {entity.default_area && (
                    <InfoRow
                      label={t("form.defaultArea")}
                      value={entity.default_area.name}
                    />
                  )}
                  {entity.default_sales_rep && (
                    <InfoRow
                      label={t("form.defaultSalesRep")}
                      value={entity.default_sales_rep.name}
                    />
                  )}
                  {entity.default_payment_terms && (
                    <InfoRow
                      label={t("form.defaultPaymentTerms")}
                      value={entity.default_payment_terms.name}
                    />
                  )}
                  {entity.default_tax_rate != null && (
                    <InfoRow
                      label={t("form.defaultTaxRate")}
                      value={`${entity.default_tax_rate}%`}
                    />
                  )}
                </GroupBox>
              )}

              {/* Notes */}
              {entity.notes && (
                <GroupBox title={t("form.notes")}>
                  <p className="text-xs whitespace-pre-wrap pt-1">{entity.notes}</p>
                </GroupBox>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
