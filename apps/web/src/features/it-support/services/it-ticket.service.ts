import type {
  ITTicket,
  ITTechnician,
  ITTicketReporter,
  ITTicketStatistics,
  ITTicketFilter,
} from "../types/it-ticket.types";
import type {
  CreateITTicketFormValues,
  AssignITTechnicianFormValues,
  UpdateITTicketStatusFormValues,
} from "../schemas/it-ticket.schema";

export const MOCK_IT_TECHNICIANS: ITTechnician[] = [
  {
    id: "tech-it-1",
    name: "Budi Santoso",
    code: "TECH-001",
    department: "IT Infrastructure",
    role: "Senior IT Support",
    phone: "+62 812-3456-7890",
    active_tickets_count: 3,
  },
  {
    id: "tech-it-2",
    name: "Rina Wijaya",
    code: "TECH-003",
    department: "IT Software & App",
    role: "Application Support Specialist",
    phone: "+62 811-2233-4455",
    active_tickets_count: 1,
  },
  {
    id: "tech-it-3",
    name: "Dian Permana",
    code: "TECH-005",
    department: "IT Network & Security",
    role: "Network Engineer",
    phone: "+62 812-9988-1122",
    active_tickets_count: 2,
  },
];

export const CURRENT_IT_REPORTER: ITTicketReporter = {
  id: "user-101",
  name: "Kevin Pratama",
  code: "EMP-2024-089",
  department: "Finance & Operations",
  email: "kevin.pratama@gilabs.id",
  phone: "+62 812-9988-7766",
  location: "Lantai 3 - Ruang Finance 302",
};

export const INITIAL_IT_TICKETS: ITTicket[] = [
  {
    id: "IT-2026-001",
    ticket_number: "IT-2026-001",
    title: "Laptop Karyawan Mati Total Tidak Bisa Di-charge",
    category: "it_hardware",
    priority: "urgent",
    status: "assigned",
    location: "Lantai 2 - Ruang Sales 201",
    description: "Laptop ThinkPad E14 mati mendadak saat rapat Zoom client dan tidak merespon saat dihubungkan ke adaptor daya.",
    photos: [
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80",
    ],
    reporter: {
      id: "user-102",
      name: "Siti Rahmawati",
      code: "EMP-2024-045",
      department: "Sales & Marketing",
      email: "siti.rahma@gilabs.id",
      location: "Lantai 2 - Ruang Sales 201",
    },
    assigned_technician: MOCK_IT_TECHNICIANS[0],
    assigned_team: "Tim IT Infrastructure",
    target_completion_date: "2026-08-23",
    created_at: "2026-08-20T09:10:00Z",
    updated_at: "2026-08-20T09:30:00Z",
    activities: [
      {
        id: "act-101",
        ticket_id: "IT-2026-001",
        actor_name: "Siti Rahmawati",
        actor_role: "staff",
        action: "Melaporkan Kendala IT",
        notes: "Laptop mendadak mati total, butuh replacement cadangan atau perbaikan cepat.",
        created_at: "2026-08-20T09:10:00Z",
      },
      {
        id: "act-102",
        ticket_id: "IT-2026-001",
        actor_name: "IT Support Desk",
        actor_role: "admin",
        action: "Penugasan Teknisi IT",
        notes: "Budi Santoso dijadwalkan cek hardware motherboard.",
        created_at: "2026-08-20T09:30:00Z",
      },
    ],
  },
  {
    id: "IT-2026-002",
    ticket_number: "IT-2026-002",
    title: "Gagal Login ERP GIMS Error 500 Internal Server",
    category: "it_software",
    priority: "high",
    status: "open",
    location: "Lantai 4 - Ruang HRD 405",
    description: "Saat mengakses modul Payroll muncul notifikasi error HTTP 500 session expired.",
    photos: [],
    reporter: {
      id: "user-103",
      name: "Bambang Triyono",
      code: "EMP-2024-012",
      department: "HRD",
      email: "bambang.hrd@gilabs.id",
      location: "Lantai 4 - Ruang HRD 405",
    },
    assigned_technician: null,
    assigned_team: "Tim IT Software",
    created_at: "2026-08-21T11:00:00Z",
    updated_at: "2026-08-21T11:00:00Z",
    activities: [
      {
        id: "act-201",
        ticket_id: "IT-2026-002",
        actor_name: "Bambang Triyono",
        actor_role: "staff",
        action: "Melaporkan Kendala Software",
        notes: "Gagal login ERP GIMS.",
        created_at: "2026-08-21T11:00:00Z",
      },
    ],
  },
  {
    id: "IT-2026-003",
    ticket_number: "IT-2026-003",
    title: "Access Point Wifi Gedung Produksi A Disconnect",
    category: "it_network",
    priority: "urgent",
    status: "in_progress",
    location: "Lantai B1 - Data Center / Ruang Server",
    description: "Sinyal Wifi 5GHz tidak stabil di area pabrik line A, menghambat scanner barcode.",
    photos: [],
    reporter: CURRENT_IT_REPORTER,
    assigned_technician: MOCK_IT_TECHNICIANS[2],
    assigned_team: "Tim IT Network",
    target_completion_date: "2026-08-23",
    created_at: "2026-08-22T08:00:00Z",
    updated_at: "2026-08-22T09:15:00Z",
    activities: [
      {
        id: "act-301",
        ticket_id: "IT-2026-003",
        actor_name: "Kevin Pratama",
        actor_role: "staff",
        action: "Laporan Urgent Network",
        created_at: "2026-08-22T08:00:00Z",
      },
      {
        id: "act-302",
        ticket_id: "IT-2026-003",
        actor_name: "Dian Permana",
        actor_role: "technician",
        action: "Proses Troubleshooting",
        notes: "Sedang dilakukan pembacaan syslog AP Unifi U6 Pro.",
        created_at: "2026-08-22T09:15:00Z",
      },
    ],
  },
  {
    id: "IT-2026-004",
    ticket_number: "IT-2026-004",
    title: "Pengajuan Akses Email Corporate & Reset Password VPN",
    category: "it_account",
    priority: "medium",
    status: "pending_parts",
    location: "Lantai 1 - Lobby Admin",
    description: "Meminta pembuatan akun email dan kredensial VPN untuk karyawan baru staf Finance.",
    photos: [],
    reporter: CURRENT_IT_REPORTER,
    assigned_technician: MOCK_IT_TECHNICIANS[1],
    assigned_team: "Tim IT Security",
    target_completion_date: "2026-08-24",
    created_at: "2026-08-21T14:20:00Z",
    updated_at: "2026-08-22T10:00:00Z",
    activities: [
      {
        id: "act-401",
        ticket_id: "IT-2026-004",
        actor_name: "Kevin Pratama",
        actor_role: "staff",
        action: "Permohonan Akses",
        created_at: "2026-08-21T14:20:00Z",
      },
      {
        id: "act-402",
        ticket_id: "IT-2026-004",
        actor_name: "Rina Wijaya",
        actor_role: "technician",
        action: "Pending Verifikasi SysAdmin",
        notes: "Menunggu persetujuan lisensi Google Workspace tambahan.",
        created_at: "2026-08-22T10:00:00Z",
      },
    ],
  },
  {
    id: "IT-2026-005",
    ticket_number: "IT-2026-005",
    title: "Penggantian Printer thermal POS Kasir 02",
    category: "it_hardware",
    priority: "medium",
    status: "resolved",
    location: "Outlet BSD - Kasir 2",
    description: "Printer thermal cetak struk buram dan pemotong kertas otomatis macet.",
    photos: [],
    reporter: CURRENT_IT_REPORTER,
    assigned_technician: MOCK_IT_TECHNICIANS[0],
    assigned_team: "Tim IT Support Field",
    resolution_notes: "Unit thermal printer pengganti Epson TM-T82III telah dipasang dan diuji.",
    created_at: "2026-08-19T09:00:00Z",
    updated_at: "2026-08-20T11:00:00Z",
    resolved_at: "2026-08-20T11:00:00Z",
    activities: [
      {
        id: "act-501",
        ticket_id: "IT-2026-005",
        actor_name: "Kevin Pratama",
        actor_role: "staff",
        action: "Laporan Kerusakan Hardware POS",
        created_at: "2026-08-19T09:00:00Z",
      },
      {
        id: "act-502",
        ticket_id: "IT-2026-005",
        actor_name: "Budi Santoso",
        actor_role: "technician",
        action: "Pemasangan Unit Replacement",
        notes: "Sudah berfungsi normal cetak 50 lembar struk.",
        created_at: "2026-08-20T11:00:00Z",
      },
    ],
  },
];

class ITTicketService {
  private tickets: ITTicket[] = [...INITIAL_IT_TICKETS];
  private technicians: ITTechnician[] = [...MOCK_IT_TECHNICIANS];

  getTickets(filter: ITTicketFilter = {}): ITTicket[] {
    let result = [...this.tickets];

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q) ||
          t.reporter.name.toLowerCase().includes(q)
      );
    }

    if (filter.category && filter.category !== "all") {
      result = result.filter((t) => t.category === filter.category);
    }

    if (filter.status && filter.status !== "all") {
      result = result.filter((t) => t.status === filter.status);
    }

    if (filter.priority && filter.priority !== "all") {
      result = result.filter((t) => t.priority === filter.priority);
    }

    if (filter.assigned_to_me) {
      result = result.filter((t) => t.reporter.id === CURRENT_IT_REPORTER.id);
    }

    return result;
  }

  getTicketById(id: string): ITTicket | undefined {
    return this.tickets.find((t) => t.id === id || t.ticket_number === id);
  }

  getTechnicians(): ITTechnician[] {
    return [...this.technicians];
  }

  getStatistics(): ITTicketStatistics {
    return {
      total: this.tickets.length,
      open: this.tickets.filter((t) => t.status === "open").length,
      assigned: this.tickets.filter((t) => t.status === "assigned").length,
      in_progress: this.tickets.filter((t) => t.status === "in_progress").length,
      pending_parts: this.tickets.filter((t) => t.status === "pending_parts").length,
      resolved: this.tickets.filter((t) => t.status === "resolved").length,
      closed: this.tickets.filter((t) => t.status === "closed").length,
      urgent: this.tickets.filter((t) => t.priority === "urgent" || t.priority === "high").length,
    };
  }

  createTicket(data: CreateITTicketFormValues): ITTicket {
    const seq = (this.tickets.length + 1).toString().padStart(3, "0");
    const year = new Date().getFullYear();
    const newNumber = `IT-${year}-${seq}`;

    const newTicket: ITTicket = {
      id: newNumber,
      ticket_number: newNumber,
      title: data.title,
      category: data.category,
      priority: data.priority,
      status: "open",
      location: data.location,
      description: data.description,
      photos: data.photos || [],
      reporter: CURRENT_IT_REPORTER,
      assigned_technician: null,
      assigned_team: "Tim IT Support Desk",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activities: [
        {
          id: `act-${Date.now()}`,
          ticket_id: newNumber,
          actor_name: CURRENT_IT_REPORTER.name,
          actor_role: "staff",
          action: "Melaporkan Kendala IT Baru",
          notes: data.description,
          photo_url: data.photos?.[0],
          created_at: new Date().toISOString(),
        },
      ],
    };

    this.tickets.unshift(newTicket);
    return newTicket;
  }

  assignTechnician(
    ticketId: string,
    data: AssignITTechnicianFormValues
  ): ITTicket | null {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;

    const tech = this.technicians.find((t) => t.id === data.technician_id);
    if (!tech) return null;

    ticket.assigned_technician = tech;
    ticket.target_completion_date = data.target_completion_date;
    ticket.status = "assigned";
    ticket.updated_at = new Date().toISOString();

    ticket.activities.push({
      id: `act-${Date.now()}`,
      ticket_id: ticket.id,
      actor_name: "IT Desk Lead",
      actor_role: "admin",
      action: "Penugasan Teknisi IT",
      notes: `Penugasan tiket IT ke ${tech.name} (${tech.role}). ${data.notes || ""}`,
      created_at: new Date().toISOString(),
    });

    tech.active_tickets_count += 1;
    return ticket;
  }

  updateTicketStatus(
    ticketId: string,
    data: UpdateITTicketStatusFormValues
  ): ITTicket | null {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) return null;

    ticket.status = data.status;
    ticket.updated_at = new Date().toISOString();

    if (data.status === "resolved") {
      ticket.resolved_at = new Date().toISOString();
      if (data.notes) ticket.resolution_notes = data.notes;
      if (data.resolution_photos) ticket.resolution_photos = data.resolution_photos;
    } else if (data.status === "closed") {
      ticket.closed_at = new Date().toISOString();
    }

    ticket.activities.push({
      id: `act-${Date.now()}`,
      ticket_id: ticket.id,
      actor_name: ticket.assigned_technician?.name || CURRENT_IT_REPORTER.name,
      actor_role: ticket.assigned_technician ? "technician" : "staff",
      action: `Update Status IT: ${data.status.replace("_", " ").toUpperCase()}`,
      notes: data.notes,
      photo_url: data.resolution_photos?.[0],
      created_at: new Date().toISOString(),
    });

    return ticket;
  }

  deleteTicket(ticketId: string): boolean {
    const index = this.tickets.findIndex((t) => t.id === ticketId);
    if (index !== -1) {
      this.tickets.splice(index, 1);
      return true;
    }
    return false;
  }
}

export const itTicketService = new ITTicketService();
