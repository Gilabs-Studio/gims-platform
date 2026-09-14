import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../domain/entities/asset_borrowing_entity.dart';

class AssetBorrowingPage extends StatefulWidget {
  const AssetBorrowingPage({super.key});

  @override
  State<AssetBorrowingPage> createState() => _AssetBorrowingPageState();
}

class _AssetBorrowingPageState extends State<AssetBorrowingPage> {
  final List<AssetItem> _assets = [
    const AssetItem(
      id: "ast-1",
      code: "AST-LAP-09",
      name: "Laptop Dell XPS 15 i7 32GB",
      category: "IT Hardware",
      serialNumber: "SN-DXP-99812",
      location: "Ruang IT Support",
      status: AssetStatus.available,
      condition: "Sangat Baik",
      imageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600",
    ),
    const AssetItem(
      id: "ast-2",
      code: "AST-PRJ-03",
      name: "Proyektor Epson 4K Wireless Laser",
      category: "Audio Visual",
      serialNumber: "SN-EPS-44120",
      location: "Gudang Peralatan A",
      status: AssetStatus.available,
      condition: "Baik",
      imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600",
    ),
    const AssetItem(
      id: "ast-3",
      code: "AST-SCN-12",
      name: "Barcode Scanner Zebra Wireless 2D",
      category: "Elektronik",
      serialNumber: "SN-ZBR-77182",
      location: "Gudang Logistik Outbound",
      status: AssetStatus.borrowed,
      condition: "Baik",
      imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600",
    ),
    const AssetItem(
      id: "ast-4",
      code: "AST-VHC-01",
      name: "Toyota Camry 2.5 V Sedan (B 1088 RFS)",
      category: "Kendaraan Dinas",
      serialNumber: "SN-CMR-88392",
      location: "Parkiran VIP Basement 2",
      status: AssetStatus.available,
      condition: "Sangat Baik",
      imageUrl: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600",
    ),
    const AssetItem(
      id: "ast-5",
      code: "AST-VHC-02",
      name: "Honda CR-V Turbo SUV (B 1920 KJS)",
      category: "Kendaraan Dinas",
      serialNumber: "SN-CRV-99201",
      location: "Parkiran Executive Basement 1",
      status: AssetStatus.available,
      condition: "Sangat Baik",
      imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600",
    ),
  ];

  final List<BorrowingRecord> _myLoans = [
    BorrowingRecord(
      id: "brw-201",
      requestNumber: "BRW-2026-044",
      assetId: "ast-1",
      assetName: "Laptop Dell XPS 15 i7 32GB",
      borrowerName: "Kevin Stanley",
      borrowerDept: "Production",
      borrowDate: DateTime.now().subtract(const Duration(days: 1)),
      expectedReturnDate: DateTime.now().add(const Duration(days: 3)),
      purpose: "Pengujian Software ERP Manufaktur di Site B",
      status: "APPROVED",
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
          "Aset",
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
            // Active Loan Banner
            if (_myLoans.isNotEmpty) ...[
              const Text(
                "Aset Yang Sedang Dipinjam",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 12),
              ..._myLoans.map((loan) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                child: CustomCard(
                  gradient: AppColors.primaryGradient,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            loan.requestNumber,
                            style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const StatusBadge(label: "DIPINJAM", type: BadgeType.success),
                      ],
                    ),
                    const SizedBox(height: 8),
                      Text(loan.assetName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                      const SizedBox(height: 4),
                      Text("Keperluan: ${loan.purpose}", style: const TextStyle(color: Colors.white70, fontSize: 12)),
                      const SizedBox(height: 8),
                      Text(
                        "Tgl Pengembalian: ${DateFormatter.formatShortDate(loan.expectedReturnDate)}",
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              )),
              const SizedBox(height: 20),
            ],

            // Asset Catalog List
            const Text(
              "Katalog Aset Siap Pinjam",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 12),

            ..._assets.map((ast) => Container(
              margin: const EdgeInsets.only(bottom: 14),
              child: CustomCard(
                padding: const EdgeInsets.all(14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Image.network(
                        ast.imageUrl,
                        width: 80,
                        height: 80,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Container(
                          width: 80,
                          height: 80,
                          color: AppColors.primarySoft,
                          child: const Icon(Icons.inventory_2_rounded, color: AppColors.primary, size: 28),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppColors.primarySoft,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    ast.code,
                                    style: const TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              StatusBadge(
                                label: ast.status == AssetStatus.available ? "TERSEDIA" : "DIPINJAM",
                                type: ast.status == AssetStatus.available ? BadgeType.success : BadgeType.warning,
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),

                          Text(
                            ast.name,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "Serial: ${ast.serialNumber} • Kondisi: ${ast.condition}",
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 10),

                          ElevatedButton(
                            onPressed: ast.status == AssetStatus.available
                                ? () => _showBorrowAssetModal(context, ast)
                                : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              disabledBackgroundColor: Colors.grey[300],
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                ast.status == AssetStatus.available ? "Ajukan Pinjam Aset" : "Sedang Dipinjam",
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      ),
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

  void _showBorrowAssetModal(BuildContext context, AssetItem ast) {
    final purposeCtrl = TextEditingController();
    final durationCtrl = TextEditingController(text: "3");

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
              Text("Form Pinjam ${ast.name}", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              Text("Kode: ${ast.code} • SN: ${ast.serialNumber}", style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
              const SizedBox(height: 16),

              TextField(
                controller: purposeCtrl,
                decoration: InputDecoration(
                  labelText: "Keperluan / Tujuan Peminjaman",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: durationCtrl,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: "Durasi Pinjam (Jumlah Hari)",
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 20),

              ElevatedButton(
                onPressed: () {
                  if (purposeCtrl.text.isNotEmpty) {
                    final days = int.tryParse(durationCtrl.text) ?? 3;
                    setState(() {
                      _myLoans.add(
                        BorrowingRecord(
                          id: "brw-${DateTime.now().millisecondsSinceEpoch}",
                          requestNumber: "BRW-2026-0${(_myLoans.length + 45)}",
                          assetId: ast.id,
                          assetName: ast.name,
                          borrowerName: "Kevin Stanley",
                          borrowerDept: "Production",
                          borrowDate: DateTime.now(),
                          expectedReturnDate: DateTime.now().add(Duration(days: days)),
                          purpose: purposeCtrl.text,
                          status: "APPROVED",
                        ),
                      );
                    });
                  }
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text("Pengajuan pinjam ${ast.name} berhasil disetujui!"),
                      backgroundColor: AppColors.success,
                    ),
                  );
                },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text("Kirim Pengajuan Pinjam", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ],
          ),
        );
      },
    );
  }
}
