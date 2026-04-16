"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, AlertCircle } from "lucide-react";
import type { BatchDepreciationRunResponse } from "../types";

interface BatchDepreciationResultsProps {
  data: BatchDepreciationRunResponse;
}

export function BatchDepreciationResults({ data }: BatchDepreciationResultsProps) {
  return (
    <div className="space-y-4">
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <CardTitle>Batch Depreciation Completed</CardTitle>
              <CardDescription>Successfully processed all selected assets</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Assets</p>
              <p className="text-2xl font-bold">{data.total_assets}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Successful</p>
              <p className="text-2xl font-bold text-green-600">{data.successful}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-bold text-destructive">{data.failed}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">
                {data.total_amount.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entries Created</CardTitle>
          <CardDescription>{data.journal_ids.length} entries posted to general ledger</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.journal_ids.map((id, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 cursor-pointer">
                <span className="font-mono text-sm">{id}</span>
                <span className="text-xs text-muted-foreground">Journal Entry</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {data.errors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div>
                <CardTitle className="text-destructive">Errors</CardTitle>
                <CardDescription>{data.errors.length} errors encountered</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.errors.map((error, idx) => (
                <div key={idx} className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                  {error}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
