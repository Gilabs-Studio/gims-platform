"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Edit } from "lucide-react";
import type { Customer } from "../../types";

interface CustomerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onEdit?: (customer: Customer) => void;
}

export function CustomerDetailModal({
  open,
  onOpenChange,
  customer,
  onEdit,
}: CustomerDetailModalProps) {
  const t = useTranslations("customer.customer");
  const tPhone = useTranslations("customer.phoneNumber");
  const tBank = useTranslations("customer.bankAccount");

  if (!customer) return null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
      draft: "secondary",
      pending: "warning",
      approved: "success",
      rejected: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {t(`status.${status}`)}
      </Badge>
    );
  };

  // Build full address from village chain
  const getFullAddress = () => {
    const parts: string[] = [];
    if (customer.address) parts.push(customer.address);
    if (customer.village?.name) parts.push(customer.village.name);
    if (customer.village?.district?.name) parts.push(customer.village.district.name);
    if (customer.village?.district?.city?.name) parts.push(customer.village.district.city.name);
    if (customer.village?.district?.city?.province?.name)
      parts.push(customer.village.district.city.province.name);
    return parts.join(", ") || "-";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {customer.name}
            {getStatusBadge(customer.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              {t("sections.basicInfo")}
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t("form.code")}</dt>
              <dd className="font-mono">{customer.code}</dd>
              <dt className="text-muted-foreground">{t("form.customerType")}</dt>
              <dd>{customer.customer_type?.name ?? "-"}</dd>
              <dt className="text-muted-foreground">{t("form.isActive")}</dt>
              <dd>
                <Badge variant={customer.is_active ? "success" : "secondary"}>
                  {customer.is_active ? "Active" : "Inactive"}
                </Badge>
              </dd>
            </dl>
          </section>

          <Separator />

          {/* Address */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              {t("sections.address")}
            </h3>
            <p className="text-sm">{getFullAddress()}</p>
            {(customer.latitude != null || customer.longitude != null) && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("sections.coordinates")}: {customer.latitude}, {customer.longitude}
              </p>
            )}
          </section>

          <Separator />

          {/* Contact */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              {t("sections.contact")}
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t("form.contactPerson")}</dt>
              <dd>{customer.contact_person ?? "-"}</dd>
              <dt className="text-muted-foreground">{t("form.email")}</dt>
              <dd>{customer.email ?? "-"}</dd>
              <dt className="text-muted-foreground">{t("form.website")}</dt>
              <dd>{customer.website ?? "-"}</dd>
              <dt className="text-muted-foreground">{t("form.npwp")}</dt>
              <dd>{customer.npwp ?? "-"}</dd>
            </dl>
          </section>

          {/* Phone Numbers */}
          {customer.phone_numbers && customer.phone_numbers.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {tPhone("title")}
                </h3>
                <div className="space-y-2">
                  {customer.phone_numbers.map((phone) => (
                    <div
                      key={phone.id}
                      className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                    >
                      <div>
                        <span className="font-medium">{phone.phone_number}</span>
                        {phone.label && (
                          <span className="text-muted-foreground ml-2">({phone.label})</span>
                        )}
                      </div>
                      {phone.is_primary && (
                        <Badge variant="outline" className="text-xs">Primary</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Bank Accounts */}
          {customer.bank_accounts && customer.bank_accounts.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {tBank("title")}
                </h3>
                <div className="space-y-2">
                  {customer.bank_accounts.map((bank) => (
                    <div
                      key={bank.id}
                      className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                    >
                      <div>
                        <span className="font-medium">{bank.account_name}</span>
                        <span className="text-muted-foreground ml-2">
                          {bank.bank?.name ?? ""} - {bank.account_number}
                        </span>
                        {bank.branch && (
                          <span className="text-muted-foreground ml-1">({bank.branch})</span>
                        )}
                      </div>
                      {bank.is_primary && (
                        <Badge variant="outline" className="text-xs">Primary</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Notes */}
          {customer.notes && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {t("form.notes")}
                </h3>
                <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
              </section>
            </>
          )}
        </div>
        {onEdit && (
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => onEdit(customer)}
              className="cursor-pointer"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
