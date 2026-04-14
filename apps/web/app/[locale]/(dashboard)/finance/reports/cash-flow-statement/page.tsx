import { PageMotion } from "@/components/motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PermissionGuard } from "@/features/auth/components/permission-guard";

export default function CashFlowStatementPage() {
  return (
    <PermissionGuard requiredPermission="cash_flow_statement.read">
      <PageMotion>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
              <CardDescription>This report is coming soon.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Operating, investing, and financing cash flow sections will be published in the next implementation phase.
            </CardContent>
          </Card>
        </div>
      </PageMotion>
    </PermissionGuard>
  );
}
