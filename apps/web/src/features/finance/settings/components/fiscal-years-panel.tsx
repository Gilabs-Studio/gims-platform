"use client";

import { FormEvent, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHasPermission } from "@/features/master-data/user-management/hooks/use-has-permission";
import { useCompanies } from "@/features/master-data/organization/hooks/use-companies";

import {
  useActivateFiscalYear,
  useCreateFiscalYear,
  useFiscalYears,
  useLockFiscalYear,
} from "../hooks/use-finance-settings";
import type { FiscalYearStatus } from "../types";

function statusVariant(status: FiscalYearStatus): "secondary" | "success" | "destructive" {
  if (status === "active") return "success";
  if (status === "locked") return "destructive";
  return "secondary";
}

function formatPeriod(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate} - ${endDate}`;
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

export function FiscalYearsPanel() {
  const [companyId, setCompanyId] = useState("");
  const [name, setName] = useState("FY 2026");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");

  const { data: companiesData, isLoading: isLoadingCompanies } = useCompanies({
    per_page: 100,
    is_active: true,
  });

  const params = useMemo(
    () => ({ company_id: companyId.trim(), page: 1, per_page: 20 as const }),
    [companyId],
  );

  const canWrite = useHasPermission("fiscal_year.write");
  const { data, isLoading } = useFiscalYears(params);
  const createMutation = useCreateFiscalYear();
  const activateMutation = useActivateFiscalYear();
  const lockMutation = useLockFiscalYear();

  const items = data?.data ?? [];
  const companies = companiesData?.data ?? [];
  const selectedCompany = companies.find((company) => company.id === companyId) ?? null;

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!companyId.trim()) return;

    createMutation.mutate({
      company_id: companyId.trim(),
      name: name.trim(),
      start_date: startDate,
      end_date: endDate,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Fiscal Year Management</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="md:col-span-2">
              <Label htmlFor="company_id">Company</Label>
              <Select value={companyId} onValueChange={setCompanyId} disabled={isLoadingCompanies}>
                <SelectTrigger id="company_id" className="cursor-pointer">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id} className="cursor-pointer">
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fy_name">Name</Label>
              <Input id="fy_name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="fy_start">Start Date</Label>
              <Input id="fy_start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="fy_end">End Date</Label>
              <Input id="fy_end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <div className="md:col-span-5 flex justify-end">
              <Button type="submit" disabled={!canWrite || createMutation.isPending} className="cursor-pointer">
                Create Fiscal Year
              </Button>
            </div>
          </form>
          {selectedCompany && (
            <p className="mt-3 text-xs text-muted-foreground">
              Selected company: {selectedCompany.name}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fiscal Year List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Name</th>
                    <th className="py-2">Period</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2">
                        <div className="font-medium">{formatPeriod(item.start_date, item.end_date)}</div>
                        <div className="text-xs text-muted-foreground">
                          FY {new Date(item.start_date).getFullYear()} / {new Date(item.end_date).getFullYear()}
                        </div>
                      </td>
                      <td className="py-2">
                        <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            disabled={!canWrite || item.status !== "draft" || activateMutation.isPending || !companyId.trim()}
                            onClick={() => activateMutation.mutate({ id: item.id, companyId: companyId.trim() })}
                          >
                            Activate
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="cursor-pointer"
                            disabled={!canWrite || item.status !== "active" || lockMutation.isPending || !companyId.trim()}
                            onClick={() => lockMutation.mutate({ id: item.id, companyId: companyId.trim() })}
                          >
                            Lock
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
