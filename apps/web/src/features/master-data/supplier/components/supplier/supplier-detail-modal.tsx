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
import { Edit, Phone, Landmark } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Supplier } from "../../types";
import { useSupplier } from "../../hooks/use-suppliers";
import { SupplierPhoneList } from "./supplier-phone-list";
import { SupplierBankList } from "./supplier-bank-list";

interface SupplierDetailModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Pass full object (from a list) or use supplierId to auto-fetch. */
  readonly supplier?: Supplier | null;
  readonly supplierId?: string | null;
  readonly onEdit?: (supplier: Supplier) => void;
}

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

export function SupplierDetailModal({
  open,
  onOpenChange,
  supplier: supplierProp,
  supplierId,
  onEdit,
}: SupplierDetailModalProps) {
  const t = useTranslations("supplier.supplier");
  const tCommon = useTranslations("supplier.common");
  const { data, isLoading } = useSupplier(supplierId ?? supplierProp?.id ?? "", {
    enabled: open && !!(supplierId || supplierProp?.id),
  });

  // Always prefer the fetched full detail data if available, otherwise fallback to the prop.
  // The prop usually only contains shallow list data (missing phone numbers and bank accounts).
  const supplier = data?.data ?? supplierProp ?? null;

  if (open && isLoading && !supplierProp) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="xl"
          className="max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{tCommon("viewDetails")}</DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-4">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
 }

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

        {/* Body with tabs (Details / Phones / Banks) */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList>
              <TabsTrigger value="details">{tCommon("viewDetails")}</TabsTrigger>
              <TabsTrigger value="phones" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                {t("sections.phoneNumbers")}
                {(supplier.phone_numbers?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                    {supplier.phone_numbers?.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="banks" className="flex items-center gap-2">
                <Landmark className="h-3.5 w-3.5" />
                {t("sections.bankAccounts")}
                {(supplier.bank_accounts?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                    {supplier.bank_accounts?.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("sections.basicInfo")}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.contactPerson")}</TableCell>
                        <TableCell>{supplier.contact_person ?? "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.supplierType")}</TableCell>
                        <TableCell>{supplier.supplier_type?.name ?? "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("form.paymentTerms")}</TableCell>
                        <TableCell>{supplier.payment_terms?.name ?? "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("form.businessUnit")}</TableCell>
                        <TableCell>{supplier.business_unit?.name ?? "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("form.email")}</TableCell>
                        <TableCell>
                          {supplier.email ? (
                            <a href={`mailto:${supplier.email}`} className="text-primary hover:underline cursor-pointer">
                              {supplier.email}
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("form.website")}</TableCell>
                        <TableCell>
                          {supplier.website ? (
                            <a href={supplier.website} target="_blank" rel="noreferrer" className="text-primary hover:underline cursor-pointer">
                              {supplier.website}
                            </a>
                          ) : "-"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("form.npwp")}</TableCell>
                        <TableCell colSpan={3}>{supplier.npwp ?? "-"}</TableCell>
                      </TableRow>
                      {supplier.notes && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">Notes</TableCell>
                          <TableCell colSpan={3} className="whitespace-pre-wrap">{supplier.notes}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Contact Numbers */}
              {(supplier.phone_numbers?.length ?? 0) > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 mt-6">{t("sections.phoneNumbers")}</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableBody>
                        {supplier.phone_numbers?.map((phone) => (
                          <TableRow key={phone.id}>
                            <TableCell className="font-medium bg-muted/50 w-48">{phone.label || "Phone"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{phone.phone_number}</span>
                                {phone.is_primary && (
                                  <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <h3 className="text-sm font-semibold mb-3 mt-6">{t("sections.location")}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.address")}</TableCell>
                        <TableCell colSpan={3}>{supplier.address ?? "-"}</TableCell>
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
                        <TableCell>{village?.name ?? "-"}</TableCell>
                      </TableRow>
                      {areaText && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">Full Area</TableCell>
                          <TableCell colSpan={3}>{areaText}</TableCell>
                        </TableRow>
                      )}
                      {(supplier.latitude != null || supplier.longitude != null) && (
                        <TableRow>
                          <TableCell className="font-medium bg-muted/50">{t("sections.coordinates")}</TableCell>
                          <TableCell colSpan={3}>
                            {supplier.latitude}, {supplier.longitude}
                            {" • "}
                            <a
                              href={`https://maps.google.com/?q=${supplier.latitude},${supplier.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline cursor-pointer"
                            >
                              Open in Maps
                            </a>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="phones">
              <SupplierPhoneList
                supplierId={supplier.id}
                phones={supplier.phone_numbers || []}
              />
            </TabsContent>

            <TabsContent value="banks">
              <SupplierBankList
                supplierId={supplier.id}
                banks={supplier.bank_accounts || []}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

