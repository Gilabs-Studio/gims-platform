/// Selected table from live table view.
class TableSelection {
  const TableSelection({
    required this.id,
    required this.label,
    required this.seatCount,
  });

  final String id;
  final String label;
  final int seatCount;
}
