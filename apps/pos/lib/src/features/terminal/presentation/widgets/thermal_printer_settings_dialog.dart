import 'package:flutter/material.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import '../../data/thermal_printer_service.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/error_utils.dart';

class ThermalPrinterSettingsDialog extends StatefulWidget {
  const ThermalPrinterSettingsDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) => const ThermalPrinterSettingsDialog(),
    );
  }

  @override
  State<ThermalPrinterSettingsDialog> createState() => _ThermalPrinterSettingsDialogState();
}

class _ThermalPrinterSettingsDialogState extends State<ThermalPrinterSettingsDialog> {
  final _printerService = ThermalPrinterService.instance;
  
  String _selectedType = 'system';
  String _selectedSize = '58mm';
  String? _selectedAddress;
  String? _selectedName;

  List<BluetoothInfo> _devices = [];
  bool _scanning = false;
  bool _testing = false;
  String? _statusMessage;

  @override
  void initState() {
    super.initState();
    _loadCurrentSettings();
  }

  Future<void> _loadCurrentSettings() async {
    await _printerService.init();
    setState(() {
      _selectedType = _printerService.connectionType;
      _selectedSize = _printerService.paperSize;
      _selectedAddress = _printerService.deviceAddress;
      _selectedName = _printerService.deviceName;
    });

    if (_selectedType == 'bluetooth') {
      _scanDevices();
    }
  }

  Future<void> _scanDevices() async {
    setState(() {
      _scanning = true;
      _statusMessage = 'Mencari perangkat bluetooth terpasang...';
    });

    try {
      final isGranted = await PrintBluetoothThermal.isPermissionBluetoothGranted;
      if (!isGranted) {
        setState(() {
          _statusMessage = 'Izin bluetooth belum diberikan. Harap aktifkan di pengaturan perangkat.';
          _scanning = false;
        });
        return;
      }

      final devices = await _printerService.getBluetoothDevices();
      setState(() {
        _devices = devices;
        _scanning = false;
        _statusMessage = devices.isEmpty 
            ? 'Tidak ada perangkat bluetooth yang terpasang (paired).' 
            : 'Menampilkan ${devices.length} perangkat terpasang.';
      });
    } catch (e) {
      setState(() {
        _statusMessage = 'Gagal memindai: $e';
        _scanning = false;
      });
    }
  }

  Future<void> _save() async {
    await _printerService.saveSettings(
      type: _selectedType,
      address: _selectedAddress,
      name: _selectedName,
      size: _selectedSize,
    );

    if (mounted) {
      showNotification(context, 'Konfigurasi printer berhasil disimpan');
      Navigator.pop(context);
    }
  }

  Future<void> _testPrint() async {
    setState(() {
      _testing = true;
      _statusMessage = 'Mengirim halaman tes ke printer...';
    });

    // Save temporary state so test print uses current selections
    final oldType = _printerService.connectionType;
    final oldAddress = _printerService.deviceAddress;
    final oldName = _printerService.deviceName;
    final oldSize = _printerService.paperSize;

    await _printerService.saveSettings(
      type: _selectedType,
      address: _selectedAddress,
      name: _selectedName,
      size: _selectedSize,
    );

    final success = await _printerService.printTestPage(context);

    // Revert settings to let save button be explicit
    await _printerService.saveSettings(
      type: oldType,
      address: oldAddress,
      name: oldName,
      size: oldSize,
    );

    setState(() {
      _testing = false;
      _statusMessage = success 
          ? 'Halaman tes berhasil dikirim!' 
          : 'Halaman tes gagal dikirim. Periksa koneksi printer.';
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(GimsRadius.medium),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Container(
        width: 500,
        constraints: const BoxConstraints(maxHeight: 650),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Title Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 16, 16),
              child: Row(
                children: [
                  const Icon(Icons.print_outlined, color: GimsColors.primary),
                  const SizedBox(width: 10),
                  Text(
                    'Pengaturan Printer Thermal',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Scrollable Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Connection Type Selection
                    Text(
                      'Metode Koneksi',
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: GimsColors.mutedForeground,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: GimsColors.border),
                        borderRadius: BorderRadius.circular(GimsRadius.medium),
                      ),
                      child: Column(
                        children: [
                          RadioListTile<String>(
                            title: const Text('System Print (Rekomendasi)'),
                            subtitle: const Text('Gunakan sistem cetak OS bawaan (USB/Wifi/Bluetooth)'),
                            value: 'system',
                            groupValue: _selectedType,
                            onChanged: (val) {
                              setState(() {
                                _selectedType = val!;
                              });
                            },
                          ),
                          const Divider(height: 1),
                          RadioListTile<String>(
                            title: const Text('Bluetooth Thermal (Langsung)'),
                            subtitle: const Text('Koneksi langsung ke printer bluetooth terpasang'),
                            value: 'bluetooth',
                            groupValue: _selectedType,
                            onChanged: (val) {
                              setState(() {
                                _selectedType = val!;
                              });
                              _scanDevices();
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Paper Size Selection
                    Text(
                      'Ukuran Kertas',
                      style: theme.textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: GimsColors.mutedForeground,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SegmentedButton<String>(
                      segments: const [
                        ButtonSegment(value: '58mm', label: Text('58 mm (Kasir Standard)')),
                        ButtonSegment(value: '80mm', label: Text('80 mm (Lebar)')),
                      ],
                      selected: {_selectedSize},
                      onSelectionChanged: (val) {
                        setState(() {
                          _selectedSize = val.first;
                        });
                      },
                    ),
                    const SizedBox(height: 20),

                    // Bluetooth Devices Section (Only if bluetooth is selected)
                    if (_selectedType == 'bluetooth') ...[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Pilih Printer Bluetooth',
                            style: theme.textTheme.labelMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                              color: GimsColors.mutedForeground,
                            ),
                          ),
                          IconButton(
                            onPressed: _scanning ? null : _scanDevices,
                            icon: _scanning 
                                ? const SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Icon(Icons.refresh, size: 18),
                            tooltip: 'Refresh Perangkat',
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        constraints: const BoxConstraints(maxHeight: 180),
                        decoration: BoxDecoration(
                          border: Border.all(color: GimsColors.border),
                          borderRadius: BorderRadius.circular(GimsRadius.medium),
                        ),
                        child: _devices.isEmpty
                            ? Padding(
                                padding: const EdgeInsets.all(20),
                                child: Center(
                                  child: Text(
                                    _scanning ? 'Mencari...' : 'Tidak ada perangkat terpasang.',
                                    style: const TextStyle(color: GimsColors.mutedForeground),
                                  ),
                                ),
                              )
                            : ListView.separated(
                                shrinkWrap: true,
                                itemCount: _devices.length,
                                separatorBuilder: (_, __) => const Divider(height: 1),
                                itemBuilder: (context, index) {
                                  final dev = _devices[index];
                                  final isSelected = _selectedAddress == dev.macAdress;

                                  return ListTile(
                                    dense: true,
                                    leading: Icon(
                                      Icons.bluetooth,
                                      color: isSelected ? GimsColors.primary : GimsColors.mutedForeground,
                                    ),
                                    title: Text(
                                      dev.name,
                                      style: TextStyle(
                                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                      ),
                                    ),
                                    subtitle: Text(dev.macAdress, style: const TextStyle(fontSize: 11)),
                                    trailing: isSelected 
                                        ? const Icon(Icons.check_circle, color: GimsColors.primary) 
                                        : null,
                                    onTap: () {
                                      setState(() {
                                        _selectedAddress = dev.macAdress;
                                        _selectedName = dev.name;
                                      });
                                    },
                                  );
                                },
                              ),
                      ),
                    ],

                    // Info / Status Box
                    if (_statusMessage != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(GimsRadius.small),
                        ),
                        child: Text(
                          _statusMessage!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: GimsColors.mutedForeground,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            
            const Divider(height: 1),

            // Action Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: _testing ? null : _testPrint,
                    icon: _testing 
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.print_outlined),
                    label: const Text('Tes Cetak'),
                  ),
                  const Spacer(),
                  OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Batal'),
                  ),
                  const SizedBox(width: 12),
                  FilledButton(
                    onPressed: _save,
                    child: const Text('Simpan'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
