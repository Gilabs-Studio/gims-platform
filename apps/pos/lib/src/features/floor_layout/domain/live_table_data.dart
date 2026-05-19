import '../../terminal/domain/models/pos_order.dart';
import 'models/floor_plan.dart';

/// Live status of a table on the floor canvas — typed with PosOrder.
class LiveTableData {
  LiveTableData({
    required this.table,
    required this.seatCount,
    required this.status,
    required this.duration,
    this.orders = const [],
    this.unpaidOrder,
    this.unpaidOrders = const [],
    this.serviceOrder,
    this.serviceOrders = const [],
    this.servedOrders = const [],
    this.needsPaymentCount = 0,
    this.needsServeCount = 0,
    this.doneCount = 0,
    this.isOverThreshold = false,
    this.order,
  });

  final LayoutObject table;
  final int seatCount;
  final String status;
  final Duration duration;
  final List<PosOrder> orders;
  final PosOrder? unpaidOrder;
  final List<PosOrder> unpaidOrders;
  final PosOrder? serviceOrder;
  final List<PosOrder> serviceOrders;
  final List<PosOrder> servedOrders;
  final int needsPaymentCount;
  final int needsServeCount;
  final int doneCount;
  final bool isOverThreshold;
  final PosOrder? order;
}
