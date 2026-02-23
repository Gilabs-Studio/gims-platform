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

import { useCustomer } from "../../hooks/use-customers";

export function CustomerDetailModal({
  open,
  onOpenChange,
  customer,
  onEdit,
}: CustomerDetailModalProps) {
  const t = useTranslations("customer.customer");
  const tPhone = useTranslations("customer.phoneNumber");
  const tBank = useTranslations("customer.bankAccount");

  // Fetch full detail when modal is open to get deep relationships (village, sales defaults)
  const { data: detailRes, isLoading } = useCustomer(open && customer ? customer.id : "");
  const fullCustomer = detailRes?.data ?? customer;

  if (!fullCustomer) return null;

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
    if (fullCustomer.address) parts.push(fullCustomer.address);
    if (fullCustomer.village?.name) parts.push(fullCustomer.village.name);
    if (fullCustomer.village?.district?.name) parts.push(fullCustomer.village.district.name);
    if (fullCustomer.village?.district?.city?.name) parts.push(fullCustomer.village.district.city.name);
    if (fullCustomer.village?.district?.city?.province?.name)
      parts.push(fullCustomer.village.district.city.province.name);
    return parts.join(", ") || "-";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        {isLoading && !detailRes ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {fullCustomer.name}
                {getStatusBadge(fullCustomer.status)}
              </DialogTitle>
            </DialogHeader>

        {/* Basic Info */}
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              {t("sections.basicInfo")}
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">{t("form.code")}</dt>
              <dd className="font-mono">{fullCustomer.code}</dd>
              <dt className="text-muted-foreground">{t("form.customerType")}</dt>
              <dd>{fullCustomer.customer_type?.name ?? "-"}</dd>
              <dt className="text-muted-foreground">{t("form.isActive")}</dt>
              <dd>
                <Badge variant={fullCustomer.is_active ? "success" : "secondary"}>
                  {fullCustomer.is_active ? "Active" : "Inactive"}
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
            {(fullCustomer.latitude != null || fullCustomer.longitude != null) && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("sections.coordinates")}: {fullCustomer.latitude}, {fullCustomer.longitude}
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
              <dd>{fullCustomer.contact_person ?? "-"}</dd>
              <dt className="text-muted-foreground">{t("form.email")}</dt>
              <dd>{fullCustomer.email ?? "-"}</dd>
              <dt className="text-muted-foreground">{t("form.website")}</dt>
              <dd>{fullCustomer.website ?? "-"}</dd>
              <dt className="text-muted-foreground">{t("form.npwp")}</dt>
              <dd>{fullCustomer.npwp ?? "-"}</dd>
            </dl>
          </section>

          {/* Phone Numbers */}
          {fullCustomer.phone_numbers && fullCustomer.phone_numbers.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {tPhone("title")}
                </h3>
                <div className="space-y-2">
                  {fullCustomer.phone_numbers.map((phone) => (
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
          {fullCustomer.bank_accounts && fullCustomer.bank_accounts.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {tBank("title")}
                </h3>
                <div className="space-y-2">
                  {fullCustomer.bank_accounts.map((bank) => (
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
          {fullCustomer.notes && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {t("form.notes")}
                </h3>
                <p className="text-sm whitespace-pre-wrap">{fullCustomer.notes}</p>
              </section>
            </>
          )}

          {/* Sales Defaults */}
          {(fullCustomer.default_business_type_id || fullCustomer.default_area_id || fullCustomer.default_sales_rep_id || fullCustomer.default_payment_terms_id || fullCustomer.default_tax_rate != null) && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                  {t("sections.salesDefaults")}
                </h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {fullCustomer.default_business_type && (
                    <>
                      <dt className="text-muted-foreground">{t("form.defaultBusinessType")}</dt>
                      <dd>{fullCustomer.default_business_type.name}</dd>
                    </>
                  )}
                  {fullCustomer.default_area && (
                    <>
                      <dt className="text-muted-foreground">{t("form.defaultArea")}</dt>
                      <dd>{fullCustomer.default_area.name}</dd>
                    </>
                  )}
                  {fullCustomer.default_sales_rep && (
                    <>
                      <dt className="text-muted-foreground">{t("form.defaultSalesRep")}</dt>
                      <dd>{fullCustomer.default_sales_rep.name}</dd>
                    </>
                  )}
                  {fullCustomer.default_payment_terms && (
                    <>
                      <dt className="text-muted-foreground">{t("form.defaultPaymentTerms")}</dt>
                      <dd>{fullCustomer.default_payment_terms.name}</dd>
                    </>
                  )}
                  {fullCustomer.default_tax_rate != null && (
                    <>
                      <dt className="text-muted-foreground">{t("form.defaultTaxRate")}</dt>
                      <dd>{fullCustomer.default_tax_rate}%</dd>
                    </>
                  )}
                </dl>
              </section>
            </>
          )}
        </div>
        {onEdit && (
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => onEdit(fullCustomer)}
              className="cursor-pointer"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
