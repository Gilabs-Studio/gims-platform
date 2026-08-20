import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../viewmodels/manufacturing_viewmodel.dart';
import '../../../domain/entities/manufacturing_entity.dart';

class ManufacturingDashboardPage extends StatefulWidget {
  const ManufacturingDashboardPage({super.key});

  @override
  State<ManufacturingDashboardPage> createState() => _ManufacturingDashboardPageState();
}

class _ManufacturingDashboardPageState extends State<ManufacturingDashboardPage> {
  String _selectedFilter = "Semua";

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ManufacturingViewModel>().loadManufacturingData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<ManufacturingViewModel>(
      builder: (context, vm, child) {
        if (vm.isLoading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final filteredMachines = vm.machines.where((mch) {
          if (_selectedFilter == "Running") return mch.status == MachineStatus.running;
          if (_selectedFilter == "Idle") return mch.status == MachineStatus.idle;
          if (_selectedFilter == "Downtime") return mch.status == MachineStatus.downtime;
          if (_selectedFilter == "Servis") return mch.status == MachineStatus.maintenance;
          return true;
        }).toList();

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.secondary,
            elevation: 0,
            title: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.precision_manufacturing_rounded, color: AppColors.primaryLight, size: 20),
                ),
                const SizedBox(width: 10),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Monitoring Owner Real-Time",
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    Text(
                      "Denah & Telemetri Sensor Pabrik ERP",
                      style: TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.refresh_rounded, color: Colors.white),
                onPressed: () => vm.loadManufacturingData(),
              ),
            ],
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Real-time Critical Alert Notification Banner
                if (vm.alerts.isNotEmpty) ...[
                  ...vm.alerts.map((alt) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: CustomCard(
                      backgroundColor: AppColors.dangerBg,
                      border: Border.all(color: AppColors.danger.withValues(alpha: 0.4)),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: const BoxDecoration(
                              color: AppColors.danger,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      alt.machineName,
                                      style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.danger, fontSize: 13),
                                    ),
                                    const StatusBadge(label: "BREAKDOWN ALERT", type: BadgeType.danger),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  alt.message,
                                  style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  )),
                  const SizedBox(height: 12),
                ],

                // Executive OEE & Telemetry Barometer Hero Card
                CustomCard(
                  gradient: AppColors.darkCardGradient,
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(color: AppColors.success, shape: BoxShape.circle),
                              ),
                              const SizedBox(width: 6),
                              const Text("LIVE TELEMETRI PABRIK", style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                          const StatusBadge(label: "OWNER MONITORING", type: BadgeType.info),
                        ],
                      ),
                      const SizedBox(height: 16),

                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text("OEE Overall Score", style: TextStyle(color: Colors.white70, fontSize: 12)),
                              const SizedBox(height: 4),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.baseline,
                                textBaseline: TextBaseline.alphabetic,
                                children: [
                                  Text(
                                    "${vm.averageOee.toStringAsFixed(1)}%",
                                    style: const TextStyle(color: AppColors.success, fontSize: 32, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(width: 6),
                                  const Text("vs target 85%", style: TextStyle(color: Colors.white54, fontSize: 11)),
                                ],
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              const Text("Status Operational", style: TextStyle(color: Colors.white70, fontSize: 12)),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  _buildBadgeCounter("${vm.runningCount} Run", AppColors.success),
                                  const SizedBox(width: 4),
                                  _buildBadgeCounter("${vm.downtimeCount} Down", AppColors.danger),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      const Divider(color: Colors.white24, height: 1),
                      const SizedBox(height: 14),

                      // OEE Component Breakdown Pills
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildOeeSubmetric("Availability", "94.2%", AppColors.info),
                          _buildOeeSubmetric("Performance", "89.5%", AppColors.primary),
                          _buildOeeSubmetric("Quality Score", "98.7%", AppColors.success),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Visual Floor Plan Layout Grid Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Denah Visual & Mesin Pabrik", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                        Text("Simulasi sensor IoT real-time per node mesin", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                      ],
                    ),
                    Text(
                      "Total: ${vm.totalMachines} Node",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Status Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ["Semua", "Running", "Idle", "Downtime", "Servis"].map((filter) {
                      final isSelected = _selectedFilter == filter;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(filter),
                          selected: isSelected,
                          onSelected: (_) => setState(() => _selectedFilter = filter),
                          selectedColor: AppColors.primary,
                          checkmarkColor: Colors.white,
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : AppColors.textPrimary,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            fontSize: 12,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),

                // Interactive Machine Nodes Floor Grid
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filteredMachines.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.15,
                  ),
                  itemBuilder: (context, index) {
                    final mch = filteredMachines[index];
                    final color = _getMachineStatusColor(mch.status);

                    return CustomCard(
                      onTap: () => _showMachineDetailModal(context, mch),
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  mch.lineName,
                                  style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                              Row(
                                children: [
                                  Container(
                                    width: 8,
                                    height: 8,
                                    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    _getMachineStatusLabel(mch.status),
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
                                  ),
                                ],
                              ),
                            ],
                          ),

                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                mch.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "OEE Score: ${mch.oeeScore}%",
                                style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                              ),
                            ],
                          ),

                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Row(
                                children: [
                                  const Icon(Icons.device_thermostat_rounded, size: 14, color: AppColors.textMuted),
                                  Text(
                                    "${mch.temperature}°C",
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: mch.temperature > 85 ? AppColors.danger : AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                              Row(
                                children: [
                                  const Icon(Icons.vibration_rounded, size: 14, color: AppColors.textMuted),
                                  Text(
                                    "${mch.vibrationLevel}",
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: 24),

                // Line Output Target Progress Section
                const Text(
                  "Output Produksi & Defect Rate per Line",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 12),

                ...vm.lines.map((line) {
                  final pct = line.completionPercentage.clamp(0.0, 100.0);
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: CustomCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(line.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              StatusBadge(
                                label: "Defect: ${line.defectRate}%",
                                type: line.defectRate > 2.0 ? BadgeType.danger : BadgeType.success,
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                "Output: ${line.currentOutput} / ${line.targetOutput} Unit",
                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                              ),
                              Text(
                                "${pct.toStringAsFixed(1)}%",
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primary),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: LinearProgressIndicator(
                              value: pct / 100,
                              minHeight: 8,
                              backgroundColor: AppColors.cardBorder,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                line.defectRate > 2.0 ? AppColors.warning : AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildBadgeCounter(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold)),
    );
  }

  Widget _buildOeeSubmetric(String title, String value, Color color) {
    return Column(
      children: [
        Text(title, style: const TextStyle(color: Colors.white54, fontSize: 11)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(color: color, fontSize: 15, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Color _getMachineStatusColor(MachineStatus status) {
    switch (status) {
      case MachineStatus.running:
        return AppColors.success;
      case MachineStatus.idle:
        return AppColors.warning;
      case MachineStatus.downtime:
        return AppColors.danger;
      case MachineStatus.maintenance:
        return AppColors.info;
    }
  }

  String _getMachineStatusLabel(MachineStatus status) {
    switch (status) {
      case MachineStatus.running:
        return "RUNNING";
      case MachineStatus.idle:
        return "IDLE";
      case MachineStatus.downtime:
        return "DOWN";
      case MachineStatus.maintenance:
        return "SERVIS";
    }
  }

  void _showMachineDetailModal(BuildContext context, MachineItem mch) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(mch.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      Text(mch.lineName, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    ],
                  ),
                  StatusBadge(
                    label: _getMachineStatusLabel(mch.status),
                    type: mch.status == MachineStatus.running
                        ? BadgeType.success
                        : (mch.status == MachineStatus.downtime ? BadgeType.danger : BadgeType.warning),
                  ),
                ],
              ),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildModalMetric("Skor OEE", "${mch.oeeScore}%", AppColors.success),
                  _buildModalMetric("Suhu Mesin", "${mch.temperature}°C", mch.temperature > 85 ? AppColors.danger : AppColors.textPrimary),
                  _buildModalMetric("Getaran", "${mch.vibrationLevel} mm/s", AppColors.textPrimary),
                ],
              ),
              const SizedBox(height: 20),
              Text("Terakhir Servis Maintenance: ${mch.lastMaintenance}", style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text("Tim teknisi dikirim ke ${mch.name} (${mch.lineName})"),
                            backgroundColor: AppColors.warning,
                          ),
                        );
                      },
                      icon: const Icon(Icons.engineering_rounded, size: 18),
                      label: const Text("Panggil Teknisi"),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: const BorderSide(color: AppColors.primary),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text("Tutup Telemetri", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildModalMetric(String label, String value, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
        const SizedBox(height: 4),
        Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
      ],
    );
  }
}
