import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/widgets/custom_card.dart';
import '../../../core/widgets/status_badge.dart';
import '../viewmodels/payroll_viewmodel.dart';
import '../../../domain/entities/payroll_entity.dart';

class PayrollPage extends StatefulWidget {
  final bool isOversightMode;

  const PayrollPage({super.key, this.isOversightMode = false});

  @override
  State<PayrollPage> createState() => _PayrollPageState();
}

class _PayrollPageState extends State<PayrollPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PayrollViewModel>().loadPayrollData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<PayrollViewModel>(
      builder: (context, vm, child) {
        if (vm.isLoading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final latest = vm.latestPayslip;

        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(
            backgroundColor: AppColors.surface,
            elevation: 0,
            title: Text(
              widget.isOversightMode ? "Payroll & Kompensasi (Oversight)" : "Slip & Riwayat Gaji",
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            bottom: TabBar(
              controller: _tabController,
              labelColor: AppColors.primary,
              unselectedLabelColor: AppColors.textSecondary,
              indicatorColor: AppColors.primary,
              tabs: const [
                Tab(text: "Slip Gaji"),
                Tab(text: "Lembur"),
                Tab(text: "Reimbursement"),
              ],
            ),
          ),
          body: TabBarView(
            controller: _tabController,
            children: [
              // TAB 1: Slip Gaji & Breakdown
              RefreshIndicator(
                onRefresh: () => vm.loadPayrollData(),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (widget.isOversightMode)
                        Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.infoBg,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.info.withValues(alpha: 0.3)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.info_outline_rounded, color: AppColors.info, size: 18),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  "Mode Oversight Admin: Menampilkan slip gaji pegawai terverifikasi.",
                                  style: TextStyle(color: AppColors.info, fontSize: 12),
                                ),
                              ),
                            ],
                          ),
                        ),

                      // Take Home Pay Card
                      CustomCard(
                        gradient: AppColors.primaryGradient,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  latest?.monthPeriod ?? "Bulan Ini",
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const StatusBadge(
                                  label: "TERBAYAR",
                                  type: BadgeType.success,
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              "Gaji Bersih (Take Home Pay)",
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              CurrencyFormatter.formatRupiah(latest?.netSalary ?? 0),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Divider(color: Colors.white24, height: 1),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  "Tgl Transfer: ${latest != null ? DateFormatter.formatShortDate(latest.paymentDate) : '-'}",
                                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                                const Row(
                                  children: [
                                    Text(
                                      "Detail Slip",
                                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                    ),
                                    SizedBox(width: 4),
                                    Icon(Icons.chevron_right_rounded, color: Colors.white, size: 14),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Rincian Komponen Gaji
                      const Text(
                        "Rincian Komponen Gaji",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),

                      CustomCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "Penerimaan / Pendapatan",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.success,
                              ),
                            ),
                            const SizedBox(height: 8),
                            ...?latest?.earnings.map((e) => _buildComponentRow(e.title, e.amount, isDeduction: false)),
                            const Divider(height: 24),
                            const Text(
                              "Potongan",
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.danger,
                              ),
                            ),
                            const SizedBox(height: 8),
                            ...?latest?.deductions.map((e) => _buildComponentRow(e.title, e.amount, isDeduction: true)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Riwayat Slip Gaji
                      const Text(
                        "Riwayat Slip Gaji (3 Bulan Terakhir)",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),

                      ...vm.payslipHistory.map((item) => Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        child: CustomCard(
                          onTap: () {
                            _showPayslipDetailModal(context, item);
                          },
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppColors.infoBg,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.description_rounded, color: AppColors.info, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.monthPeriod,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    Text(
                                      "Transfer: ${DateFormatter.formatShortDate(item.paymentDate)}",
                                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                CurrencyFormatter.formatRupiah(item.netSalary),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                              ),
                            ],
                          ),
                        ),
                      )),
                    ],
                  ),
                ),
              ),

              // TAB 2: Lembur (Overtime Claims)
              SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Riwayat Pengajuan Lembur",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        ElevatedButton.icon(
                          onPressed: () => _showOvertimeModal(context),
                          icon: const Icon(Icons.add_rounded, size: 16),
                          label: const Text("Ajukan Lembur"),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    if (vm.overtimeClaims.isEmpty)
                      const Center(child: Text("Belum ada riwayat pengajuan lembur"))
                    else
                      ...vm.overtimeClaims.map((ot) => Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: CustomCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    DateFormatter.formatShortDate(ot.date),
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                  ),
                                  StatusBadge(
                                    label: ot.status,
                                    type: ot.status == "APPROVED" ? BadgeType.success : BadgeType.warning,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text("Durasi: ${ot.hours} Jam", style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                              Text("Alasan: ${ot.reason}", style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                              const SizedBox(height: 8),
                              Text(
                                "Estimasi Insentif: ${CurrencyFormatter.formatRupiah(ot.estimatedPay)}",
                                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 13),
                              ),
                            ],
                          ),
                        ),
                      )),
                  ],
                ),
              ),

              // TAB 3: Reimbursement Claims
              SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Riwayat Klaim Reimbursement",
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        ElevatedButton.icon(
                          onPressed: () => _showReimbursementModal(context),
                          icon: const Icon(Icons.add_rounded, size: 16),
                          label: const Text("Klaim Biaya"),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    if (vm.reimbursementClaims.isEmpty)
                      const Center(child: Text("Belum ada klaim reimbursement"))
                    else
                      ...vm.reimbursementClaims.map((r) => Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: CustomCard(
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppColors.warningBg,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.receipt_long_rounded, color: AppColors.warning, size: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(r.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                    Text("${r.category} • ${DateFormatter.formatShortDate(r.date)}", style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(CurrencyFormatter.formatRupiah(r.amount), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  const SizedBox(height: 4),
                                  StatusBadge(
                                    label: r.status,
                                    type: r.status == "APPROVED" ? BadgeType.success : BadgeType.warning,
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
            ],
          ),
        );
      },
    );
  }

  Widget _buildComponentRow(String title, double amount, {required bool isDeduction}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          Text(
            "${isDeduction ? '-' : '+'} ${CurrencyFormatter.formatRupiah(amount)}",
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: isDeduction ? AppColors.danger : AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }

  void _showPayslipDetailModal(BuildContext context, Payslip payslip) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                "Detail Slip Gaji — ${payslip.monthPeriod}",
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Take Home Pay"),
                  Text(
                    CurrencyFormatter.formatRupiah(payslip.netSalary),
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  backgroundColor: AppColors.primary,
                ),
                child: const Text("Tutup", style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showOvertimeModal(BuildContext context) {
    final hoursCtrl = TextEditingController(text: "2");
    final reasonCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Form Pengajuan Lembur Staff", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(
                controller: hoursCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: "Jumlah Jam Lembur", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: reasonCtrl,
                decoration: const InputDecoration(labelText: "Alasan Lembur", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  final hrs = double.tryParse(hoursCtrl.text) ?? 1.0;
                  context.read<PayrollViewModel>().submitOvertime(hrs, reasonCtrl.text);
                  Navigator.pop(ctx);
                },
                style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(48), backgroundColor: AppColors.primary),
                child: const Text("Kirim Pengajuan", style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showReimbursementModal(BuildContext context) {
    final titleCtrl = TextEditingController();
    final amountCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 24,
            right: 24,
            top: 24,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Form Pengajuan Reimbursement", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(labelText: "Judul Pengeluaran", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: "Nominal (Rp)", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: () {
                  final amt = double.tryParse(amountCtrl.text) ?? 0.0;
                  context.read<PayrollViewModel>().submitReimbursement(titleCtrl.text, "Operational", amt);
                  Navigator.pop(ctx);
                },
                style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(48), backgroundColor: AppColors.primary),
                child: const Text("Kirim Klaim", style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      },
    );
  }
}
