import 'dart:async';
import 'dart:io';

String _normalizePrinterKey(String value) {
  final withoutPrefix = value.toLowerCase().startsWith('printer ')
      ? value.substring(8)
      : value;
  return withoutPrefix
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '');
}

Future<String?> _resolveLinuxCupsPrinter(String? requestedPrinterName) async {
  try {
    final result = await Process.run('lpstat', ['-p', '-d']).timeout(const Duration(seconds: 3));
    final output = '${result.stdout}\n${result.stderr}';
    final printers = <String>[];

    for (final line in output.split('\n')) {
      final match = RegExp(r'^printer\s+(.+?)\s+is\s+', caseSensitive: false).firstMatch(line.trim());
      if (match != null) {
        final printer = match.group(1)?.trim();
        if (printer != null && printer.isNotEmpty) {
          printers.add(printer);
        }
      }
    }

    final requested = requestedPrinterName?.trim();
    if (requested != null && requested.isNotEmpty) {
      final requestedNormalized = _normalizePrinterKey(requested);

      for (final printer in printers) {
        if (printer == requested || printer.toLowerCase() == requested.toLowerCase()) {
          return printer;
        }
      }

      for (final printer in printers) {
        if (_normalizePrinterKey(printer) == requestedNormalized) {
          return printer;
        }
      }

      final sanitizedRequested = requested.toLowerCase().startsWith('printer ')
          ? requested.substring(8).trim()
          : requested;
      if (sanitizedRequested.isNotEmpty) {
        final sanitizedNormalized = _normalizePrinterKey(sanitizedRequested);
        for (final printer in printers) {
          if (_normalizePrinterKey(printer) == sanitizedNormalized) {
            return printer;
          }
        }
      }

      return sanitizedRequested.isNotEmpty ? sanitizedRequested : requested;
    }

    final defaultMatch = RegExp(r'default destination: (.+)').firstMatch(output);
    if (defaultMatch != null) {
      final defaultPrinter = defaultMatch.group(1)?.trim();
      if (defaultPrinter != null && defaultPrinter.isNotEmpty) {
        return defaultPrinter;
      }
    }

    if (printers.isNotEmpty) {
      return printers.first;
    }
  } catch (_) {
    return null;
  }

  return null;
}

Future<bool> sendRawToLinuxUsbPrinter(
  List<int> bytes, {
  String? printerName,
  Duration timeout = const Duration(seconds: 10),
}) async {
  final name = await _resolveLinuxCupsPrinter(printerName);

  try {
    final args = <String>[
      '-o',
      'raw',
    ];
    if (name != null && name.isNotEmpty) {
      args.insertAll(0, ['-d', name]);
    }

    final process = await Process.start(
      'lp',
      args,
      mode: ProcessStartMode.normal,
    );

    process.stdin.add(bytes);
    await process.stdin.close();

    final exitCode = await process.exitCode.timeout(timeout);
    if (exitCode == 0) {
      return true;
    }

    return false;
  } on TimeoutException {
    return false;
  } catch (_) {
    return false;
  }
}
