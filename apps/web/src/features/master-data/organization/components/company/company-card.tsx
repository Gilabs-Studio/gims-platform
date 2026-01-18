"use client";

import { Building, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Company, CompanyStatus } from "../../types";

const statusColors: Record<CompanyStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

interface CompanyCardProps {
  readonly company: Company;
  readonly isSelected?: boolean;
  readonly onClick?: () => void;
  readonly t: (key: string) => string;
}

export function CompanyCard({ company, isSelected, onClick, t }: CompanyCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 border-b hover:bg-accent/50 cursor-pointer transition-colors",
        isSelected && "bg-accent border-l-4 border-l-primary"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 shrink-0">
          <Building className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="font-medium text-sm truncate">{company.name}</h4>
          {company.address && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {company.address}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-xs", statusColors[company.status])}>
              {t(`company.status.${company.status}`)}
            </Badge>
            {company.latitude && company.longitude && (
              <span className="text-xs text-muted-foreground">
                📍 {company.latitude.toFixed(4)}, {company.longitude.toFixed(4)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
