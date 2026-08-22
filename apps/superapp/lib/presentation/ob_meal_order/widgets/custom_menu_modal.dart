import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../domain/entities/meal_entity.dart';
import '../../meal_order/viewmodels/meal_order_viewmodel.dart';

class CustomMenuModal extends StatefulWidget {
  final MealMenuItem? existingItem;

  const CustomMenuModal({super.key, this.existingItem});

  static void show(BuildContext context, {MealMenuItem? existingItem}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => CustomMenuModal(existingItem: existingItem),
    );
  }

  @override
  State<CustomMenuModal> createState() => _CustomMenuModalState();
}

class _CustomMenuModalState extends State<CustomMenuModal> {
  late TextEditingController _nameCtrl;
  late TextEditingController _priceCtrl;
  late TextEditingController _vendorCtrl;
  late TextEditingController _descCtrl;
  late TextEditingController _presetNotesCtrl;
  String _category = "Makanan Utama";
  bool _isAvailable = true;

  @override
  void initState() {
    super.initState();
    final item = widget.existingItem;
    _nameCtrl = TextEditingController(text: item?.name ?? "");
    _priceCtrl = TextEditingController(text: item?.price.toInt().toString() ?? "25000");
    _vendorCtrl = TextEditingController(text: item?.vendorName ?? "Kantin OB Utama");
    _descCtrl = TextEditingController(text: item?.description ?? "");
    _presetNotesCtrl = TextEditingController(
      text: item?.presetNotes.join(", ") ?? "Tanpa Cabai, Sambal Dipisah, Es Sedikit",
    );
    _category = item?.category ?? "Makanan Utama";
    _isAvailable = item?.isAvailableToday ?? true;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _priceCtrl.dispose();
    _vendorCtrl.dispose();
    _descCtrl.dispose();
    _presetNotesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.existingItem != null;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle bar
            Center(
              child: Container(
                width: 44,
                height: 5,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            const SizedBox(height: 16),

            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  isEditing ? "Edit Menu Makanan" : "Tambah Menu Makanan Baru",
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    "OB Admin Menu",
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Form inputs
            TextField(
              controller: _nameCtrl,
              decoration: InputDecoration(
                labelText: "Nama Menu Makanan / Minuman",
                hintText: "misal: Nasi Ayam Geprek Sambal Ijo",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _category,
                    decoration: InputDecoration(
                      labelText: "Kategori",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    items: const [
                      DropdownMenuItem(value: "Makanan Utama", child: Text("Makanan Utama")),
                      DropdownMenuItem(value: "Minuman", child: Text("Minuman")),
                      DropdownMenuItem(value: "Extra / Snack", child: Text("Extra / Snack")),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _category = val);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _priceCtrl,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: "Harga (Rp)",
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _vendorCtrl,
              decoration: InputDecoration(
                labelText: "Nama Kantin / Warung",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),

            TextField(
              controller: _presetNotesCtrl,
              decoration: InputDecoration(
                labelText: "Preset Catatan Khusus (Dipisah Koma)",
                hintText: "Tanpa Cabai, Sambal Dipisah, Es Sedikit",
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 12),

            // Availability Switch
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text("Tersedia Hari Ini?", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: const Text("Jika dimatikan, staff tidak bisa menitip menu ini saat ini.", style: TextStyle(fontSize: 12)),
              value: _isAvailable,
              activeTrackColor: AppColors.primary,
              onChanged: (val) => setState(() => _isAvailable = val),
            ),
            const SizedBox(height: 16),

            // Submit Button
            ElevatedButton(
              onPressed: () {
                final name = _nameCtrl.text.trim();
                final price = double.tryParse(_priceCtrl.text) ?? 25000.0;
                final vendor = _vendorCtrl.text.trim();
                final presetNotes = _presetNotesCtrl.text
                    .split(",")
                    .map((s) => s.trim())
                    .where((s) => s.isNotEmpty)
                    .toList();

                if (name.isEmpty) return;

                final newItem = MealMenuItem(
                  id: widget.existingItem?.id ?? "MENU-CUSTOM-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}",
                  name: name,
                  category: _category,
                  description: _descCtrl.text.isNotEmpty ? _descCtrl.text : "Menu favorit racikan $vendor",
                  imageUrl: widget.existingItem?.imageUrl ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80",
                  isAvailableToday: _isAvailable,
                  vendorName: vendor.isNotEmpty ? vendor : "Kantin OB Utama",
                  price: price,
                  rating: widget.existingItem?.rating ?? 4.9,
                  presetNotes: presetNotes.isNotEmpty ? presetNotes : ["Tanpa Cabai", "Sambal Dipisah"],
                );

                context.read<MealOrderViewModel>().saveMenuItem(newItem);
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(isEditing ? "Menu '$name' berhasil diperbarui!" : "Menu '$name' berhasil ditambahkan!"),
                    backgroundColor: AppColors.success,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
              child: Text(
                isEditing ? "Simpan Perubahan Menu" : "Tambah Menu Makanan",
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
