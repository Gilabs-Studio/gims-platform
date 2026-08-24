enum AssetStatus { available, borrowed, maintenance }

class AssetItem {
  final String id;
  final String code;
  final String name;
  final String category; // "Elektronik", "IT Hardware", "Audio Visual", "Kendaraan Operasional"
  final String serialNumber;
  final String location;
  final AssetStatus status;
  final String condition; // "Sangat Baik", "Baik", "Perlu Servis"
  final String imageUrl;

  const AssetItem({
    required this.id,
    required this.code,
    required this.name,
    required this.category,
    required this.serialNumber,
    required this.location,
    required this.status,
    required this.condition,
    required this.imageUrl,
  });
}

class BorrowingRecord {
  final String id;
  final String requestNumber;
  final String assetId;
  final String assetName;
  final String borrowerName;
  final String borrowerDept;
  final DateTime borrowDate;
  final DateTime expectedReturnDate;
  final String purpose;
  final String status; // "PENDING", "APPROVED", "BORROWED", "RETURNED"

  const BorrowingRecord({
    required this.id,
    required this.requestNumber,
    required this.assetId,
    required this.assetName,
    required this.borrowerName,
    required this.borrowerDept,
    required this.borrowDate,
    required this.expectedReturnDate,
    required this.purpose,
    required this.status,
  });
}
