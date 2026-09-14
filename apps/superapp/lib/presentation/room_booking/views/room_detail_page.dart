import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../domain/entities/room_booking_entity.dart';

class RoomDetailPage extends StatefulWidget {
  final RoomItem room;

  const RoomDetailPage({super.key, required this.room});

  @override
  State<RoomDetailPage> createState() => _RoomDetailPageState();
}

class _RoomDetailPageState extends State<RoomDetailPage> {
  bool _isFavorite = false;

  @override
  Widget build(BuildContext context) {
    final rm = widget.room;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Full Hero Image Banner (Travelio Style)
                Stack(
                  children: [
                    Image.network(
                      rm.imageUrl,
                      height: 280,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(
                        height: 280,
                        color: AppColors.secondary,
                        child: const Icon(Icons.meeting_room_rounded, color: Colors.white, size: 60),
                      ),
                    ),
                    Container(
                      height: 280,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withValues(alpha: 0.4),
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.2),
                          ],
                        ),
                      ),
                    ),
                    SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            IconButton(
                              onPressed: () => Navigator.pop(context),
                              icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                              style: IconButton.styleFrom(
                                backgroundColor: Colors.black.withValues(alpha: 0.3),
                              ),
                            ),
                            IconButton(
                              onPressed: () {
                                setState(() => _isFavorite = !_isFavorite);
                              },
                              icon: Icon(
                                _isFavorite ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                                color: _isFavorite ? Colors.redAccent : Colors.white,
                              ),
                              style: IconButton.styleFrom(
                                backgroundColor: Colors.black.withValues(alpha: 0.3),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),

                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Status & Code
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Flexible(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primarySoft,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                rm.code,
                                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          StatusBadge(
                            label: rm.status == RoomStatus.available ? "TERSEDIA HARI INI" : "SEDANG TERPAKAI",
                            type: rm.status == RoomStatus.available ? BadgeType.success : BadgeType.danger,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Room Title & Location
                      Text(
                        rm.name,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.location_on_rounded, size: 16, color: AppColors.textSecondary),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              "${rm.location} • ${rm.floor}",
                              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Specification Bar Icons (Travelio Style Specs)
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              _buildSpecIcon(Icons.people_rounded, "${rm.capacity} Orang", "Kapasitas"),
                              const SizedBox(width: 24),
                              _buildSpecIcon(Icons.straighten_rounded, "42 m²", "Luas"),
                              const SizedBox(width: 24),
                              _buildSpecIcon(Icons.ac_unit_rounded, "Dual AC", "Pendingin"),
                              const SizedBox(width: 24),
                              _buildSpecIcon(Icons.wifi_rounded, "5G WiFi", "Koneksi"),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Amenities Grid (Fasilitas Lengkap)
                      const Text(
                        "Fasilitas & Perlengkapan Ruangan",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 12),

                      Wrap(
                        spacing: 10,
                        runSpacing: 10,
                        children: rm.facilities.map((fac) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.cardBorder),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.check_circle_rounded, size: 16, color: AppColors.success),
                              const SizedBox(width: 6),
                              Text(fac, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: AppColors.textPrimary)),
                            ],
                          ),
                        )).toList(),
                      ),
                      const SizedBox(height: 24),

                      // Description Section
                      const Text(
                        "Deskripsi Ruangan",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        "Ruang rapat dirancang khusus untuk memenuhi kebutuhan rapat eksekutif, koordinasi tim manufaktur, dan presentasi klien. Dilengkapi dengan peredam suara ruangan (soundproof) dan meja konferensi modular.",
                        style: TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.5),
                      ),
                      const SizedBox(height: 24),

                      // Time Slot Schedule Preview
                      const Text(
                        "Jadwal Slot Waktu Hari Ini",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 10),
                      _buildScheduleRow("09:00 - 10:30 WIB", "Tersedia", true),
                      _buildScheduleRow("11:00 - 12:30 WIB", "Tersedia", true),
                      _buildScheduleRow("14:00 - 15:30 WIB", "Rapat Sync Q3 (Terisi)", false),
                      _buildScheduleRow("16:00 - 17:30 WIB", "Tersedia", true),

                      const SizedBox(height: 100), // Spacing for sticky bottom bar
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Sticky Travelio Style Bottom Action Bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
                    blurRadius: 20,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Status Ruangan", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                          const SizedBox(height: 2),
                          Text(
                            rm.status == RoomStatus.available ? "Tersedia Hari Ini" : "Dalam Penggunaan",
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: rm.status == RoomStatus.available ? AppColors.success : AppColors.danger,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: rm.status == RoomStatus.available
                          ? () => _showBookModal(context, rm)
                          : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: Colors.grey[300],
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text("Booking Sekarang", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecIcon(IconData icon, String label, String sub) {
    return Column(
      children: [
        Icon(icon, color: AppColors.primary, size: 22),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textPrimary)),
        Text(sub, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
      ],
    );
  }

  Widget _buildScheduleRow(String time, String statusStr, bool isAvail) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isAvail ? AppColors.surface : AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isAvail ? AppColors.cardBorder : Colors.transparent),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(Icons.access_time_rounded, size: 16, color: isAvail ? AppColors.primary : AppColors.textMuted),
              const SizedBox(width: 8),
              Text(time, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: isAvail ? AppColors.textPrimary : AppColors.textMuted)),
            ],
          ),
          StatusBadge(
            label: isAvail ? "TERSEDIA" : "TERISI",
            type: isAvail ? BadgeType.success : BadgeType.neutral,
          ),
        ],
      ),
    );
  }

  void _showBookModal(BuildContext context, RoomItem rm) {
    final titleCtrl = TextEditingController();
    String selectedTimeSlot = "09:00 - 10:30 WIB";

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
              Text("Konfirmasi Booking ${rm.name}", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              Text("${rm.location} • Kapasitas ${rm.capacity} Orang", style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              const SizedBox(height: 16),

              TextField(
                controller: titleCtrl,
                decoration: InputDecoration(
                  labelText: "Agenda / Judul Rapat",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),

              DropdownButtonFormField<String>(
                initialValue: selectedTimeSlot,
                items: const [
                  DropdownMenuItem(value: "09:00 - 10:30 WIB", child: Text("09:00 - 10:30 WIB")),
                  DropdownMenuItem(value: "11:00 - 12:30 WIB", child: Text("11:00 - 12:30 WIB")),
                  DropdownMenuItem(value: "16:00 - 17:30 WIB", child: Text("16:00 - 17:30 WIB")),
                ],
                onChanged: (val) {
                  if (val != null) selectedTimeSlot = val;
                },
                decoration: InputDecoration(
                  labelText: "Pilih Slot Waktu Rapat",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 20),

              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text("Berhasil memesan ${rm.name}! Slot waktu telah tersimpan."),
                      backgroundColor: AppColors.success,
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text("Konfirmasi Pemesanan", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ],
          ),
        );
      },
    );
  }
}
