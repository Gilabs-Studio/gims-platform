enum RoomStatus { available, occupied, reserved }

class RoomItem {
  final String id;
  final String code;
  final String name;
  final int capacity;
  final RoomStatus status;
  final String location;
  final String floor;
  final List<String> facilities;
  final String imageUrl;

  const RoomItem({
    required this.id,
    required this.code,
    required this.name,
    required this.capacity,
    required this.status,
    required this.location,
    required this.floor,
    required this.facilities,
    required this.imageUrl,
  });
}

class RoomBookingRecord {
  final String id;
  final String bookingCode;
  final String roomId;
  final String roomName;
  final String title;
  final DateTime date;
  final String startTime;
  final String endTime;
  final String organizerName;
  final String organizerDept;
  final String status; // "CONFIRMED", "PENDING", "COMPLETED"

  const RoomBookingRecord({
    required this.id,
    required this.bookingCode,
    required this.roomId,
    required this.roomName,
    required this.title,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.organizerName,
    required this.organizerDept,
    required this.status,
  });
}
