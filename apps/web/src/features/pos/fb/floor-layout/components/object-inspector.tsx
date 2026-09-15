"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import type { LayoutObject, TableShape, ZoneType } from "../types";
import type { useCanvasEditor } from "../hooks/use-canvas-editor";
import { useTableQRTokens } from "../hooks/use-table-qr";
import { TableQRPrintDialog } from "./table-qr-print-dialog";

type CanvasEditorReturn = ReturnType<typeof useCanvasEditor>;

interface ObjectInspectorProps {
  readonly editor: CanvasEditorReturn;
  readonly floorPlanId?: string;
  readonly outletName?: string;
}

const TABLE_SHAPES: { value: TableShape; labelKey: string }[] = [
  { value: "rectangle", labelKey: "rectangle" },
  { value: "circle", labelKey: "circle" },
  { value: "square", labelKey: "square" },
];

const ZONE_TYPES: { value: ZoneType; labelKey: string }[] = [
  { value: "dining", labelKey: "dining" },
  { value: "vip", labelKey: "vip" },
  { value: "outdoor", labelKey: "outdoor" },
  { value: "bar", labelKey: "bar" },
  { value: "kitchen", labelKey: "kitchen" },
  { value: "storage", labelKey: "storage" },
  { value: "entrance", labelKey: "entrance" },
  { value: "restroom", labelKey: "restroom" },
  { value: "waiting", labelKey: "waiting" },
];

function InspectorField({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function ObjectInspector({ editor, floorPlanId, outletName = "" }: ObjectInspectorProps) {
  const t = useTranslations("floorLayout.editor");
  const tQr = useTranslations("floorLayout.tableQr");
  const obj = editor.selectedObject;
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const { data: qrTokens } = useTableQRTokens(floorPlanId ?? "", {
    enabled: !!floorPlanId && obj?.type === "table",
  });

  const activeToken = obj
    ? (qrTokens?.find((t) => t.table_object_id === obj.id && t.is_active) ?? null)
    : null;

  const handleUpdate = (updates: Partial<LayoutObject>) => {
    if (!obj) return;
    editor.updateObject(obj.id, updates);
  };

  if (!obj) {
    return (
      <div className="w-56 bg-background border-l shrink-0 hidden lg:flex flex-col">
        <div className="px-3 py-2 border-b">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("inspector")}
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            {t("noSelection")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-56 bg-background border-l shrink-0 hidden lg:flex flex-col">
      <div className="px-3 py-2 border-b">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t("inspector")}
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Object type */}
          <div className="text-xs font-medium text-primary capitalize rounded bg-primary/10 px-2 py-1 text-center">
            {obj.type}
          </div>

          {/* Label */}
          <InspectorField label={obj.type === "zone" ? t("highlightText") : t("label")}>
            <Input
              value={obj.label ?? ""}
              onChange={(e) => handleUpdate({ label: e.target.value })}
              className="h-7 text-xs"
            />
          </InspectorField>

          <Separator />

          {/* Position & Size */}
          <div className="grid grid-cols-2 gap-2">
            <InspectorField label="X">
              <Input
                type="number"
                value={Math.round(obj.x)}
                onChange={(e) =>
                  obj.type === "table"
                    ? editor.updateTableLayout(obj.id, { x: Number(e.target.value) })
                    : handleUpdate({ x: Number(e.target.value) })
                }
                className="h-7 text-xs"
              />
            </InspectorField>
            <InspectorField label="Y">
              <Input
                type="number"
                value={Math.round(obj.y)}
                onChange={(e) =>
                  obj.type === "table"
                    ? editor.updateTableLayout(obj.id, { y: Number(e.target.value) })
                    : handleUpdate({ y: Number(e.target.value) })
                }
                className="h-7 text-xs"
              />
            </InspectorField>
            <InspectorField label={t("width")}>
              <Input
                type="number"
                value={obj.width}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (obj.type === "table") {
                    editor.updateTableLayout(obj.id, { width: Math.max(10, val) });
                  } else if (obj.type === "door") {
                    const newW = Math.max(15, val);
                    const cx = obj.x + obj.width / 2;
                    handleUpdate({
                      x: cx - newW / 2,
                      width: newW,
                      doorWidth: newW,
                    });
                  } else {
                    handleUpdate({ width: val });
                  }
                }}
                className="h-7 text-xs"
                min={10}
              />
            </InspectorField>
            <InspectorField label={t("height")}>
              <Input
                type="number"
                value={obj.height}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (obj.type === "table") {
                    editor.updateTableLayout(obj.id, { height: Math.max(10, val) });
                  } else if (obj.type === "door") {
                    const newH = Math.max(4, val);
                    const cy = obj.y + obj.height / 2;
                    handleUpdate({
                      y: cy - newH / 2,
                      height: newH,
                      thickness: newH,
                    });
                  } else {
                    handleUpdate({ height: val });
                  }
                }}
                className="h-7 text-xs"
                min={4}
              />
            </InspectorField>
          </div>

          {/* Rotation */}
          <InspectorField label={`${t("rotation")} (\u00B0)`}>
            <Input
              type="number"
              value={obj.rotation}
              onChange={(e) => handleUpdate({ rotation: Number(e.target.value) % 360 })}
              className="h-7 text-xs"
              min={0}
              max={359}
              step={15}
            />
          </InspectorField>

          <Separator />

          {/* Table-specific fields */}
          {obj.type === "table" && (
            <>
              <InspectorField label={t("tableNumber")}>
                <Input
                  type="number"
                  value={obj.tableNumber ?? 0}
                  onChange={(e) => handleUpdate({ tableNumber: Number(e.target.value) })}
                  className="h-7 text-xs"
                  min={1}
                />
              </InspectorField>
              <InspectorField label={t("capacity")}>
                <Input
                  type="number"
                  value={obj.capacity ?? 4}
                  onChange={(e) => editor.updateTableLayout(obj.id, { capacity: Math.max(1, Number(e.target.value)) })}
                  className="h-7 text-xs"
                  min={1}
                  max={100}
                />
              </InspectorField>
              <InspectorField label={t("shape")}>
                <Select
                  value={obj.tableShape ?? "rectangle"}
                  onValueChange={(v) => editor.updateTableLayout(obj.id, { tableShape: v as TableShape })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TABLE_SHAPES.map((shape) => (
                      <SelectItem key={shape.value} value={shape.value} className="text-xs">
                        {t(shape.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InspectorField>
            </>
          )}

          {/* Zone-specific fields */}
          {obj.type === "zone" && (
            <>
              <InspectorField label={t("zoneType")}>
                <Select
                  value={obj.zoneType ?? "dining"}
                  onValueChange={(v) => handleUpdate({ zoneType: v as ZoneType })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONE_TYPES.map((zone) => (
                      <SelectItem key={zone.value} value={zone.value} className="text-xs">
                        {t(zone.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InspectorField>
              <InspectorField label={t("color")}>
                <Input
                  type="color"
                  value={obj.color ?? "#3b82f6"}
                  onChange={(e) => handleUpdate({ color: e.target.value })}
                  className="h-7 w-full cursor-pointer"
                />
              </InspectorField>
              <InspectorField label={t("opacity")}>
                <Input
                  type="number"
                  value={obj.opacity ?? 0.15}
                  onChange={(e) => handleUpdate({ opacity: Number(e.target.value) })}
                  className="h-7 text-xs"
                  min={0.05}
                  max={0.5}
                  step={0.05}
                />
              </InspectorField>
            </>
          )}

          <Separator />

          {/* QR Code – only for tables */}
          {obj.type === "table" && floorPlanId && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => setQrDialogOpen(true)}
              >
                <QrCode className="mr-1.5 h-3.5 w-3.5" />
                {activeToken ? tQr("openOrPrintQr") : tQr("generateQr")}
              </Button>
              <TableQRPrintDialog
                open={qrDialogOpen}
                onOpenChange={setQrDialogOpen}
                floorPlanId={floorPlanId}
                tableObjectId={obj.id}
                tableLabel={obj.label ?? ""}
                outletName={outletName}
                token={activeToken}
              />
              <Separator />
            </>
          )}

          {/* Locked toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs">{t("locked")}</Label>
            <Switch
              checked={obj.locked}
              onCheckedChange={(checked) => handleUpdate({ locked: checked })}
              className="cursor-pointer"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
