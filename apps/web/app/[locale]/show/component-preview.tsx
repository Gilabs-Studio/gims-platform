"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ComponentDemo } from "./component-demo";

interface ComponentInfo {
  readonly name: string;
  readonly category: string;
  readonly path: string;
  readonly file: string;
}

interface ComponentPreviewProps {
  readonly component: ComponentInfo;
}

export function ComponentPreview({ component }: ComponentPreviewProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg">{component.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1 font-mono break-all">
              {component.path}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {component.category}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <Separator />
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">File:</p>
          <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
            {component.file}
          </code>
        </div>
        <Separator />
        <ComponentDemo
          componentName={component.name}
          category={component.category}
        />
      </CardContent>
    </Card>
  );
}
