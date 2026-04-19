"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock } from "lucide-react";
import type { RevaluationTransaction } from "../types";

interface AssetRevaluationListProps {
  revaluations: RevaluationTransaction[];
  isLoading: boolean;
  isApproving?: boolean;
  onApprove?: (transactionId: string) => Promise<void>;
}

export function AssetRevaluationList({ revaluations, isLoading, isApproving = false, onApprove }: AssetRevaluationListProps) {
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
        <CardTitle>Asset Revaluations</CardTitle>
        <CardDescription>{revaluations.length} total revaluations</CardDescription>
      </CardHeader>
      <CardContent>
        {revaluations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No revaluations pending</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Revaluation Delta</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revaluations.map((revaluation) => (
                  <TableRow key={revaluation.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{revaluation.asset_name}</p>
                        <p className="text-sm text-muted-foreground">{revaluation.asset_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {revaluation.revaluation_delta.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {revaluation.status === "approved" ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">Approved</span>
                          </>
                        ) : revaluation.status === "rejected" ? (
                          <>
                            <Clock className="h-4 w-4 text-destructive" />
                            <span className="text-sm font-medium text-destructive">Rejected</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-600">Pending</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(revaluation.effective_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {(revaluation.status === "draft" || revaluation.status === "pending") && onApprove && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isApproving}
                          className="cursor-pointer"
                          onClick={() => onApprove(revaluation.id)}
                        >
                          Approve
                        </Button>
                      )}
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
