import '../../domain/entities/meal_entity.dart';

class MockMealDatasource {
  Future<List<MealMenuItem>> getDailyMenuItems() async {
    await Future.delayed(const Duration(milliseconds: 200));
    return const [
      MealMenuItem(
        id: "MENU-01",
        name: "Nasi Ayam Bakar Madu + Sambal Terasi",
        category: "Makanan Utama",
        description: "Ayam bakar kecap madu empuk dilengkapi tahu, tempe, lalapan segar & sambal terasi pedas manis.",
        imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Dapur OB Kantin A",
      ),
      MealMenuItem(
        id: "MENU-02",
        name: "Soto Betawi Daging Sapi Kuah Santan",
        category: "Makanan Utama",
        description: "Soto khas Betawi berisi irisan daging sapi empuk, emping, minyak samin, dan jeruk limau.",
        imageUrl: "https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Dapur OB Kantin A",
      ),
      MealMenuItem(
        id: "MENU-03",
        name: "Nasi Goreng Spesial Telur Ceplok & Kerupuk",
        category: "Makanan Utama",
        description: "Nasi goreng rempah tradisional dengan potongan bakso, sosis, telur ceplok dan acar segar.",
        imageUrl: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Dapur OB Kantin B",
      ),
      MealMenuItem(
        id: "MENU-04",
        name: "Gado-Gado Surabaya Telur Rebus",
        category: "Makanan Utama",
        description: "Sayuran segar kukus disiram bumbu kacang gurih pekat, lontong, dan kerupuk udang.",
        imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Dapur OB Kantin B",
      ),
      MealMenuItem(
        id: "MENU-05",
        name: "Es Teh Manis Jumbo / Teh Hangat",
        category: "Minuman",
        description: "Teh melati perasan segar dengan gula asli (bisa request tingkat kemanisan).",
        imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Minuman OB Bar",
      ),
      MealMenuItem(
        id: "MENU-06",
        name: "Jus Alpukat Kocok / Es Jeruk Peras",
        category: "Minuman",
        description: "Jus alpukat mentega creamy ditaburi susu cokelat pekat.",
        imageUrl: "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Minuman OB Bar",
      ),
      MealMenuItem(
        id: "MENU-07",
        name: "Buah Potong Segar (Semangka & Melon)",
        category: "Extra / Snack",
        description: "1 porsi buah potong segar dingin ramah pencernaan pasca makan siang.",
        imageUrl: "https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=500&q=80",
        isAvailableToday: true,
        vendorName: "Snack OB",
      ),
    ];
  }

  Future<List<MealOrder>> getActiveOrders() async {
    await Future.delayed(const Duration(milliseconds: 200));
    final items = await getDailyMenuItems();
    return [
      MealOrder(
        id: "ORD-OB-9921",
        orderTime: DateTime.now().subtract(const Duration(minutes: 25)),
        menuItem: items[0], // Ayam Bakar
        quantity: 1,
        notes: "Sambal dipisah, minta es teh manis 1",
        status: "Diproses OB",
      ),
      MealOrder(
        id: "ORD-OB-8812",
        orderTime: DateTime.now().subtract(const Duration(days: 1, hours: 2)),
        menuItem: items[1], // Soto Betawi
        quantity: 1,
        notes: "Tanpa emping",
        status: "Selesai",
      ),
    ];
  }
}
