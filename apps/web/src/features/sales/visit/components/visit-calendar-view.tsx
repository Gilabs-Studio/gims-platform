"use client";

import { useMemo } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SalesVisit } from "../types";

interface VisitCalendarViewProps {
  readonly visits: SalesVisit[];
  readonly currentDate: Date;
  readonly onDateChange: (date: Date) => void;
  readonly onVisitClick: (visit: SalesVisit) => void;
}

export function VisitCalendarView({ 
  visits, 
  currentDate, 
  onDateChange,
  onVisitClick 
}: VisitCalendarViewProps) {
  
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planned": return "bg-secondary text-secondary-foreground";
      case "in_progress": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
      case "completed": return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
      case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "planned": return <Clock className="h-3 w-3" />;
      case "in_progress": return <MapPin className="h-3 w-3" />;
      case "completed": return <CheckCircle2 className="h-3 w-3" />;
      case "cancelled": return <XCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => onDateChange(subMonths(currentDate, 1))}
            className="cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => onDateChange(new Date())}
            className="cursor-pointer"
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => onDateChange(addMonths(currentDate, 1))}
            className="cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-md overflow-hidden bg-background shadow-sm">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/40">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 min-h-[600px] auto-rows-fr">
          {days.map((day, dayIdx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            
            // Filter visits for this day
            const dayVisits = visits.filter(v => 
              isSameDay(new Date(v.visit_date), day)
            );

            return (
              <div 
                key={day.toString()}
                className={cn(
                  "min-h-[100px] p-2 border-r border-b relative group hover:bg-muted/5 transition-colors",
                  !isCurrentMonth && "bg-muted/10 text-muted-foreground",
                  isToday && "bg-primary/5"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                   <span className={cn(
                     "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                     isToday && "bg-primary text-primary-foreground"
                   )}>
                     {format(day, "d")}
                   </span>
                   {dayVisits.length > 0 && (
                     <span className="text-xs text-muted-foreground font-medium">
                       {dayVisits.length} visits
                     </span>
                   )}
                </div>

                <div className="space-y-1">
                  {dayVisits.slice(0, 4).map((visit) => (
                    <button
                      key={visit.id}
                      onClick={() => onVisitClick(visit)}
                      className={cn(
                        "w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-1.5 truncate cursor-pointer transition-all hover:scale-[1.02]",
                        getStatusColor(visit.status)
                      )}
                    >
                      {getStatusIcon(visit.status)}
                      <span className="truncate flex-1">
                        {visit.company?.name || visit.contact_person || "Unknown"}
                      </span>
                    </button>
                  ))}
                  {dayVisits.length > 4 && (
                    <div className="text-xs text-center text-muted-foreground py-1 font-medium">
                      + {dayVisits.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
