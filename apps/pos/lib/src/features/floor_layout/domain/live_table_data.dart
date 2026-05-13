import '../../terminal/domain/models/pos_order.dart';
import 'models/floor_plan.dart';

/// Live status of a table on the floor canvas — typed with PosOrder.
class LiveTableData {
  LiveTableData({
    required this.table,
    required this.seatCount,
    required this.status,
    required this.duration,
    this.order,
  });

  final LayoutObject table;
  final int seatCount;
  final String status;
  final Duration duration;
  final PosOrder? order;
}
