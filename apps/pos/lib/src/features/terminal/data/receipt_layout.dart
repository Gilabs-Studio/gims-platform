import '../domain/models/pos_order.dart';
import '../../../core/utils/formatters.dart';
import '../domain/models/pos_config.dart';

class ReceiptLayout {
  ReceiptLayout._();

  static List<String> buildLines({
    required PosOrder order,
    PosConfig? config,
    String? footer,
    String currency = 'IDR',
    required String outletName,
    required int widthChars,
    required bool isOffline,
    double? tenderAmount,
    double? changeAmount,
  }) {
    final usedCurrency = currency.isNotEmpty
        ? currency
        : (config?.currency ?? 'IDR');
    final lines = <String>[];

    void add(String line) => lines.add(line);
    void divider(String char) => add(char * widthChars);

    add(_center(outletName, widthChars));
    add(_center('=== RECEIPT ===', widthChars));
    divider('-');

    add(_row('No. Order', '#${order.orderNumber}', widthChars));
    if (isOffline) {
      add(_center('** MODE OFFLINE - ANTRIAN SYNC **', widthChars));
    }
    add(_row('Tanggal', _formatDate(order.createdAt), widthChars));
    add(_row('Jam', _formatTime(order.createdAt), widthChars));
    if (order.tableLabel != null && order.tableLabel!.isNotEmpty) {
      add(_row('Meja', order.tableLabel!, widthChars));
    }
    if (order.customerName != null && order.customerName!.isNotEmpty) {
      add(_row('Pelanggan', order.customerName!, widthChars));
    }

    divider('-');
    add(_row('Qty Item', 'Subtotal', widthChars));
    divider('-');

    for (final item in order.items) {
      final qtyStr = '${item.quantity.toStringAsFixed(0)}x';
      final subtotalStr = formatMoney(item.subtotal, usedCurrency);
      final qtyPrefix = '$qtyStr ';
      final available = widthChars - subtotalStr.length - 1;
      final nameWidth = (available - qtyPrefix.length).clamp(0, widthChars);
      final wrappedName = _wrapText(item.productName, nameWidth);

      final firstName = wrappedName.isEmpty ? '' : wrappedName.first;
      add(_row('$qtyPrefix$firstName', subtotalStr, widthChars));

      for (final line in wrappedName.skip(1)) {
        add(' ' * qtyPrefix.length + line);
      }

      add('     @ ${formatMoney(item.unitPrice, usedCurrency)}');
      if (item.notes != null && item.notes!.isNotEmpty) {
        for (final noteLine in _wrapText(item.notes!, widthChars - 6)) {
          add('     * $noteLine');
        }
      }
    }

    divider('-');
    add(
      _row('Subtotal', formatMoney(order.subtotal, usedCurrency), widthChars),
    );
    if (order.discountAmount > 0) {
      add(
        _row(
          'Diskon',
          '- ${formatMoney(order.discountAmount, usedCurrency)}',
          widthChars,
        ),
      );
    }
    if (order.serviceCharge > 0) {
      add(
        _row(
          'Service',
          formatMoney(order.serviceCharge, usedCurrency),
          widthChars,
        ),
      );
    }

    add('=' * widthChars);
    add(
      _row('TOTAL', formatMoney(order.totalAmount, usedCurrency), widthChars),
    );
    divider('-');

    final paymentMethod =
        (order.status == PosOrderStatus.completed ||
            order.status == PosOrderStatus.paid ||
            order.status == PosOrderStatus.served)
        ? 'CASH'
        : 'CASH (OFFLINE)';
    add(_row('Pembayaran', paymentMethod, widthChars));

    if (tenderAmount != null && tenderAmount > 0) {
      add(
        _row('Diterima', formatMoney(tenderAmount, usedCurrency), widthChars),
      );
      final change = changeAmount ?? (tenderAmount - order.totalAmount);
      add(
        _row(
          'Kembalian',
          formatMoney(change < 0 ? 0 : change, usedCurrency),
          widthChars,
        ),
      );
    }

    divider('-');

    final usedFooter = (footer != null && footer.isNotEmpty)
        ? footer
        : (config?.receiptFooter ?? 'Terima kasih atas kunjungan Anda!');
    for (final line in usedFooter.split('\n')) {
      final trimmed = line.trim();
      if (trimmed.isNotEmpty) {
        add(_center(trimmed, widthChars));
      }
    }

    if (isOffline) {
      add('');
      add(_center('* KONEKSI INTERNET OFFLINE *', widthChars));
      add(_center('Beberapa informasi loyalty/feedback', widthChars));
      add(_center('dinonaktifkan.', widthChars));
    }

    return lines;
  }

  static String _center(String text, int widthChars) {
    if (text.length >= widthChars) return text.substring(0, widthChars);
    final pad = ((widthChars - text.length) / 2).floor();
    return ' ' * pad + text;
  }

  static String _row(String left, String right, int widthChars) {
    if (left.length + right.length >= widthChars) {
      final available = widthChars - right.length - 1;
      if (available > 0) {
        return left.substring(0, available) + ' ' + right;
      }
      return left + '\n' + ' ' * (widthChars - right.length) + right;
    }
    final spaces = widthChars - left.length - right.length;
    return left + ' ' * spaces + right;
  }

  static List<String> _wrapText(String text, int width) {
    final normalized = text.trim();
    if (normalized.isEmpty) return const [''];
    if (width <= 0) return [normalized];

    final lines = <String>[];
    final words = normalized.split(RegExp(r'\s+'));
    var current = '';

    void flush() {
      if (current.isNotEmpty) {
        lines.add(current);
        current = '';
      }
    }

    for (final word in words) {
      if (word.length > width) {
        flush();
        var remaining = word;
        while (remaining.length > width) {
          lines.add(remaining.substring(0, width));
          remaining = remaining.substring(width);
        }
        current = remaining;
        continue;
      }

      final candidate = current.isEmpty ? word : '$current $word';
      if (candidate.length <= width) {
        current = candidate;
      } else {
        flush();
        current = word;
      }
    }

    flush();
    return lines;
  }

  static String _formatDate(DateTime dt) {
    final local = dt.toLocal();
    return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}';
  }

  static String _formatTime(DateTime dt) {
    final local = dt.toLocal();
    return '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
  }
}
