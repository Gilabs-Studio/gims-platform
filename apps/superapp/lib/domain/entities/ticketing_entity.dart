enum TicketPriority { low, medium, high, urgent }

enum TicketStatus { open, inProgress, pendingParts, resolved, closed }

enum TicketDomain { it, hrd }

class TicketItem {
  final String id;
  final String ticketNumber;
  final TicketDomain domain;
  final String title;
  final String category; // e.g. "IT Hardware", "Payroll & Gaji", "AC & Building", etc.
  final TicketPriority priority;
  final TicketStatus status;
  final String location;
  final String description;
  final String reporterName;
  final DateTime createdAt;
  final String? assignedTechnician;

  const TicketItem({
    required this.id,
    required this.ticketNumber,
    this.domain = TicketDomain.it,
    required this.title,
    required this.category,
    required this.priority,
    required this.status,
    required this.location,
    required this.description,
    required this.reporterName,
    required this.createdAt,
    this.assignedTechnician,
  });
}
