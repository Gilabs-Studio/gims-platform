
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Employee } from "../types";
import {
  User,
  Building2,
  Briefcase,
  FileText,
  CreditCard,
  MapPin,
  Calendar,
  Phone,
  Mail,
  UserCheck,
  Percent,
} from "lucide-react";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

interface EmployeeDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onEdit?: (employee: Employee) => void;
}

export function EmployeeDetailModal({
  open,
  onOpenChange,
  employee,
  onEdit,
}: EmployeeDetailModalProps) {
  const t = useTranslations("employee");

  if (!employee) return null;

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
                {employee.name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-bold">
                  {employee.name}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="font-mono">
                    {employee.employee_code}
                  </Badge>
                  <span>•</span>
                  <span>{employee.job_position?.name || "-"}</span>
                  <span>•</span>
                  <Badge
                    variant={employee.is_active ? "default" : "secondary"}
                    className={
                      employee.is_active
                        ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-500/20"
                        : ""
                    }
                  >
                    {employee.is_active ? t("active") : t("inactive")}
                  </Badge>
                </div>
              </div>
            </div>
            {/* Edit button removed as requested */}
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
                  {t("tabs.overview")}
                </TabsTrigger>
                <TabsTrigger
                  value="employment"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 pt-2 font-medium cursor-pointer shadow-none"
                >
                  {t("tabs.employment")}
                </TabsTrigger>
                <TabsTrigger
                  value="contract"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 pt-2 font-medium cursor-pointer shadow-none"
                >
                  {t("tabs.contract")}
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                <TabsContent value="overview" className="mt-0 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {t("sections.personalInfo")}
                      </h4>
                      <div className="grid gap-4">
                        <DetailItem
                          icon={Mail}
                          label={t("form.email")}
                          value={employee.email}
                        />
                        <DetailItem
                          icon={Phone}
                          label={t("form.phone")}
                          value={employee.phone}
                        />
                        <DetailItem
                          icon={Calendar}
                          label={t("form.dateOfBirth")}
                          value={
                            employee.date_of_birth
                              ? format(new Date(employee.date_of_birth), "PPP")
                              : "-"
                          }
                        />
                        <DetailItem
                          icon={MapPin}
                          label={t("form.placeOfBirth")}
                          value={employee.place_of_birth}
                        />
                        <DetailItem
                          icon={User}
                          label={t("form.gender")}
                          value={
                            employee.gender
                              ? t(
                                  `form.gender${
                                    employee.gender.charAt(0).toUpperCase() +
                                    employee.gender.slice(1)
                                  }`
                                )
                              : "-"
                          }
                        />
                        <DetailItem
                          icon={UserCheck}
                          label={t("form.religion")}
                          value={employee.religion}
                        />
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {t("sections.addressInfo")}
                      </h4>
                      <div className="grid gap-4">
                        <DetailItem
                          icon={MapPin}
                          label={t("form.address")}
                          value={employee.address}
                          className="col-span-full"
                        />
                        <Separator />
                        <DetailItem
                          icon={CreditCard}
                          label={t("form.nik")}
                          value={employee.nik}
                        />
                        <DetailItem
                          icon={CreditCard}
                          label={t("form.npwp")}
                          value={employee.npwp}
                        />
                        <DetailItem
                          icon={CreditCard}
                          label={t("form.bpjs")}
                          value={employee.bpjs}
                        />
                      </div>
                    </section>
                  </div>
                </TabsContent>

                <TabsContent value="employment" className="mt-0 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        {t("sections.employmentInfo")}
                      </h4>
                      <div className="grid gap-4">
                        <DetailItem
                          icon={Building2}
                          label={t("form.company")}
                          value={employee.company?.name}
                        />
                        <DetailItem
                          icon={Briefcase}
                          label={t("form.division")}
                          value={employee.division?.name}
                        />
                        <DetailItem
                          icon={User}
                          label={t("form.jobPosition")}
                          value={employee.job_position?.name}
                        />
                      </div>
                    </section>
                  </div>
                </TabsContent>

                <TabsContent value="contract" className="mt-0 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {t("sections.contractInfo")}
                      </h4>
                      <div className="grid gap-4">
                        <DetailItem
                          icon={FileText}
                          label={t("form.contractStatus")}
                          value={
                            employee.contract_status
                              ? t(`contractStatus.${employee.contract_status}`)
                              : "-"
                          }
                        />
                        <DetailItem
                          icon={Calendar}
                          label={t("form.contractStartDate")}
                          value={
                            employee.contract_start_date
                              ? format(
                                  new Date(employee.contract_start_date),
                                  "PPP"
                                )
                              : "-"
                          }
                        />
                        <DetailItem
                          icon={Calendar}
                          label={t("form.contractEndDate")}
                          value={
                            employee.contract_end_date
                              ? format(new Date(employee.contract_end_date), "PPP")
                              : "-"
                          }
                        />
                      </div>
                    </section>

                    <section className="space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <Percent className="w-4 h-4" />
                        {t("sections.taxInfo")}
                      </h4>
                      <div className="grid gap-4">
                        <DetailItem
                          icon={Percent}
                          label={t("form.ptkpStatus")}
                          value={employee.ptkp_status}
                        />
                        <DetailItem
                          icon={User}
                          label={t("form.totalLeaveQuota")}
                          value={employee.total_leave_quota}
                        />
                        <DetailItem
                          icon={UserCheck}
                          label={t("form.isDisability")}
                          value={
                            employee.is_disability ? t("yes") : t("no")
                          }
                        />
                      </div>
                    </section>
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
