"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Drawer } from "@/components/ui/drawer";
import { useVisits } from "../hooks/use-visits";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import type { SalesVisit } from "../types";

interface DayVisitListDrawerProps {
  readonly date: Date | null;
  readonly onClose: () => void;
  readonly onVisitClick: (visit: SalesVisit) => void;
}

export function DayVisitListDrawer({ 
  date, 
  onClose,
  onVisitClick 
}: DayVisitListDrawerProps) {
  const [page, setPage] = useState(1);
  const perPage = 20;

  const dateStr = useMemo(() => 
    date ? format(date, "yyyy-MM-dd") : undefined, 
  [date]);

  const { data, isLoading } = useVisits({
    page,
    per_page: perPage,
    date_from: dateStr,
    date_to: dateStr,
  }); // enabled only if dateStr is set? hook handles it but query runs if params valid

  const visits = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "planned":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Planned</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-600"><MapPin className="h-3 w-3 mr-1" /> In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (!date) return null;

  return (
    <Drawer
      open={!!date}
      onOpenChange={(open) => !open && onClose()}
      title={format(date, "EEEE, d MMMM yyyy")}
      description={`Visits scheduled for ${format(date, "dd MMM yyyy")}`}
      side="right"
      defaultWidth={600}
    >
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex-1 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Rep</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No visits for this day
                  </TableCell>
                </TableRow>
              ) : (
                visits.map((visit) => (
                  <TableRow 
                    key={visit.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onVisitClick(visit)}
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {visit.scheduled_time?.slice(0, 5) ?? "-"}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{visit.company?.name || visit.contact_person}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[150px]">{visit.address}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {visit.employee?.name}
                    </TableCell>
                    <TableCell>{getStatusBadge(visit.status)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Simpler Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.total_pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!pagination.has_prev}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.has_next}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
