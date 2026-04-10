import { PageMotion } from "@/components/motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function AssetDisposalPage() {
  return (
    <PermissionGuard requiredPermission="asset_disposal.read">
      <PageMotion>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Disposal</CardTitle>
              <CardDescription>This module is coming soon.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Disposal, write-off, and retirement workflows for assets will be available in the next implementation phase.
            </CardContent>
          </Card>
        </div>
      </PageMotion>
    </PermissionGuard>
  );
}
