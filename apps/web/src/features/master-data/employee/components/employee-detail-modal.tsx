import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { getDisplayFilename } from "@/components/ui/file-upload";
import {
  Employee,
  EmployeeContract,
  EmployeeEducationHistory,
  EmployeeCertification,
  EmployeeAsset,
} from "../types";
import {
  Shield,
  User,
  FileText,
  RefreshCw,
  X,
  Edit,
  Download,
} from "lucide-react";
import {
  useEmployee,
  useEmployeeContracts,
  useEmployeeEducationHistories,
  useEmployeeCertifications,
  useEmployeeAssets,
} from "../hooks/use-employees";
import { resolveImageUrl, formatWhatsAppLink } from "@/lib/utils";
import { useAreas } from "@/features/master-data/organization/hooks/use-areas";
import { ContractTimeline } from "./contracts";
import { CreateContractDialog } from "./contracts/create-contract-dialog";
import { TerminateContractDialog } from "./contracts/terminate-contract-dialog";
import { RenewContractDialog } from "./contracts/renew-contract-dialog";
import { CorrectContractDialog } from "./contracts/correct-contract-dialog";
import { EducationInfoCard, EducationTimeline } from "./education";
import { CreateEducationDialog } from "./education/create-education-dialog";
import { EditEducationDialog } from "./education/edit-education-dialog";
import { DeleteEducationDialog } from "./education/delete-education-dialog";
import {
  CertificationTimeline,
  CreateCertificationDialog,
  EditCertificationDialog,
  DeleteCertificationDialog,
} from "./certifications";
import {
  AssetTimeline,
  CreateAssetDialog,
  EditAssetDialog,
  ReturnAssetDialog,
  DeleteAssetDialog,
} from "./assets";
import { EmployeeSignatureSection } from "./signature";

interface EmployeePermission {
  permissions?: string[];
}

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
  const activeEmployeeId = open ? employee?.id : undefined;

  // Fetch fresh employee data when modal opens
  const { data: detailData, isLoading } = useEmployee(activeEmployeeId, {
    enabled: !!activeEmployeeId,
  });

  // Load areas only when dialog is open to avoid hidden eager requests.
  const { data: areasData } = useAreas(
    { per_page: 20 },
    { enabled: open },
  );

  // Contract dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [terminateContract, setTerminateContract] =
    useState<EmployeeContract | null>(null);
  const [renewContract, setRenewContract] = useState<EmployeeContract | null>(
    null,
  );
  const [correctContract, setCorrectContract] =
    useState<EmployeeContract | null>(null);

  // Education dialog states
  const [createEduDialogOpen, setCreateEduDialogOpen] = useState(false);
  const [editEducation, setEditEducation] =
    useState<EmployeeEducationHistory | null>(null);
  const [deleteEducation, setDeleteEducation] =
    useState<EmployeeEducationHistory | null>(null);

  // Certification dialog states
  const [createCertDialogOpen, setCreateCertDialogOpen] = useState(false);
  const [editCertification, setEditCertification] =
    useState<EmployeeCertification | null>(null);
  const [deleteCertification, setDeleteCertification] =
    useState<EmployeeCertification | null>(null);

  // Asset dialog states
  const [createAssetDialogOpen, setCreateAssetDialogOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<EmployeeAsset | null>(null);
  const [returnAsset, setReturnAsset] = useState<EmployeeAsset | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<EmployeeAsset | null>(null);

  // Fetch contracts for the timeline
  const { data: contractsData } = useEmployeeContracts(activeEmployeeId);

  // Fetch education histories
  const { data: educationsData } = useEmployeeEducationHistories(activeEmployeeId);

  // Fetch certifications
  const { data: certificationsData } = useEmployeeCertifications(activeEmployeeId);

  // Fetch assets
  const { data: assetsData } = useEmployeeAssets(activeEmployeeId);

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
              <TabsTrigger value="employment">
                {t("tabs.employment")}
              </TabsTrigger>
              <TabsTrigger value="contract-history">
                {t("tabs.contractHistory")}
              </TabsTrigger>
              <TabsTrigger value="signature">{t("tabs.signature")}</TabsTrigger>
              <TabsTrigger value="education-history">
                {t("tabs.educationHistory")}
              </TabsTrigger>
              <TabsTrigger value="certifications">
                {t("tabs.certifications")}
              </TabsTrigger>
              <TabsTrigger value="assets">{t("tabs.assets")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 py-4">
              {/* Personal Information Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {t("sections.personalInfo")}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("form.email")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.email ? (
                            <a
                              href={`mailto:${displayEmployee.email}`}
                              className="text-primary hover:underline cursor-pointer"
                            >
                              {displayEmployee.email}
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("form.phone")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.phone ? (
                            <a
                              href={formatWhatsAppLink(displayEmployee.phone)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline cursor-pointer"
                            >
                              {displayEmployee.phone}
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("form.dateOfBirth")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.date_of_birth
                            ? format(
                                new Date(displayEmployee.date_of_birth),
                                "PPP",
                              )
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">
                          {t("form.placeOfBirth")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.place_of_birth || "-"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("form.gender")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.gender
                            ? t(
                                `form.gender${displayEmployee.gender.charAt(0).toUpperCase() + displayEmployee.gender.slice(1)}`,
                              )
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">
                          {t("form.religion")}
                        </TableCell>
                        <TableCell>{displayEmployee.religion || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("form.user")}
                        </TableCell>
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
                <h3 className="text-sm font-semibold mb-3">
                  {t("sections.addressInfo")}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("form.address")}
                        </TableCell>
                        <TableCell colSpan={3}>
                          {displayEmployee.address || "-"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("form.nik")}
                        </TableCell>
                        <TableCell>{displayEmployee.nik || "-"}</TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("form.npwp")}
                        </TableCell>
                        <TableCell>{displayEmployee.npwp || "-"}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("form.bpjs")}
                        </TableCell>
                        <TableCell colSpan={3}>
                          {displayEmployee.bpjs || "-"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              {/* Education Information (read-only) */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {t("education.sections.latestEducation")}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <EducationInfoCard
                    education={displayEmployee.latest_education}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="employment" className="space-y-6 py-4">
              {/* Employment Information Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3">
                  {t("sections.employmentInfo")}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("form.company")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.company?.name || "-"}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("form.division")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.division?.name || "-"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("form.jobPosition")}
                        </TableCell>
                        <TableCell colSpan={3}>
                          {displayEmployee.job_position?.name || "-"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              {/* Contract Information Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">
                    {t("sections.contractInfo")}
                  </h3>
                  <div className="flex gap-2">
                    {!displayEmployee.current_contract ? (
                      <Button
                        size="sm"
                        onClick={() => setCreateDialogOpen(true)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {t("contract.actions.create")}
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            displayEmployee.current_contract &&
                            setRenewContract(displayEmployee.current_contract)
                          }
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {t("contract.actions.renew")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            displayEmployee.current_contract &&
                            setCorrectContract(displayEmployee.current_contract)
                          }
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t("contract.actions.edit")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            displayEmployee.current_contract &&
                            setTerminateContract(
                              displayEmployee.current_contract,
                            )
                          }
                        >
                          <X className="h-4 w-4 mr-2" />
                          {t("contract.actions.terminate")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("form.contractStatus")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.current_contract ? (
                            <Badge
                              variant={
                                displayEmployee.current_contract.status ===
                                "ACTIVE"
                                  ? "default"
                                  : displayEmployee.current_contract.status ===
                                      "EXPIRED"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {t(
                                `contract.statuses.${displayEmployee.current_contract.status}`,
                              )}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("form.contractType")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.current_contract
                            ? t(
                                `contract.types.${displayEmployee.current_contract.contract_type}`,
                              )
                            : "-"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("form.contractNumber")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.current_contract
                            ? displayEmployee.current_contract.contract_number
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">
                          {t("form.document")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.current_contract?.document_path ? (
                            <a
                              href={
                                resolveImageUrl(
                                  displayEmployee.current_contract
                                    .document_path,
                                ) ?? "#"
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-primary hover:text-primary hover:underline cursor-pointer"
                            >
                              <Download className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[200px]">
                                {getDisplayFilename(
                                  displayEmployee.current_contract
                                    .document_path,
                                ) || t("contract.actions.download")}
                              </span>
                            </a>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50">
                          {t("form.contractStartDate")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.current_contract?.start_date
                            ? format(
                                new Date(
                                  displayEmployee.current_contract.start_date,
                                ),
                                "PPP",
                              )
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50">
                          {t("form.contractEndDate")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.current_contract?.end_date
                            ? format(
                                new Date(
                                  displayEmployee.current_contract.end_date,
                                ),
                                "PPP",
                              )
                            : displayEmployee.current_contract
                                  ?.contract_type === "PKWTT"
                              ? t("contract.permanentContract")
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
                <h3 className="text-sm font-semibold mb-3">
                  {t("sections.taxInfo")}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("form.ptkpStatus")}
                        </TableCell>
                        <TableCell>
                          {displayEmployee.ptkp_status || "-"}
                        </TableCell>
                        <TableCell className="font-medium bg-muted/50 w-48">
                          {t("form.isDisability")}
                        </TableCell>
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
                <h3 className="text-sm font-semibold mb-3">
                  {t("sections.areasInfo")}
                </h3>
                {displayEmployee.areas && displayEmployee.areas.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableBody>
                        {displayEmployee.areas.map((ea) => (
                          <TableRow key={ea.area_id}>
                            <TableCell className="w-12">
                              {ea.is_supervisor ? (
                                <Shield className="h-4 w-4 text-warning" />
                              ) : (
                                <User className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {(() => {
                                // Prefer nested area object if present, otherwise lookup from fetched areas
                                const nested = ea.area?.name;
                                if (nested) return nested;
                                const found = areasData?.data?.find(
                                  (a) => a.id === ea.area_id,
                                )?.name;
                                return found ?? ea.area_id;
                              })()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  ea.is_supervisor ? "warning" : "secondary"
                                }
                              >
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

            <TabsContent value="contract-history" className="space-y-6 py-4">
              <ContractTimeline contracts={contractsData || []} />
            </TabsContent>

            <TabsContent value="signature" className="space-y-6 py-4">
              <EmployeeSignatureSection employeeId={displayEmployee.id} />
            </TabsContent>

            <TabsContent value="education-history" className="space-y-6 py-4">
              <EducationTimeline
                educations={educationsData || []}
                onAdd={() => setCreateEduDialogOpen(true)}
                onEdit={(edu) => setEditEducation(edu)}
                onDelete={(edu) => setDeleteEducation(edu)}
                canEdit
                canDelete
              />
            </TabsContent>

            <TabsContent value="certifications" className="space-y-6 py-4">
              <CertificationTimeline
                certifications={certificationsData || []}
                onAdd={() => setCreateCertDialogOpen(true)}
                onEdit={(cert) => setEditCertification(cert)}
                onDelete={(cert) => setDeleteCertification(cert)}
                canEdit
                canDelete
              />
            </TabsContent>

            <TabsContent value="assets" className="space-y-6 py-4">
              <AssetTimeline
                assets={assetsData || []}
                onAdd={() => setCreateAssetDialogOpen(true)}
                onEdit={(asset) => setEditAsset(asset)}
                onReturn={(asset) => setReturnAsset(asset)}
                onDelete={(asset) => setDeleteAsset(asset)}
                canEdit
                canDelete
              />
            </TabsContent>
          </Tabs>
        )}

        {/* Contract Dialogs */}
        <CreateContractDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          employeeId={displayEmployee.id}
          onSuccess={() => {
            setCreateDialogOpen(false);
          }}
        />

        <TerminateContractDialog
          open={!!terminateContract}
          onOpenChange={(open) => !open && setTerminateContract(null)}
          contract={terminateContract}
          employeeId={displayEmployee.id}
          onSuccess={() => {
            setTerminateContract(null);
          }}
        />

        <RenewContractDialog
          open={!!renewContract}
          onOpenChange={(open) => !open && setRenewContract(null)}
          employeeId={displayEmployee.id}
          contract={renewContract}
          onSuccess={() => {
            setRenewContract(null);
          }}
        />

        <CorrectContractDialog
          open={!!correctContract}
          onOpenChange={(open) => !open && setCorrectContract(null)}
          contract={correctContract}
          employeeId={displayEmployee.id}
          onSuccess={() => {
            setCorrectContract(null);
          }}
        />

        {/* Education Dialogs */}
        <CreateEducationDialog
          open={createEduDialogOpen}
          onOpenChange={setCreateEduDialogOpen}
          employeeId={displayEmployee.id}
          existingEducations={educationsData || []}
          onSuccess={() => {
            setCreateEduDialogOpen(false);
          }}
        />

        <EditEducationDialog
          open={!!editEducation}
          onOpenChange={(open) => !open && setEditEducation(null)}
          employeeId={displayEmployee.id}
          education={editEducation}
          existingEducations={educationsData || []}
          onSuccess={() => {
            setEditEducation(null);
          }}
        />

        <DeleteEducationDialog
          open={!!deleteEducation}
          onOpenChange={(open) => !open && setDeleteEducation(null)}
          employeeId={displayEmployee.id}
          education={deleteEducation}
          onSuccess={() => {
            setDeleteEducation(null);
          }}
        />

        {/* Certification Dialogs */}
        <CreateCertificationDialog
          open={createCertDialogOpen}
          onOpenChange={setCreateCertDialogOpen}
          employeeId={displayEmployee.id}
          onSuccess={() => {
            setCreateCertDialogOpen(false);
          }}
        />

        <EditCertificationDialog
          open={!!editCertification}
          onOpenChange={(open) => !open && setEditCertification(null)}
          employeeId={displayEmployee.id}
          certification={editCertification}
          onSuccess={() => {
            setEditCertification(null);
          }}
        />

        <DeleteCertificationDialog
          open={!!deleteCertification}
          onOpenChange={(open) => !open && setDeleteCertification(null)}
          employeeId={displayEmployee.id}
          certification={deleteCertification}
          onSuccess={() => {
            setDeleteCertification(null);
          }}
        />

        {/* Asset Dialogs */}
        <CreateAssetDialog
          open={createAssetDialogOpen}
          onOpenChange={setCreateAssetDialogOpen}
          employeeId={displayEmployee.id}
          onSuccess={() => {
            setCreateAssetDialogOpen(false);
          }}
        />

        <EditAssetDialog
          open={!!editAsset}
          onOpenChange={(open) => !open && setEditAsset(null)}
          employeeId={displayEmployee.id}
          asset={editAsset}
          onSuccess={() => {
            setEditAsset(null);
          }}
        />

        <ReturnAssetDialog
          open={!!returnAsset}
          onOpenChange={(open) => !open && setReturnAsset(null)}
          employeeId={displayEmployee.id}
          asset={returnAsset}
          onSuccess={() => {
            setReturnAsset(null);
          }}
        />

        <DeleteAssetDialog
          open={!!deleteAsset}
          onOpenChange={(open) => !open && setDeleteAsset(null)}
          employeeId={displayEmployee.id}
          asset={deleteAsset}
          onSuccess={() => {
            setDeleteAsset(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
