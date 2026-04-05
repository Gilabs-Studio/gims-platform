"use client";

import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import type { LayoutObject, TableChairLayout, TableShape, ZoneType } from "../types";
import type { useCanvasEditor } from "../hooks/use-canvas-editor";

type CanvasEditorReturn = ReturnType<typeof useCanvasEditor>;

interface ObjectInspectorProps {
  readonly editor: CanvasEditorReturn;
}

const TABLE_SHAPES: { value: TableShape; labelKey: string }[] = [
  { value: "rectangle", labelKey: "rectangle" },
  { value: "circle", labelKey: "circle" },
  { value: "square", labelKey: "square" },
];

const TABLE_CHAIR_LAYOUTS: { value: TableChairLayout; label: string }[] = [
  { value: "auto", label: "Auto (Around)" },
  { value: "top", label: "Top Side" },
  { value: "right", label: "Right Side" },
  { value: "bottom", label: "Bottom Side" },
  { value: "left", label: "Left Side" },
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

export function ObjectInspector({ editor }: ObjectInspectorProps) {
  const t = useTranslations("floorLayout.editor");
  const obj = editor.selectedObject;

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
            Select an object to edit its properties
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
                onChange={(e) =>
                  obj.type === "table"
                    ? editor.updateTableLayout(obj.id, { width: Math.max(10, Number(e.target.value)) })
                    : obj.type === "door"
                      ? undefined
                    : handleUpdate({ width: Number(e.target.value) })
                }
                className="h-7 text-xs"
                min={10}
                disabled={obj.type === "door"}
              />
            </InspectorField>
            <InspectorField label={t("height")}>
              <Input
                type="number"
                value={obj.height}
                onChange={(e) =>
                  obj.type === "table"
                    ? editor.updateTableLayout(obj.id, { height: Math.max(10, Number(e.target.value)) })
                    : obj.type === "door"
                      ? undefined
                    : handleUpdate({ height: Number(e.target.value) })
                }
                className="h-7 text-xs"
                min={10}
                disabled={obj.type === "door"}
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
                  max={20}
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
              <InspectorField label="Chair Layout">
                <Select
                  value={obj.chairLayout ?? "auto"}
                  onValueChange={(v) => editor.setTableChairLayout(obj.id, v as TableChairLayout)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TABLE_CHAIR_LAYOUTS.map((layout) => (
                      <SelectItem key={layout.value} value={layout.value} className="text-xs">
                        {layout.label}
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
