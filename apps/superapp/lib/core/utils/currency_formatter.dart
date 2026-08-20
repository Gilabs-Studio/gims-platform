import 'package:intl/intl.dart';

class CurrencyFormatter {
  static String formatRupiah(num amount, {bool showSymbol = true}) {
    final formatter = NumberFormat.currency(
      locale: 'id_ID',
      symbol: showSymbol ? 'Rp ' : '',
      decimalDigits: 0,
    );
    return formatter.format(amount);
  }
}
