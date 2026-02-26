"use client";

import { Building2, Calendar, DollarSign, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Deal } from "../types";

interface DealCardProps {
  deal: Deal;
  onClick: (deal: Deal) => void;
}

function getProbabilityColor(probability: number): string {
  if (probability >= 80) return "text-green-600";
  if (probability >= 50) return "text-blue-600";
  if (probability >= 20) return "text-amber-600";
  return "text-red-600";
}

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "won":
      return "default";
    case "lost":
      return "destructive";
    default:
      return "secondary";
  }
}

export function DealCard({ deal, onClick }: DealCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick(deal)}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium leading-tight line-clamp-2">
            {deal.title}
          </h4>
          <Badge variant={getStatusVariant(deal.status)} className="shrink-0 text-xs">
            {deal.status}
          </Badge>
        </div>

        {deal.customer?.name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{deal.customer.name}</span>
          </div>
        )}

        {deal.contact?.name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{deal.contact.name}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs font-medium">
          <DollarSign className="h-3 w-3 shrink-0" />
          <span>{formatCurrency(deal.value)}</span>
        </div>

        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold ${getProbabilityColor(deal.probability)}`}
          >
            {deal.probability}%
          </span>

          {deal.expected_close_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                {new Date(deal.expected_close_date).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            </div>
          )}
        </div>

        {deal.pipeline_stage && (
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: deal.pipeline_stage.color || "#6b7280" }}
            />
            <span className="text-xs text-muted-foreground truncate">
              {deal.pipeline_stage.name}
            </span>
          </div>
        )}

        {deal.assigned_employee?.name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Avatar className="h-5 w-5">
              <AvatarImage
                src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(deal.assigned_employee.employee_code)}`}
                alt={deal.assigned_employee.name}
              />
              <AvatarFallback dataSeed={deal.assigned_employee.employee_code} className="text-[10px]">{deal.assigned_employee.name}</AvatarFallback>
            </Avatar>
            <span className="truncate">{deal.assigned_employee.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
