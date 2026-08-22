import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../domain/entities/ticketing_entity.dart';

class TicketingPage extends StatefulWidget {
  const TicketingPage({super.key});

  @override
  State<TicketingPage> createState() => _TicketingPageState();
}

class _TicketingPageState extends State<TicketingPage> {
  String _selectedFilter = "Semua";

  final List<TicketItem> _tickets = [
    TicketItem(
      id: "tck-1",
      ticketNumber: "TCK-8821",
      title: "AC Ruang Rapat Executive Berisik & Bocor Air",
      category: "Fasilitas AC",
      priority: TicketPriority.urgent,
      status: TicketStatus.inProgress,
      location: "Lantai 2 - Ruang Rapat Utama",
      description: "Air AC menetes deras ke meja rapat. Perlu perbaikan teknisi segera.",
      reporterName: "Kevin Stanley",
      createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      assignedTechnician: "Budi Teknisi (HVAC)",
    ),
    TicketItem(
      id: "tck-2",
      ticketNumber: "TCK-8819",
      title: "Koneksi Wifi Pabrik Line A sering Disconnect",
      category: "IT Software",
      priority: TicketPriority.high,
      status: TicketStatus.open,
      location: "Gedung Produksi A",
      description: "Access point 03 tidak memancarkan sinyal 5GHz.",
      reporterName: "Siti Rahma",
      createdAt: DateTime.now().subtract(const Duration(hours: 5)),
    ),
    TicketItem(
      id: "tck-3",
      ticketNumber: "TCK-8805",
      title: "Printer Thermal Label Barcode Rusak Nozzle",
      category: "IT Hardware",
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      location: "Gudang Logistik Outbound",
      description: "Hasil cetak barcode terputus-putus. Sudah diganti head print baru.",
      reporterName: "Rudi Hartono",
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      assignedTechnician: "Agus IT Support",
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final filteredTickets = _tickets.where((tck) {
      if (_selectedFilter == "Open") return tck.status == TicketStatus.open;
      if (_selectedFilter == "Dalam Proses") return tck.status == TicketStatus.inProgress;
      if (_selectedFilter == "Selesai") return tck.status == TicketStatus.resolved || tck.status == TicketStatus.closed;
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          "Ticketing & Laporkan Kendala",
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Create Ticket Action Hero Banner
            CustomCard(
              gradient: AppColors.primaryGradient,
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.confirmation_number_rounded, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          "Ada Kendala IT atau Fasilitas?",
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        SizedBox(height: 2),
                        Text(
                          "Laporkan masalah untuk penanganan tim teknisi",
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () => _showCreateTicketModal(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    ),
                    child: const Text("Buat Laporan", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Status Filter Chips
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Daftar Tiket Kendala",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                Text(
                  "Total: ${filteredTickets.length} Tiket",
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
            const SizedBox(height: 12),

            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ["Semua", "Open", "Dalam Proses", "Selesai"].map((filter) {
                  final isSelected = _selectedFilter == filter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(filter),
                      selected: isSelected,
                      onSelected: (_) => setState(() => _selectedFilter = filter),
                      selectedColor: AppColors.primary,
                      backgroundColor: AppColors.surface,
                      checkmarkColor: Colors.white,
                      side: BorderSide(color: isSelected ? AppColors.primary : AppColors.cardBorder),
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : AppColors.textPrimary,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Tickets List
            ...filteredTickets.map((tck) => Container(
              margin: const EdgeInsets.only(bottom: 12),
              child: CustomCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppColors.primarySoft,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  tck.ticketNumber,
                                  style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Flexible(
                                child: Text(
                                  tck.category,
                                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        StatusBadge(
                          label: _getPriorityLabel(tck.priority),
                          type: _getPriorityBadgeType(tck.priority),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    Text(
                      tck.title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      tck.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    Divider(height: 1, color: AppColors.cardBorder.withValues(alpha: 0.5)),
                    const SizedBox(height: 10),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              const Icon(Icons.location_on_rounded, size: 14, color: AppColors.textMuted),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  tck.location,
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        StatusBadge(
                          label: _getStatusLabel(tck.status),
                          type: _getStatusBadgeType(tck.status),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            )),
            const SizedBox(height: 90), // Bottom spacing for floating dock navigation
          ],
        ),
      ),
    );
  }

  String _getPriorityLabel(TicketPriority p) {
    switch (p) {
      case TicketPriority.urgent:
        return "URGENT";
      case TicketPriority.high:
        return "HIGH";
      case TicketPriority.medium:
        return "MEDIUM";
      case TicketPriority.low:
        return "LOW";
    }
  }

  BadgeType _getPriorityBadgeType(TicketPriority p) {
    switch (p) {
      case TicketPriority.urgent:
        return BadgeType.danger;
      case TicketPriority.high:
        return BadgeType.warning;
      case TicketPriority.medium:
        return BadgeType.info;
      case TicketPriority.low:
        return BadgeType.neutral;
    }
  }

  String _getStatusLabel(TicketStatus s) {
    switch (s) {
      case TicketStatus.open:
        return "OPEN";
      case TicketStatus.inProgress:
        return "PROSES";
      case TicketStatus.pendingParts:
        return "PENDING";
      case TicketStatus.resolved:
        return "SELESAI";
      case TicketStatus.closed:
        return "CLOSED";
    }
  }

  BadgeType _getStatusBadgeType(TicketStatus s) {
    switch (s) {
      case TicketStatus.open:
        return BadgeType.warning;
      case TicketStatus.inProgress:
        return BadgeType.info;
      case TicketStatus.pendingParts:
        return BadgeType.warning;
      case TicketStatus.resolved:
      case TicketStatus.closed:
        return BadgeType.success;
    }
  }

  void _showCreateTicketModal(BuildContext context) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final locCtrl = TextEditingController(text: "Gedung Utama - Lantai 2");
    String selectedCategory = "Fasilitas AC";

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Form Laporan Kendala Baru", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: selectedCategory,
                items: const [
                  DropdownMenuItem(value: "Fasilitas AC", child: Text("Fasilitas AC & Plumbing")),
                  DropdownMenuItem(value: "IT Hardware", child: Text("IT Hardware / Komputer")),
                  DropdownMenuItem(value: "IT Software", child: Text("IT Software & Network")),
                  DropdownMenuItem(value: "Perbaikan Listrik", child: Text("Kelistrikan & Penerangan")),
                ],
                onChanged: (val) {
                  if (val != null) selectedCategory = val;
                },
                decoration: InputDecoration(
                  labelText: "Kategori Kendala",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: titleCtrl,
                decoration: InputDecoration(
                  labelText: "Judul Singkat Kendala",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: locCtrl,
                decoration: InputDecoration(
                  labelText: "Lokasi Detail",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: "Deskripsi Masalah",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  if (titleCtrl.text.isNotEmpty) {
                    setState(() {
                      _tickets.insert(
                        0,
                        TicketItem(
                          id: "tck-${DateTime.now().millisecondsSinceEpoch}",
                          ticketNumber: "TCK-${(8800 + _tickets.length + 1)}",
                          title: titleCtrl.text,
                          category: selectedCategory,
                          priority: TicketPriority.high,
                          status: TicketStatus.open,
                          location: locCtrl.text,
                          description: descCtrl.text.isNotEmpty ? descCtrl.text : "Tidak ada deskripsi tambahan",
                          reporterName: "Kevin Stanley",
                          createdAt: DateTime.now(),
                        ),
                      );
                    });
                  }
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Laporan kendala berhasil dikirim ke tim Helpdesk!"),
                      backgroundColor: AppColors.success,
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text("Kirim Laporan Tiket", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ],
          ),
        );
      },
    );
  }
}
