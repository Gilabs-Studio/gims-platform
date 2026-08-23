"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Wrench, Image as ImageIcon } from "lucide-react";
import type { ITTicket, ITTicketPriority } from "../types/it-ticket.types";

interface ITTicketCardProps {
  ticket: ITTicket;
  onClick?: (ticket: ITTicket) => void;
}

function PriorityBadge({ priority }: { priority: ITTicketPriority }) {
  const t = useTranslations("itSupport");
  const variantMap: Record<ITTicketPriority, "destructive" | "warning" | "active" | "secondary"> = {
    urgent: "destructive",
    high: "warning",
    medium: "active",
    low: "secondary",
  };

  return (
    <Badge variant={variantMap[priority]} className="text-[10px] uppercase font-bold px-1.5 py-0.5">
      {t(`priority.${priority}`)}
    </Badge>
  );
}

export function ITTicketCard({ ticket, onClick }: ITTicketCardProps) {
  const t = useTranslations("itSupport");

  return (
    <Card className="group relative py-3 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden">
      <CardContent className="px-3.5 space-y-2.5">
        {/* Header: Ticket Number & Priority Badge */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href={`/ticketing/${ticket.id}`}
            onClick={(e) => {
              if (onClick) {
                e.stopPropagation();
                onClick(ticket);
              }
            }}
            className="font-mono text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            {ticket.ticket_number}
          </Link>
          <PriorityBadge priority={ticket.priority} />
        </div>

        {/* Category & Title */}
        <div className="space-y-1">
          <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground bg-muted/40">
            {t(`categories.${ticket.category}`)}
          </Badge>

          <Link
            href={`/ticketing/${ticket.id}`}
            onClick={(e) => {
              if (onClick) {
                e.stopPropagation();
                onClick(ticket);
              }
            }}
            className="block font-medium text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 cursor-pointer"
          >
            {ticket.title}
          </Link>
        </div>

        {/* Location & Photo Indicator */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
          <div className="flex items-center gap-1 truncate max-w-[190px]">
            <MapPin className="h-3 w-3 shrink-0 text-primary/70" />
            <span className="truncate">{ticket.location}</span>
          </div>

          {ticket.photos.length > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-primary font-medium shrink-0">
              <ImageIcon className="h-3 w-3" />
              <span>{ticket.photos.length}</span>
            </div>
          )}
        </div>

        {/* Footer: Reporter & Technician */}
        <div className="pt-2 border-t flex items-center justify-between gap-2 text-xs">
          {/* Reporter */}
          <div className="flex items-center gap-1.5 truncate">
            <Avatar className="h-5 w-5 shrink-0 border">
              <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                {ticket.reporter.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground truncate">{ticket.reporter.name}</span>
          </div>

          {/* Technician */}
          {ticket.assigned_technician ? (
            <div className="flex items-center gap-1 text-[11px] text-foreground font-medium shrink-0 bg-muted/50 px-2 py-0.5 rounded border">
              <Wrench className="h-3 w-3 text-primary" />
              <span className="truncate max-w-[80px]">{ticket.assigned_technician.name.split(" ")[0]}</span>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground italic shrink-0">
              {t("detail.unassigned")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
