import '../../domain/entities/meal_entity.dart';

class MockMealDatasource {
  Future<List<MealMenuItem>> getDailyMenuItems() async {
    await Future.delayed(const Duration(milliseconds: 200));
    return const [
      MealMenuItem(
        id: "MENU-01",
        name: "Nasi Ayam Bakar Madu + Sambal Terasi",
        category: "Makanan Utama",
        description: "Ayam bakar kecap madu empuk dilengkapi tahu, tempe & lalapan.",
        imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Kantin OB Utama",
        price: 25000.0,
        presetNotes: ["Tanpa Cabai", "Sambal Dipisah", "Nasi Setengah", "Ekstra Lalapan"],
      ),
      MealMenuItem(
        id: "MENU-02",
        name: "Soto Betawi Daging Sapi Kuah Santan",
        category: "Makanan Utama",
        description: "Soto Betawi daging sapi empuk, emping & perasan jeruk limau.",
        imageUrl: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Kantin OB Utama",
        price: 28000.0,
        presetNotes: ["Tanpa Emping", "Kuah Dipisah", "Kurangi Garam", "Tanpa Jeroan"],
      ),
      MealMenuItem(
        id: "MENU-03",
        name: "Nasi Goreng Spesial Telur Ceplok & Kerupuk",
        category: "Makanan Utama",
        description: "Nasi goreng rempah tradisional dengan bakso, sosis & telur ceplok.",
        imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Kantin OB Warung Bu Nur",
        price: 22000.0,
        presetNotes: ["Pedas Sedang", "Telur Matang", "Tanpa Acar", "Ekstra Kerupuk"],
      ),
      MealMenuItem(
        id: "MENU-04",
        name: "Gado-Gado Surabaya Telur Rebus",
        category: "Makanan Utama",
        description: "Sayuran segar kukus disiram bumbu kacang gurih pekat & lontong.",
        imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Kantin OB Warung Bu Nur",
        price: 20000.0,
        presetNotes: ["Pedas Manis", "Bumbu Dipisah", "Pakai Lontong", "Tanpa Emping"],
      ),
      MealMenuItem(
        id: "MENU-05",
        name: "Es Teh Manis Jumbo / Teh Hangat",
        category: "Minuman",
        description: "Teh melati perasan segar dengan gula asli pilihan.",
        imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Minuman OB Corner",
        price: 6000.0,
        presetNotes: ["Es Sedikit", "Tawar / Tanpa Gula", "Teh Hangat", "Bungkus Plastik"],
      ),
      MealMenuItem(
        id: "MENU-06",
        name: "Jus Alpukat Kocok / Es Jeruk Peras",
        category: "Minuman",
        description: "Jus alpukat mentega creamy ditaburi susu cokelat pekat.",
        imageUrl: "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Minuman OB Corner",
        price: 12000.0,
        presetNotes: ["Less Sugar", "Tanpa Susu Cokelat", "Es Sedikit"],
      ),
      MealMenuItem(
        id: "MENU-07",
        name: "Buah Potong Segar (Semangka & Melon)",
        category: "Extra / Snack",
        description: "1 porsi buah potong segar dingin ramah pencernaan.",
        imageUrl: "https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Snack OB Corner",
        price: 10000.0,
        presetNotes: ["Semangka Saja", "Melon Saja", "Dingin Segar"],
      ),
    ];
  }

  Future<List<MealOrder>> getActiveOrders() async {
    await Future.delayed(const Duration(milliseconds: 200));
    final items = await getDailyMenuItems();
    return [
      MealOrder(
        id: "ORD-OB-9921",
        orderTime: DateTime.now().subtract(const Duration(minutes: 15)),
        menuItem: items[0], // Ayam Bakar
        quantity: 2,
        notes: "Tanpa Cabai, Sambal Dipisah",
        status: "Diproses OB",
        customerName: "Budi Pratama",
        department: "Manufaktur Line 2",
        isCheckedInShoppingList: false,
      ),
      MealOrder(
        id: "ORD-OB-9925",
        orderTime: DateTime.now().subtract(const Duration(minutes: 10)),
        menuItem: items[4], // Es Teh
        quantity: 3,
        notes: "Es Sedikit, 1 Tawar",
        status: "Sedang Dibeli",
        customerName: "Siti Rahma",
        department: "HRD & Legal",
        isCheckedInShoppingList: true,
      ),
      MealOrder(
        id: "ORD-OB-BULK-102",
        orderTime: DateTime.now().subtract(const Duration(minutes: 5)),
        menuItem: items[2],
        quantity: 12,
        notes: "Pesanan Ramai-Ramai Tim QA Line 1. Nasi Goreng 8x, Soto Betawi 4x.",
        status: "Diproses OB",
        customerName: "Hendrik Wijaya, M.T.",
        department: "Direksi Operasional",
        isBulkOrder: true,
        groupName: "Makan Siang Tim QA & Manufaktur",
        bulkItems: const [
          BulkMealOrderItem(
            menuItemId: "MENU-03",
            menuItemName: "Nasi Goreng Spesial Telur Ceplok",
            quantity: 8,
            notes: "4 Pedas, 4 Tidak Pedas",
            price: 22000.0,
          ),
          BulkMealOrderItem(
            menuItemId: "MENU-02",
            menuItemName: "Soto Betawi Daging Sapi",
            quantity: 4,
            notes: "Kuah pisah semua",
            price: 28000.0,
          ),
        ],
        isCheckedInShoppingList: false,
      ),
    ];
  }
}

