"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  GitBranch,
  Plus,
  Trash2,
  ArrowRight,
  Box,
  Layers,
  ChevronRight,
  ChevronDown,
  Link as LinkIcon,
  AlertCircle,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Link } from "@/i18n/routing";

import type { Asset, AssetLite } from "../../types";
import { useFinanceAssets } from "../../hooks/use-finance-assets";

interface AssetComponentsTabProps {
  asset: Asset | undefined;
  isLoading: boolean;
  parentAsset?: AssetLite | null;
  childComponents?: AssetLite[];
  isParentLoading?: boolean;
  isChildrenLoading?: boolean;
  onAddComponent?: (componentId: string) => Promise<void>;
  onRemoveComponent?: (componentId: string) => Promise<void>;
}

interface ComponentTreeNodeProps {
  asset: AssetLite;
  level: number;
  isExpanded?: boolean;
  children?: React.ReactNode;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatusVariant(
  status: Asset["status"],
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" {
  switch (status) {
    case "active":
    case "in_use":
      return "success";
    case "under_maintenance":
      return "warning";
    case "disposed":
    case "sold":
    case "written_off":
      return "destructive";
    case "draft":
    case "pending_capitalization":
      return "secondary";
    default:
      return "default";
  }
}

function ComponentTreeNode({ asset, level, children }: ComponentTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = !!children;

  return (
    <div className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-6" />
          )}

          <Box className="h-4 w-4 text-muted-foreground" />

          <Link
            href={`/finance/assets/${asset.id}`}
            className="flex-1 font-medium hover:underline text-sm"
          >
            {asset.code} - {asset.name}
          </Link>

          <Badge variant={getStatusVariant(asset.status)} className="text-xs">
            {asset.status}
          </Badge>

          {asset.category && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {asset.category.name}
            </span>
          )}
        </div>

        {hasChildren && <CollapsibleContent>{children}</CollapsibleContent>}
      </Collapsible>
    </div>
  );
}

export function AssetComponentsTab({
  asset,
  isLoading,
  parentAsset,
  childComponents = [],
  isParentLoading,
  isChildrenLoading,
  onAddComponent,
  onRemoveComponent,
}: AssetComponentsTabProps) {
  const t = useTranslations("financeAssets");
  const tCommon = useTranslations("common");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedComponentId, setSelectedComponentId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [componentToRemove, setComponentToRemove] = useState<string | null>(
    null,
  );

  // Fetch available assets that could be added as components
  const { data: availableAssetsData, isLoading: isAvailableAssetsLoading } =
    useFinanceAssets({
      status: ["active", "in_use", "idle"],
      per_page: 100,
    });

  const availableAssets = useMemo(() => {
    if (!availableAssetsData?.data) return [];
    // Filter out current asset, parent, and existing children
    return availableAssetsData.data.filter(
      (a: Asset) =>
        a.id !== asset?.id &&
        a.id !== parentAsset?.id &&
        !childComponents.some((child) => child.id === a.id),
    );
  }, [availableAssetsData, asset, parentAsset, childComponents]);

  const handleAddComponent = async () => {
    if (!selectedComponentId || !onAddComponent) return;

    setIsProcessing(true);
    try {
      await onAddComponent(selectedComponentId);
      setSelectedComponentId("");
      setIsAddDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveComponent = async (componentId: string) => {
    if (!onRemoveComponent) return;

    setIsProcessing(true);
    try {
      await onRemoveComponent(componentId);
      setComponentToRemove(null);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {tCommon("noData")}
      </div>
    );
  }

  const isComponent = !!asset.parent_asset_id || !!parentAsset;
  const isParent = asset.is_parent || childComponents.length > 0;

  return (
    <div className="space-y-6">
      {/* Parent Asset Info (if this is a component) */}
      {isComponent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              {t("detail.sections.parentAsset") || "Parent Asset"}
            </CardTitle>
            <CardDescription>
              {t("detail.fields.componentOf") || "This asset is a component of"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isParentLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : parentAsset ? (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <Layers className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  <Link
                    href={`/finance/assets/${parentAsset.id}`}
                    className="font-semibold hover:underline"
                  >
                    {parentAsset.code} - {parentAsset.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={getStatusVariant(parentAsset.status)}
                      className="text-xs"
                    >
                      {parentAsset.status}
                    </Badge>
                    {parentAsset.category && (
                      <span className="text-xs text-muted-foreground">
                        {parentAsset.category.name}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/finance/assets/${parentAsset.id}`}>
                    {tCommon("view")}
                  </Link>
                </Button>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("detail.fields.parentNotFound") ||
                    "Parent asset information not available"}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Child Components */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              {t("detail.sections.childComponents") || "Child Components"}
            </CardTitle>
            <CardDescription>
              {isParent
                ? t("detail.fields.componentsCount", {
                    count: childComponents.length,
                  }) || `${childComponents.length} component(s)`
                : t("detail.fields.notAParent") ||
                  "This asset has no components"}
            </CardDescription>
          </div>
          {onAddComponent && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("actions.addComponent") || "Add Component"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {t("dialogs.addComponent") || "Add Component"}
                  </DialogTitle>
                  <DialogDescription>
                    {t("dialogs.selectComponentToAdd") ||
                      "Select an asset to add as a component"}
                  </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                  {isAvailableAssetsLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : availableAssets.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {t("dialogs.noAvailableAssets") ||
                          "No available assets to add"}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select
                      value={selectedComponentId}
                      onValueChange={setSelectedComponentId}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            t("placeholders.selectAsset") || "Select an asset"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAssets.map((a: Asset) => (
                          <SelectItem key={a.id} value={a.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {a.code} - {a.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {a.category?.name} •{" "}
                                {formatNumber(
                                  a.total_cost || a.acquisition_cost,
                                )}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    onClick={handleAddComponent}
                    disabled={!selectedComponentId || isProcessing}
                  >
                    {isProcessing
                      ? tCommon("adding") || "Adding..."
                      : tCommon("add")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {isChildrenLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : childComponents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Box className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t("detail.fields.noComponents") || "No components"}</p>
              {onAddComponent && (
                <p className="text-sm mt-1">
                  {t("detail.fields.addComponentsHint") ||
                    "Add components to build an asset hierarchy"}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("fields.code")}</TableHead>
                    <TableHead>{t("fields.name")}</TableHead>
                    <TableHead>{t("fields.category")}</TableHead>
                    <TableHead className="text-right">
                      {t("fields.bookValue")}
                    </TableHead>
                    <TableHead>{t("fields.status")}</TableHead>
                    <TableHead className="w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {childComponents.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-3 w-3 text-muted-foreground" />
                          <Link
                            href={`/finance/assets/${component.id}`}
                            className="hover:underline"
                          >
                            {component.code}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>{component.name}</TableCell>
                      <TableCell>{component.category?.name || "—"}</TableCell>
                      <TableCell className="text-right">
                        {/* Note: book_value not in AssetLite, would need to fetch or extend type */}
                        "—"
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusVariant(component.status)}
                          className="text-xs"
                        >
                          {component.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <Link href={`/finance/assets/${component.id}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                          {onRemoveComponent && (
                            <Dialog
                              open={componentToRemove === component.id}
                              onOpenChange={(open) =>
                                !open && setComponentToRemove(null)
                              }
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() =>
                                    setComponentToRemove(component.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    {t("dialogs.removeComponent") ||
                                      "Remove Component"}
                                  </DialogTitle>
                                  <DialogDescription>
                                    {t("dialogs.confirmRemoveComponent") ||
                                      "Are you sure you want to remove this component from the parent asset?"}
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setComponentToRemove(null)}
                                  >
                                    {tCommon("cancel")}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() =>
                                      handleRemoveComponent(component.id)
                                    }
                                    disabled={isProcessing}
                                  >
                                    {isProcessing
                                      ? tCommon("removing") || "Removing..."
                                      : tCommon("remove")}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Component Hierarchy Visualization */}
      {childComponents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              {t("detail.sections.componentHierarchy") || "Component Hierarchy"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-2">
              {/* Current Asset as Root */}
              <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-primary/5">
                <Box className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary">
                  {asset.code} - {asset.name}
                </span>
                <Badge variant="outline" className="text-xs">
                  {t("detail.fields.parent") || "Parent"}
                </Badge>
              </div>

              {/* Child Components Tree */}
              <div className="mt-1">
                {childComponents.map((component, index) => (
                  <ComponentTreeNode
                    key={component.id}
                    asset={component}
                    level={1}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
