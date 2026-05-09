import 'package:intl/intl.dart';

/// Format [amount] as currency with locale id_ID.
String formatMoney(double amount, String currency) {
  final formatter = NumberFormat.currency(
    locale: 'id_ID',
    symbol: currency == 'IDR' ? 'Rp ' : '$currency ',
    decimalDigits: 0,
  );
  return formatter.format(amount);
}

/// Human-readable duration like "2j 15m" or "5m".
String formatDuration(Duration duration) {
  if (duration.inHours > 0) {
    return '${duration.inHours}j ${duration.inMinutes.remainder(60)}m';
  }
  return '${duration.inMinutes}m';
}
