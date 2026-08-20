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

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.secondary,
            elevation: 0,
            title: const Row(
              children: [
                Icon(Icons.precision_manufacturing_rounded, color: AppColors.accent, size: 20),
                SizedBox(width: 8),
                Text(
                  "Monitoring Efisiensi Mesin (ERP)",
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 18,
                  ),
                ),
              ],
            ),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Real-time Critical Machine Breakdown Alert Banner
                if (vm.alerts.isNotEmpty) ...[
                  ...vm.alerts.map((alt) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.dangerBg,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: const BoxDecoration(
                            color: AppColors.danger,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 18),
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
                                  const StatusBadge(label: "CRITICAL", type: BadgeType.danger),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                alt.message,
                                style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  )),
                  const SizedBox(height: 16),
                ],

                // Overview Metric Cards Grid
                Row(
                  children: [
                    Expanded(
                      child: CustomCard(
                        gradient: AppColors.darkCardGradient,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text("Rata-rata OEE Pabrik", style: TextStyle(color: Colors.white70, fontSize: 12)),
                            const SizedBox(height: 6),
                            Text(
                              "${vm.averageOee.toStringAsFixed(1)}%",
                              style: const TextStyle(color: AppColors.success, fontSize: 26, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            const Text("Target Standar: >85%", style: TextStyle(color: Colors.white54, fontSize: 10)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: CustomCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text("Status Mesin", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                _buildStatusDot(AppColors.success, "Run: ${vm.runningCount}"),
                                const SizedBox(width: 8),
                                _buildStatusDot(AppColors.warning, "Idle: ${vm.idleCount}"),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                _buildStatusDot(AppColors.danger, "Down: ${vm.downtimeCount}"),
                                const SizedBox(width: 8),
                                _buildStatusDot(AppColors.info, "Maint: ${vm.maintenanceCount}"),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Line Output Progress
                const Text(
                  "Output Produksi & Defect Rate per Line",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
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
                              Expanded(
                                child: Text(
                                  line.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
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
                                "Aktual: ${line.currentOutput} / Target: ${line.targetOutput} Unit",
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
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: pct / 100,
                              minHeight: 8,
                              backgroundColor: Colors.grey[200],
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
                const SizedBox(height: 24),

                // Individual Machine Status List
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Detail Status Seluruh Mesin",
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      "Total: ${vm.totalMachines} Mesin",
                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                ...vm.machines.map((mch) => Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: CustomCard(
                    onTap: () => _showMachineDetailModal(context, mch),
                    child: Row(
                      children: [
                        Container(
                          width: 10,
                          height: 48,
                          decoration: BoxDecoration(
                            color: _getMachineStatusColor(mch.status),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                mch.name,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              Text(
                                "${mch.lineName} • OEE: ${mch.oeeScore}%",
                                style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            StatusBadge(
                              label: _getMachineStatusLabel(mch.status),
                              type: _getBadgeTypeByStatus(mch.status),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              "Suhu: ${mch.temperature}°C",
                              style: TextStyle(
                                fontSize: 11,
                                color: mch.temperature > 85 ? AppColors.danger : AppColors.textMuted,
                                fontWeight: mch.temperature > 85 ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                )),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatusDot(Color color, String label) {
    return Row(
      children: [
        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
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
        return "DOWNTIME";
      case MachineStatus.maintenance:
        return "SERVIS";
    }
  }

  BadgeType _getBadgeTypeByStatus(MachineStatus status) {
    switch (status) {
      case MachineStatus.running:
        return BadgeType.success;
      case MachineStatus.idle:
        return BadgeType.warning;
      case MachineStatus.downtime:
        return BadgeType.danger;
      case MachineStatus.maintenance:
        return BadgeType.info;
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
                  Expanded(
                    child: Text(
                      mch.name,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  StatusBadge(
                    label: _getMachineStatusLabel(mch.status),
                    type: _getBadgeTypeByStatus(mch.status),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(mch.lineName, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      const Text("Skor OEE", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      Text("${mch.oeeScore}%", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  Column(
                    children: [
                      const Text("Suhu Mesin", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      Text("${mch.temperature}°C", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: mch.temperature > 85 ? AppColors.danger : AppColors.textPrimary)),
                    ],
                  ),
                  Column(
                    children: [
                      const Text("Getaran", style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                      Text("${mch.vibrationLevel} mm/s", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text("Terakhir Servis Maintenance: ${mch.lastMaintenance}", style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(48), backgroundColor: AppColors.primary),
                child: const Text("Tutup Detail", style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      },
    );
  }
}
