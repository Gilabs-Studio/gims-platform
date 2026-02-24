"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  User,
  Landmark,
  Building2,
  Edit,
} from "lucide-react";
import type { Supplier } from "../../types";

interface SupplierDetailModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly supplier: Supplier | null;
  readonly onEdit?: (supplier: Supplier) => void;
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
      <span className="text-xs font-medium break-words">{value ?? "-"}</span>
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

export function SupplierDetailModal({
  open,
  onOpenChange,
  supplier,
  onEdit,
}: SupplierDetailModalProps) {
  const t = useTranslations("supplier.supplier");
  const tCommon = useTranslations("supplier.common");
  const tPhone = useTranslations("supplier.phoneNumber");
  const tBank = useTranslations("supplier.bankAccount");

  if (!supplier) return null;

  // Resolve geographic hierarchy from nested village or direct fields
  const village = supplier.village;
  const districtVillage = village?.district;
  const cityVillage = districtVillage?.city;
  const provinceVillage = cityVillage?.province;

  const district = districtVillage ?? supplier.district;
  const city = cityVillage ?? supplier.city;
  const province = provinceVillage ?? supplier.province;

  const areaText = [village?.name, district?.name, city?.name, province?.name]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="xl"
        className="max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-semibold leading-tight truncate">
                {supplier.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {supplier.code}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="default" className="h-5 text-[10px]">
                  {supplier.is_active ? tCommon("active") : tCommon("inactive")}
                </Badge>
                {supplier.supplier_type && (
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {supplier.supplier_type.name}
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
                  onEdit(supplier);
                  onOpenChange(false);
                }}
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                {tCommon("edit")}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Flat scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Basic Info + Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GroupBox title={t("sections.basicInfo")}>
              <InfoRow
                label={t("form.contactPerson")}
                icon={User}
                value={supplier.contact_person}
              />
              <InfoRow
                label={t("form.email")}
                icon={Mail}
                value={supplier.email}
              />
              <InfoRow
                label={t("form.website")}
                icon={Globe}
                value={
                  supplier.website ? (
                    <a
                      href={supplier.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline cursor-pointer"
                    >
                      {supplier.website}
                    </a>
                  ) : undefined
                }
              />
              <InfoRow
                label={t("form.npwp")}
                icon={CreditCard}
                value={supplier.npwp}
              />
              <InfoRow
                label={t("form.supplierType")}
                icon={Building2}
                value={supplier.supplier_type?.name}
              />
            </GroupBox>

            <GroupBox title="Notes">
              <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed min-h-[60px]">
                {supplier.notes || "-"}
              </div>
            </GroupBox>
          </div>

          {/* Location */}
          <GroupBox title={t("sections.location")}>
            <InfoRow
              label={t("form.address")}
              icon={MapPin}
              value={supplier.address}
            />
            <InfoRow label={t("form.province")} value={province?.name} />
            <InfoRow label={t("form.city")} value={city?.name} />
            <InfoRow label={t("form.district")} value={district?.name} />
            <InfoRow label={t("form.village")} value={village?.name} />
            {areaText && <InfoRow label="Full Area" value={areaText} />}
          </GroupBox>

          {/* Coordinates (optional) */}
          {(supplier.latitude != null || supplier.longitude != null) && (
            <GroupBox title={t("sections.coordinates")}>
              <InfoRow
                label="Latitude"
                value={
                  supplier.latitude != null ? (
                    <span className="font-mono text-xs">
                      {Number(supplier.latitude).toFixed(6)}
                    </span>
                  ) : undefined
                }
              />
              <InfoRow
                label="Longitude"
                value={
                  supplier.longitude != null ? (
                    <span className="font-mono text-xs">
                      {Number(supplier.longitude).toFixed(6)}
                    </span>
                  ) : undefined
                }
              />
              <InfoRow
                label="Google Maps"
                value={
                  supplier.latitude != null && supplier.longitude != null ? (
                    <a
                      href={`https://maps.google.com/?q=${supplier.latitude},${supplier.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2 text-xs"
                    >
                      Open in Maps
                    </a>
                  ) : undefined
                }
              />
            </GroupBox>
          )}

          {/* Phone Numbers */}
          <div className="rounded-md border bg-muted/20 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("sections.phoneNumbers")}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {supplier.phone_numbers?.length ?? 0} numbers
              </span>
            </div>
            {supplier.phone_numbers && supplier.phone_numbers.length > 0 ? (
              <div className="divide-y">
                {supplier.phone_numbers.map((phone, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="flex-1 text-sm font-medium truncate">
                      {phone.phone_number}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {phone.label && (
                        <span className="text-xs text-muted-foreground">
                          {phone.label}
                        </span>
                      )}
                      {phone.is_primary && (
                        <Badge variant="secondary" className="text-[10px]">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-6">
                {tPhone("empty")}
              </p>
            )}
          </div>

          {/* Bank Accounts */}
          <div className="rounded-md border bg-muted/20 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
              <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("sections.bankAccounts")}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {supplier.bank_accounts?.length ?? 0} accounts
              </span>
            </div>
            {supplier.bank_accounts && supplier.bank_accounts.length > 0 ? (
              <div className="divide-y">
                {supplier.bank_accounts.map((bank, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {bank.bank?.name ?? "Bank"}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {bank.account_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {bank.account_name}
                      </span>
                      {bank.branch && (
                        <span className="text-[10px] text-muted-foreground">
                          ({bank.branch})
                        </span>
                      )}
                      {bank.is_primary && (
                        <Badge variant="secondary" className="text-[10px]">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-6">
                {tBank("empty")}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

