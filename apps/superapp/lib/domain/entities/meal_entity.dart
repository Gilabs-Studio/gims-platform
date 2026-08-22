class MealMenuItem {
  final String id;
  final String name;
  final String category; // "Makanan Utama", "Minuman", "Extra / Snack"
  final String description;
  final String imageUrl;
  final bool isAvailableToday;
  final String vendorName;
  final double price;
  final double rating;
  final List<String> presetNotes;

  const MealMenuItem({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.imageUrl,
    required this.isAvailableToday,
    this.vendorName = "Kantin OB Internal",
    this.price = 25000.0,
    this.rating = 4.8,
    this.presetNotes = const ["Tanpa Cabai", "Es Sedikit", "Bungkus Pisah", "Kurangi Garam", "Ekstra Sambal"],
  });

  MealMenuItem copyWith({
    String? id,
    String? name,
    String? category,
    String? description,
    String? imageUrl,
    bool? isAvailableToday,
    String? vendorName,
    double? price,
    double? rating,
    List<String>? presetNotes,
  }) {
    return MealMenuItem(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      isAvailableToday: isAvailableToday ?? this.isAvailableToday,
      vendorName: vendorName ?? this.vendorName,
      price: price ?? this.price,
      rating: rating ?? this.rating,
      presetNotes: presetNotes ?? this.presetNotes,
    );
  }
}

class BulkMealOrderItem {
  final String menuItemId;
  final String menuItemName;
  final int quantity;
  final String notes;
  final double price;

  const BulkMealOrderItem({
    required this.menuItemId,
    required this.menuItemName,
    required this.quantity,
    required this.notes,
    required this.price,
  });

  double get totalPrice => price * quantity;
}

class MealOrder {
  final String id;
  final DateTime orderTime;
  final MealMenuItem menuItem;
  final int quantity;
  final String notes;
  final String status; // "Diproses OB", "Sedang Dibeli", "Siap Diantar", "Selesai"
  final String customerName;
  final String department;
  final bool isBulkOrder;
  final String? groupName;
  final List<BulkMealOrderItem> bulkItems;
  final bool isCheckedInShoppingList;

  const MealOrder({
    required this.id,
    required this.orderTime,
    required this.menuItem,
    required this.quantity,
    required this.notes,
    required this.status,
    this.customerName = "Staff Operasional",
    this.department = "Manufaktur",
    this.isBulkOrder = false,
    this.groupName,
    this.bulkItems = const [],
    this.isCheckedInShoppingList = false,
  });

  double get totalPrice {
    if (isBulkOrder && bulkItems.isNotEmpty) {
      return bulkItems.fold(0, (sum, item) => sum + item.totalPrice);
    }
    return menuItem.price * quantity;
  }

  MealOrder copyWith({
    String? id,
    DateTime? orderTime,
    MealMenuItem? menuItem,
    int? quantity,
    String? notes,
    String? status,
    String? customerName,
    String? department,
    bool? isBulkOrder,
    String? groupName,
    List<BulkMealOrderItem>? bulkItems,
    bool? isCheckedInShoppingList,
  }) {
    return MealOrder(
      id: id ?? this.id,
      orderTime: orderTime ?? this.orderTime,
      menuItem: menuItem ?? this.menuItem,
      quantity: quantity ?? this.quantity,
      notes: notes ?? this.notes,
      status: status ?? this.status,
      customerName: customerName ?? this.customerName,
      department: department ?? this.department,
      isBulkOrder: isBulkOrder ?? this.isBulkOrder,
      groupName: groupName ?? this.groupName,
      bulkItems: bulkItems ?? this.bulkItems,
      isCheckedInShoppingList: isCheckedInShoppingList ?? this.isCheckedInShoppingList,
    );
  }
}

