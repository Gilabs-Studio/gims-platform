import { ITTicketDetailClient } from "./client";

interface ITTicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ITTicketDetailPage({ params }: ITTicketDetailPageProps) {
  const { id } = await params;

  return <ITTicketDetailClient ticketId={id} />;
}
