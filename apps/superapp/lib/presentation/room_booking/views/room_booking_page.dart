import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../domain/entities/room_booking_entity.dart';
import 'room_detail_page.dart';

class RoomBookingPage extends StatefulWidget {
  const RoomBookingPage({super.key});

  @override
  State<RoomBookingPage> createState() => _RoomBookingPageState();
}

class _RoomBookingPageState extends State<RoomBookingPage> {
  String _selectedCategory = "Semua";

  final List<RoomItem> _rooms = [
    const RoomItem(
      id: "room-1",
      code: "RM-EX-01",
      name: "Ruang Rapat Executive A",
      capacity: 14,
      status: RoomStatus.available,
      location: "Gedung A - Lantai 2",
      floor: "Lantai 2",
      facilities: ["Proyektor 4K", "WiFi 5G", "Smart TV 65\"", "Dual AC", "Video Conf"],
      imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600",
    ),
    const RoomItem(
      id: "room-2",
      code: "RM-CR-02",
      name: "Creative Brainstorming Studio B",
      capacity: 8,
      status: RoomStatus.occupied,
      location: "Gedung B - Lantai 1",
      floor: "Lantai 1",
      facilities: ["Whiteboard Kaca", "WiFi 5G", "Coffee Machine", "Soundbar"],
      imageUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=600",
    ),
    const RoomItem(
      id: "room-3",
      code: "RM-AUD-03",
      name: "Grand Auditorium & Townhall Main",
      capacity: 50,
      status: RoomStatus.available,
      location: "Gedung Utama - Lantai 3",
      floor: "Lantai 3",
      facilities: ["Stage Audio", "Dual Projector", "Wireless Mic", "Air Purifier"],
      imageUrl: "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=600",
    ),
  ];

  @override
  Widget build(BuildContext context) {
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
          "Pemesanan Ruang Meeting",
          style: TextStyle(
            color: AppColors.textPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Travelio Style Filter Bar
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.tune_rounded, size: 16, color: AppColors.textPrimary),
                        SizedBox(width: 6),
                        Text("Filter", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),

                  ...["Semua", "Executive", "Creative Studio", "Auditorium"].map((cat) {
                    final isSelected = _selectedCategory == cat;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(cat),
                        selected: isSelected,
                        onSelected: (_) => setState(() => _selectedCategory = cat),
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
                  }),
                ],
              ),
            ),
            const SizedBox(height: 20),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Daftar Ruangan Rapat",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                Text(
                  "Tersedia ${_rooms.where((r) => r.status == RoomStatus.available).length} Ruangan",
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Travelio Style Cards List
            ..._rooms.map((rm) => Container(
              margin: const EdgeInsets.only(bottom: 20),
              child: InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => RoomDetailPage(room: rm)),
                  );
                },
                borderRadius: BorderRadius.circular(20),
                child: CustomCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Photo Header with Overlay Badges
                      Stack(
                        children: [
                          ClipRRect(
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                            child: Image.network(
                              rm.imageUrl,
                              height: 180,
                              width: double.infinity,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                height: 180,
                                color: AppColors.secondary,
                                child: const Icon(Icons.meeting_room_rounded, color: Colors.white, size: 48),
                              ),
                            ),
                          ),
                          Positioned(
                            top: 12,
                            left: 12,
                            child: StatusBadge(
                              label: rm.status == RoomStatus.available ? "TERSEDIA" : "TERPAKAI",
                              type: rm.status == RoomStatus.available ? BadgeType.success : BadgeType.danger,
                            ),
                          ),
                          Positioned(
                            top: 12,
                            right: 12,
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.4),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.favorite_border_rounded, color: Colors.white, size: 18),
                            ),
                          ),
                        ],
                      ),

                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Location Subtitle
                            Text(
                              "${rm.location} • ${rm.floor}",
                              style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 4),

                            // Specifications Row (Travelio Style Icons)
                            Row(
                              children: [
                                const Icon(Icons.people_alt_rounded, size: 14, color: AppColors.primary),
                                const SizedBox(width: 4),
                                Text("${rm.capacity} Orang", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                const SizedBox(width: 12),
                                const Icon(Icons.straighten_rounded, size: 14, color: AppColors.textMuted),
                                const SizedBox(width: 4),
                                const Text("42 m²", style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                const SizedBox(width: 12),
                                const Icon(Icons.ac_unit_rounded, size: 14, color: AppColors.textMuted),
                                const SizedBox(width: 4),
                                const Text("Full AC", style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                              ],
                            ),
                            const SizedBox(height: 8),

                            // Room Title
                            Text(
                              rm.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Facilities Pills
                            Wrap(
                              spacing: 6,
                              runSpacing: 6,
                              children: rm.facilities.map((fac) => Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppColors.background,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.cardBorder),
                                ),
                                child: Text(fac, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                              )).toList(),
                            ),
                            const SizedBox(height: 14),

                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text("Lihat Detail & Slot Waktu", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary)),
                                const Icon(Icons.arrow_forward_rounded, size: 16, color: AppColors.primary),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            )),
          ],
        ),
      ),
    );
  }
}
