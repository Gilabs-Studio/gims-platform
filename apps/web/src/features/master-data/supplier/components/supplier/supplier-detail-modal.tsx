
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  CreditCard,
  FileText,
  User,
  Landmark,
  StickyNote,
} from "lucide-react";
import type { Supplier } from "../../types";

interface SupplierDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

export function SupplierDetailModal({
  open,
  onOpenChange,
  supplier,
}: SupplierDetailModalProps) {
  const t = useTranslations("supplier.supplier");
  const tCommon = useTranslations("supplier.common");
  const tPhone = useTranslations("supplier.phoneNumber");
  const tBank = useTranslations("supplier.bankAccount");

  if (!supplier) return null;

  const DetailItem = ({
    icon: Icon,
    label,
    value,
    className,
  }: {
    icon: any;
    label: string;
    value?: string | number | null | React.ReactNode;
    className?: string;
  }) => (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground">
        <Icon className="w-4 h-4" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <div className="text-sm font-medium text-foreground">
          {value || "-"}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                {supplier.name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold">
                  {supplier.name}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="font-mono">
                    {supplier.code}
                  </Badge>
                  <span>•</span>
                  <span>{supplier.supplier_type?.name || "-"}</span>
                  <span>•</span>
                  <Badge 
                    variant={supplier.is_active ? "active" : "inactive"}
                  >
                    {supplier.is_active ? tCommon("active") : tCommon("inactive")}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <div className="px-6">
              <TabsList className="w-full justify-start h-12 bg-transparent border-b rounded-none p-0 space-x-6">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 pt-2 font-medium cursor-pointer shadow-none"
                >
                  {t("sections.basicInfo")}
                </TabsTrigger>
                <TabsTrigger
                  value="phones"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 pt-2 font-medium cursor-pointer shadow-none"
                >
                  {t("sections.phoneNumbers")}
                </TabsTrigger>
                <TabsTrigger
                  value="banks"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 pt-2 font-medium cursor-pointer shadow-none"
                >
                  {t("sections.bankAccounts")}
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                <TabsContent value="overview" className="mt-0 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {t("sections.basicInfo")}
                      </h4>
                      <div className="grid gap-4">
                        <DetailItem
                          icon={User}
                          label={t("form.contactPerson")}
                          value={supplier.contact_person}
                        />
                        <DetailItem
                          icon={Mail}
                          label={t("form.email")}
                          value={supplier.email}
                        />
                        <DetailItem
                          icon={Globe}
                          label={t("form.website")}
                          value={
                            supplier.website ? (
                              <a
                                href={supplier.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline hover:cursor-pointer"
                              >
                                {supplier.website}
                              </a>
                            ) : undefined
                          }
                        />
                         <DetailItem
                          icon={CreditCard}
                          label={t("form.npwp")}
                          value={supplier.npwp}
                        />
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {t("sections.address")}
                      </h4>
                      <div className="grid gap-4">
                        <DetailItem
                          icon={MapPin}
                          label={t("form.address")}
                          value={supplier.address}
                          className="col-span-full"
                        />
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Area
                          </p>
                          <p className="text-sm font-medium">
                            {[
                              supplier.village?.name,
                              supplier.village?.district?.name,
                              supplier.village?.district?.city?.name,
                              supplier.village?.district?.city?.province?.name,
                            ]
                              .filter(Boolean)
                              .join(", ") || "-"}
                          </p>
                        </div>
                        {(supplier.latitude != null || supplier.longitude != null) && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {t("sections.coordinates")}
                            </p>
                            <p className="font-mono text-xs text-muted-foreground bg-muted p-1 rounded w-fit">
                              {supplier.latitude ?? "-"}, {supplier.longitude ?? "-"}
                            </p>
                          </div>
                        )}
                      </div>
                    </section>

                     <section className="space-y-4 col-span-full">
                       <Separator />
                       <h4 className="text-sm font-semibold flex items-center gap-2 mt-4">
                        <StickyNote className="w-4 h-4" />
                         Notes
                       </h4>
                       <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                         {supplier.notes || "-"}
                       </p>
                     </section>
                  </div>
                </TabsContent>

                <TabsContent value="phones" className="mt-0">
                  <div className="space-y-4">
                     {supplier.phone_numbers && supplier.phone_numbers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {supplier.phone_numbers.map((phone, index) => (
                             <div key={index} className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                               <div className="flex items-center gap-2 mb-2">
                                 <Phone className="h-4 w-4 text-muted-foreground"/>
                                 <span className="font-semibold">{phone.phone_number}</span>
                                 {phone.is_primary && (
                                    <Badge variant="secondary" className="ml-auto text-[10px]">Primary</Badge>
                                 )}
                               </div>
                               {phone.label && <p className="text-xs text-muted-foreground pl-6">{phone.label}</p>}
                             </div>
                          ))}
                        </div>
                     ) : (
                        <div className="text-center py-8 text-muted-foreground">
                           {tPhone("empty")}
                        </div>
                     )}
                  </div>
                </TabsContent>

                <TabsContent value="banks" className="mt-0">
                  <div className="space-y-4">
                    {supplier.bank_accounts && supplier.bank_accounts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {supplier.bank_accounts.map((bank, index) => (
                              <div key={index} className="flex flex-col p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                   <div className="flex items-center gap-2">
                                     <Landmark className="h-4 w-4 text-muted-foreground"/>
                                     <span className="font-semibold">{(bank as any).bank?.name || "Bank"}</span>
                                   </div>
                                   {bank.is_primary && (
                                     <Badge variant="secondary" className="text-[10px]">Primary</Badge>
                                   )}
                                </div>
                                <div className="pl-6 space-y-1">
                                   <p className="text-sm font-mono">{bank.account_number}</p>
                                   <p className="text-xs text-muted-foreground uppercase">{bank.account_name}</p>
                                   {bank.branch && <p className="text-xs text-muted-foreground">Branch: {bank.branch}</p>}
                                </div>
                              </div>
                           ))}
                        </div>
                    ) : (
                       <div className="text-center py-8 text-muted-foreground">
                          {tBank("empty")}
                       </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
