"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface AssetDisposalListProps {
  disposals: any[];
  isLoading: boolean;
}

export function AssetDisposalList({ disposals, isLoading }: AssetDisposalListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Disposals</CardTitle>
        <CardDescription>{disposals.length} total disposals</CardDescription>
      </CardHeader>
      <CardContent>
        {disposals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No disposals recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Disposal Date</TableHead>
                  <TableHead className="text-right">Proceeds</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disposals.map((disposal, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{disposal.asset_name || "N/A"}</TableCell>
                    <TableCell>{disposal.disposal_date || "N/A"}</TableCell>
                    <TableCell className="text-right">
                      {(disposal.proceeds_amount || 0).toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Completed
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
