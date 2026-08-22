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
  String _selectedDomainFilter = "Semua";
  String _selectedStatusFilter = "Semua";

  final List<TicketItem> _tickets = [
    TicketItem(
      id: "tck-1",
      ticketNumber: "HR-8821",
      domain: TicketDomain.hrd,
      title: "AC Ruang Rapat Executive Berisik & Bocor Air",
      category: "AC & Fasilitas Gedung",
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
      ticketNumber: "IT-8819",
      domain: TicketDomain.it,
      title: "Koneksi Wifi Pabrik Line A sering Disconnect",
      category: "Jaringan Wifi & Internet",
      priority: TicketPriority.high,
      status: TicketStatus.open,
      location: "Gedung Produksi A",
      description: "Access point 03 tidak memancarkan sinyal 5GHz.",
      reporterName: "Siti Rahma",
      createdAt: DateTime.now().subtract(const Duration(hours: 5)),
    ),
    TicketItem(
      id: "tck-3",
      ticketNumber: "IT-8805",
      domain: TicketDomain.it,
      title: "Printer Thermal Label Barcode Rusak Head",
      category: "IT Hardware & Perangkat",
      priority: TicketPriority.medium,
      status: TicketStatus.resolved,
      location: "Gudang Logistik Outbound",
      description: "Hasil cetak barcode terputus-putus. Sudah diganti head print baru.",
      reporterName: "Rudi Hartono",
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      assignedTechnician: "Agus IT Support",
    ),
    TicketItem(
      id: "tck-4",
      ticketNumber: "HR-8802",
      domain: TicketDomain.hrd,
      title: "Klarifikasi Rincian Jam Lembur Slip Gaji Agustus",
      category: "Penggajian & Slip Gaji",
      priority: TicketPriority.low,
      status: TicketStatus.resolved,
      location: "Lantai 3 - Ruang Finance 302",
      description: "Mohon konfirmasi perbedaan hitungan jam lembur pada slip gaji periode Agustus.",
      reporterName: "Kevin Stanley",
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      assignedTechnician: "Rina HR Support",
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final filteredTickets = _tickets.where((tck) {
      // Domain filter check
      if (_selectedDomainFilter == "Layanan IT" && tck.domain != TicketDomain.it) {
        return false;
      }
      if (_selectedDomainFilter == "Layanan SDM" && tck.domain != TicketDomain.hrd) {
        return false;
      }

      // Status filter check
      if (_selectedStatusFilter == "Open" && tck.status != TicketStatus.open) {
        return false;
      }
      if (_selectedStatusFilter == "Dalam Proses" && tck.status != TicketStatus.inProgress) {
        return false;
      }
      if (_selectedStatusFilter == "Selesai" &&
          (tck.status != TicketStatus.resolved && tck.status != TicketStatus.closed)) {
        return false;
      }
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
          "Pusat Tiket Bantuan & Layanan",
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
                          "Ada Kendala IT atau SDM/Fasilitas?",
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                        SizedBox(height: 2),
                        Text(
                          "Pilih portal desk IT atau SDM untuk penanganan cepat",
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
            const SizedBox(height: 20),

            // Filter Domain Selector Chips
            const Text(
              "Filter Portal Layanan",
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                _buildDomainChip("Semua", Icons.apps_rounded, _selectedDomainFilter == "Semua"),
                const SizedBox(width: 8),
                _buildDomainChip("Layanan IT", Icons.computer_rounded, _selectedDomainFilter == "Layanan IT"),
                const SizedBox(width: 8),
                _buildDomainChip("Layanan SDM", Icons.people_rounded, _selectedDomainFilter == "Layanan SDM"),
              ],
            ),
            const SizedBox(height: 16),

            // Header List & Status Filter Chips
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
            const SizedBox(height: 10),

            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ["Semua", "Open", "Dalam Proses", "Selesai"].map((filter) {
                  final isSelected = _selectedStatusFilter == filter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(filter),
                      selected: isSelected,
                      onSelected: (_) => setState(() => _selectedStatusFilter = filter),
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
            if (filteredTickets.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 40),
                child: Column(
                  children: const [
                    Icon(Icons.inbox_rounded, size: 48, color: AppColors.textMuted),
                    SizedBox(height: 12),
                    Text(
                      "Tidak ada tiket bantuan pada filter ini.",
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                    ),
                  ],
                ),
              )
            else
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
                                // Ticket Number
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
                                // Domain Tag Badge
                                _buildDomainBadge(tck.domain),
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    tck.category,
                                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
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

  Widget _buildDomainChip(String label, IconData icon, bool isSelected) {
    return FilterChip(
      showCheckmark: false,
      avatar: Icon(
        icon,
        size: 16,
        color: isSelected ? Colors.white : AppColors.primary,
      ),
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => setState(() => _selectedDomainFilter = label),
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.surface,
      side: BorderSide(color: isSelected ? AppColors.primary : AppColors.cardBorder),
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : AppColors.textPrimary,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
    );
  }

  Widget _buildDomainBadge(TicketDomain domain) {
    final isIT = domain == TicketDomain.it;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: isIT ? AppColors.primary.withValues(alpha: 0.1) : Colors.teal.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: isIT ? AppColors.primary.withValues(alpha: 0.3) : Colors.teal.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isIT ? Icons.computer_rounded : Icons.people_rounded,
            size: 11,
            color: isIT ? AppColors.primary : Colors.teal.shade700,
          ),
          const SizedBox(width: 3),
          Text(
            isIT ? "IT Support" : "SDM & HR",
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: isIT ? AppColors.primary : Colors.teal.shade700,
            ),
          ),
        ],
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

    TicketDomain selectedDomain = TicketDomain.it;
    String selectedCategory = "IT Hardware & Perangkat";
    int currentStep = 1;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: currentStep == 1
                  ? _buildStep1DomainSelection(context, setModalState, (domain, defaultCat) {
                      setModalState(() {
                        selectedDomain = domain;
                        selectedCategory = defaultCat;
                        currentStep = 2;
                      });
                    })
                  : _buildStep2Form(
                      context,
                      setModalState,
                      selectedDomain,
                      selectedCategory,
                      titleCtrl,
                      locCtrl,
                      descCtrl,
                      (newCat) => setModalState(() => selectedCategory = newCat),
                      () => setModalState(() => currentStep = 1),
                      () {
                        if (titleCtrl.text.isNotEmpty) {
                          final isIT = selectedDomain == TicketDomain.it;
                          final newNumber = "${isIT ? "IT" : "HR"}-${(8800 + _tickets.length + 1)}";

                          setState(() {
                            _tickets.insert(
                              0,
                              TicketItem(
                                id: "tck-${DateTime.now().millisecondsSinceEpoch}",
                                ticketNumber: newNumber,
                                domain: selectedDomain,
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
                    ),
            );
          },
        );
      },
    );
  }

  // STEP 1: Modal Domain Selection (Kartu IT vs SDM)
  Widget _buildStep1DomainSelection(
    BuildContext context,
    StateSetter setModalState,
    void Function(TicketDomain domain, String defaultCategory) onSelect,
  ) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Pilih Desk Portal Layanan",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 4),
        const Text(
          "Pilih jenis layanan bantuan yang sesuai dengan masalah Anda",
          style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 20),

        // Option 1: IT Support Card
        InkWell(
          onTap: () => onSelect(TicketDomain.it, "IT Hardware & Perangkat"),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.3), width: 1.5),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.computer_rounded, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        "Layanan Teknologi & Informasi",
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      SizedBox(height: 2),
                      Text(
                        "Hardware PC/Laptop, Software ERP, Wifi, Printer, & Akses Akun",
                        style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, color: AppColors.primary),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Option 2: HRD / SDM Support Card
        InkWell(
          onTap: () => onSelect(TicketDomain.hrd, "Penggajian & Slip Gaji"),
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.teal.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.teal.withValues(alpha: 0.3), width: 1.5),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.teal.shade600,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.people_rounded, color: Colors.white, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        "Layanan SDM & Fasilitas Karyawan",
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      SizedBox(height: 2),
                      Text(
                        "Payroll/Gaji, Absensi & Cuti, AC & Fasilitas Gedung, Administrasi Staff",
                        style: TextStyle(fontSize: 11, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: Colors.teal.shade700),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  // STEP 2: Modal Detail Form
  Widget _buildStep2Form(
    BuildContext context,
    StateSetter setModalState,
    TicketDomain domain,
    String selectedCategory,
    TextEditingController titleCtrl,
    TextEditingController locCtrl,
    TextEditingController descCtrl,
    void Function(String cat) onCategoryChanged,
    VoidCallback onBackToStep1,
    VoidCallback onSubmit,
  ) {
    final isIT = domain == TicketDomain.it;

    final categoryItems = isIT
        ? const [
            DropdownMenuItem(value: "IT Hardware & Perangkat", child: Text("IT Hardware & Perangkat")),
            DropdownMenuItem(value: "Software & Aplikasi ERP", child: Text("Software & Aplikasi ERP")),
            DropdownMenuItem(value: "Jaringan Wifi & Internet", child: Text("Jaringan Wifi & Internet")),
            DropdownMenuItem(value: "Akses Akun & Email Staff", child: Text("Akses Akun & Email Staff")),
          ]
        : const [
            DropdownMenuItem(value: "Penggajian & Slip Gaji", child: Text("Penggajian & Slip Gaji")),
            DropdownMenuItem(value: "Cuti & Absensi Staff", child: Text("Cuti & Absensi Staff")),
            DropdownMenuItem(value: "AC & Fasilitas Gedung", child: Text("AC & Fasilitas Gedung")),
            DropdownMenuItem(value: "Administrasi & Dokumen HR", child: Text("Administrasi & Dokumen HR")),
          ];

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Portal Banner header with Back Button
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isIT ? AppColors.primary.withValues(alpha: 0.08) : Colors.teal.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isIT ? AppColors.primary.withValues(alpha: 0.2) : Colors.teal.withValues(alpha: 0.2),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    isIT ? Icons.computer_rounded : Icons.people_rounded,
                    size: 18,
                    color: isIT ? AppColors.primary : Colors.teal.shade700,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isIT ? "Layanan Teknologi & Informasi" : "Layanan SDM & Fasilitas Karyawan",
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: isIT ? AppColors.primary : Colors.teal.shade700,
                    ),
                  ),
                ],
              ),
              InkWell(
                onTap: onBackToStep1,
                borderRadius: BorderRadius.circular(8),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                  child: Row(
                    children: const [
                      Icon(Icons.arrow_back, size: 14, color: AppColors.textSecondary),
                      SizedBox(width: 4),
                      Text("Ganti Portal", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        const Text("Form Laporan Kendala Baru", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        const SizedBox(height: 14),

        DropdownButtonFormField<String>(
          value: selectedCategory,
          items: categoryItems,
          onChanged: (val) {
            if (val != null) onCategoryChanged(val);
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
          onPressed: onSubmit,
          style: ElevatedButton.styleFrom(
            minimumSize: const Size.fromHeight(50),
            backgroundColor: isIT ? AppColors.primary : Colors.teal.shade700,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: const Text("Kirim Laporan Tiket", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
        ),
      ],
    );
  }
}
