"use client";

import {
  SquareIcon,
  ArmchairIcon,
  MinusIcon,
  DoorOpenIcon,
  MonitorIcon,
  LayoutGridIcon,
  SparklesIcon,
  MousePointerIcon,
  CircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import type { LayoutObjectType } from "../types";
import type { useCanvasEditor } from "../hooks/use-canvas-editor";

type CanvasEditorReturn = ReturnType<typeof useCanvasEditor>;

interface LayoutPaletteProps {
  readonly editor: CanvasEditorReturn;
}

interface ToolItem {
  type: "select" | LayoutObjectType;
  icon: React.ReactNode;
  labelKey: string;
  color: string;
}

const TOOL_CATEGORIES: { labelKey: string; tools: ToolItem[] }[] = [
  {
    labelKey: "",
    tools: [
      {
        type: "select",
        icon: <MousePointerIcon className="h-5 w-5" />,
        labelKey: "select",
        color: "text-foreground",
      },
    ],
  },
  {
    labelKey: "tables",
    tools: [
      {
        type: "table",
        icon: <SquareIcon className="h-5 w-5" />,
        labelKey: "tables",
        color: "text-amber-600",
      },
    ],
  },
  {
    labelKey: "chairs",
    tools: [
      {
        type: "chair",
        icon: <ArmchairIcon className="h-5 w-5" />,
        labelKey: "chairs",
        color: "text-blue-500",
      },
    ],
  },
  {
    labelKey: "structures",
    tools: [
      {
        type: "wall",
        icon: <MinusIcon className="h-5 w-5" />,
        labelKey: "walls",
        color: "text-slate-600",
      },
      {
        type: "door",
        icon: <DoorOpenIcon className="h-5 w-5" />,
        labelKey: "doors",
        color: "text-yellow-600",
      },
    ],
  },
  {
    labelKey: "facilities",
    tools: [
      {
        type: "cashier",
        icon: <MonitorIcon className="h-5 w-5" />,
        labelKey: "cashier",
        color: "text-green-600",
      },
    ],
  },
  {
    labelKey: "zones",
    tools: [
      {
        type: "zone",
        icon: <LayoutGridIcon className="h-5 w-5" />,
        labelKey: "zones",
        color: "text-purple-500",
      },
    ],
  },
  {
    labelKey: "decorations",
    tools: [
      {
        type: "decoration",
        icon: <SparklesIcon className="h-5 w-5" />,
        labelKey: "decorations",
        color: "text-pink-500",
      },
    ],
  },
];

export function LayoutPalette({ editor }: LayoutPaletteProps) {
  const t = useTranslations("floorLayout.editor");

  return (
    <div className="w-16 md:w-20 bg-background border-r flex flex-col shrink-0">
      <div className="px-1 py-2 text-center">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:block">
          {t("palette")}
        </span>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center gap-1 p-1.5">
          {TOOL_CATEGORIES.map((category) => (
            <div key={category.labelKey || "select"} className="w-full">
              {category.tools.map((tool) => {
                const isActive = editor.activeTool === tool.type;
                return (
                  <button
                    key={tool.type}
                    onClick={() => editor.setActiveTool(tool.type as "select" | LayoutObjectType)}
                    className={cn(
                      "w-full flex flex-col items-center gap-0.5 rounded-lg p-2 transition-all cursor-pointer",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive && "bg-primary/10 text-primary ring-1 ring-primary/30",
                      !isActive && tool.color,
                    )}
                    title={tool.type === "select" ? "Select" : t(tool.labelKey)}
                  >
                    {tool.icon}
                    <span className="text-[9px] font-medium leading-tight hidden md:block">
                      {tool.type === "select" ? "Select" : t(tool.labelKey)}
                    </span>
                  </button>
                );
              })}
              {category.labelKey !== "decorations" && (
                <Separator className="my-1" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Shape shortcuts for table tool */}
      {editor.activeTool === "table" && (
        <div className="border-t p-1.5">
          <p className="text-[9px] text-muted-foreground text-center mb-1 hidden md:block">Shape</p>
          <div className="flex items-center justify-center gap-1">
            <button
              className="p-1.5 rounded hover:bg-accent cursor-pointer"
              title="Rectangle"
            >
              <SquareIcon className="h-3.5 w-3.5 text-amber-600" />
            </button>
            <button
              className="p-1.5 rounded hover:bg-accent cursor-pointer"
              title="Circle"
            >
              <CircleIcon className="h-3.5 w-3.5 text-amber-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
