
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Employee } from "../types";
import { Shield, User } from "lucide-react";
import { useEmployee } from "../hooks/use-employees";

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
}: EmployeeDetailModalProps) {
  const t = useTranslations("employee");

  // Fetch fresh employee data when modal opens
  const { data: detailData, isLoading } = useEmployee(employee?.id);

  if (!employee) return null;

  // Use fresh data from API if available, fallback to prop
  const displayEmployee = detailData?.data ?? employee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">
                {displayEmployee.name}
              </DialogTitle>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">
                  {displayEmployee.employee_code}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {displayEmployee.job_position?.name || "-"}
                </span>
                <Badge
                  variant={displayEmployee.is_active ? "default" : "secondary"}
                  className={
                    displayEmployee.is_active
                      ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-500/20"
                      : ""
                  }
                >
                  {displayEmployee.is_active ? t("active") : t("inactive")}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
              <TabsTrigger value="employment">{t("tabs.employment")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 py-4">
              {/* Personal Information Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("sections.personalInfo")}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.email")}</TableCell>
                        <TableCell>{displayEmployee.email || "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.phone")}</TableCell>
                        <TableCell>{displayEmployee.phone || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("form.dateOfBirth")}</TableCell>
                        <TableCell>
                          {displayEmployee.date_of_birth
                            ? format(new Date(displayEmployee.date_of_birth), "PPP")
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("form.placeOfBirth")}</TableCell>
                        <TableCell>{displayEmployee.place_of_birth || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("form.gender")}</TableCell>
                        <TableCell>
                          {displayEmployee.gender
                            ? t(`form.gender${displayEmployee.gender.charAt(0).toUpperCase() + displayEmployee.gender.slice(1)}`)
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("form.religion")}</TableCell>
                        <TableCell>{displayEmployee.religion || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("form.user")}</TableCell>
                        <TableCell colSpan={3}>
                          {displayEmployee.user ? (
                            <span>
                              {displayEmployee.user.name}{" "}
                              <span className="text-muted-foreground">
                                ({displayEmployee.user.email})
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">
                              {t("form.noUser")}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              {/* Address Information Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("sections.addressInfo")}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.address")}</TableCell>
                        <TableCell colSpan={3}>{displayEmployee.address || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("form.nik")}</TableCell>
                        <TableCell>{displayEmployee.nik || "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.npwp")}</TableCell>
                        <TableCell>{displayEmployee.npwp || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("form.bpjs")}</TableCell>
                        <TableCell colSpan={3}>{displayEmployee.bpjs || "-"}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="employment" className="space-y-6 py-4">
              {/* Employment Information Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("sections.employmentInfo")}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.company")}</TableCell>
                        <TableCell>{displayEmployee.company?.name || "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.division")}</TableCell>
                        <TableCell>{displayEmployee.division?.name || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("form.jobPosition")}</TableCell>
                        <TableCell colSpan={3}>{displayEmployee.job_position?.name || "-"}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              {/* Contract Information Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("sections.contractInfo")}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.contractStatus")}</TableCell>
                        <TableCell>
                          {displayEmployee.contract_status
                            ? t(`contractStatus.${displayEmployee.contract_status}`)
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.totalLeaveQuota")}</TableCell>
                        <TableCell>{displayEmployee.total_leave_quota ?? "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">{t("form.contractStartDate")}</TableCell>
                        <TableCell>
                          {displayEmployee.contract_start_date
                            ? format(new Date(displayEmployee.contract_start_date), "PPP")
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">{t("form.contractEndDate")}</TableCell>
                        <TableCell>
                          {displayEmployee.contract_end_date
                            ? format(new Date(displayEmployee.contract_end_date), "PPP")
                            : "-"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              {/* Tax & Leave Information Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("sections.taxInfo")}</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.ptkpStatus")}</TableCell>
                        <TableCell>{displayEmployee.ptkp_status || "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">{t("form.isDisability")}</TableCell>
                        <TableCell>
                          {displayEmployee.is_disability ? t("yes") : t("no")}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              {/* Area Assignments Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">{t("sections.areasInfo")}</h3>
                {displayEmployee.areas && displayEmployee.areas.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableBody>
                        {displayEmployee.areas.map((ea) => (
                          <TableRow key={ea.area_id}>
                            <TableCell className="w-12">
                              {ea.is_supervisor ? (
                                <Shield className="h-4 w-4 text-amber-500" />
                              ) : (
                                <User className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {ea.area?.name ?? ea.area_id}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={ea.is_supervisor ? "warning" : "secondary"}>
                                {ea.is_supervisor
                                  ? t("form.supervisor")
                                  : t("form.member")}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
                    {t("form.noAreasAssigned")}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
