"use client";

import { ITTicketDetailPage } from "@/features/it-support/components";

interface ITTicketDetailClientProps {
  ticketId: string;
}

export function ITTicketDetailClient({ ticketId }: ITTicketDetailClientProps) {
  return <ITTicketDetailPage ticketId={ticketId} />;
}
