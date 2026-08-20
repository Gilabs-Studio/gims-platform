import '../../domain/entities/payroll_entity.dart';

class MockPayrollDatasource {
  Future<Payslip> getLatestPayslip() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return Payslip(
      id: "PAY-2026-08-001",
      monthPeriod: "Agustus 2026",
      paymentDate: DateTime(2026, 8, 25),
      basicSalary: 6500000,
      netSalary: 8450000,
      earnings: const [
        SalaryComponent(title: "Gaji Pokok", amount: 6500000),
        SalaryComponent(title: "Tunjangan Jabatan", amount: 1200000),
        SalaryComponent(title: "Tunjangan Transport & Makan", amount: 800000),
        SalaryComponent(title: "Lembur Operational (12 Jam)", amount: 450000),
      ],
      deductions: const [
        SalaryComponent(title: "BPJS Ketenagakerjaan (2%)", amount: 150000, isDeduction: true),
        SalaryComponent(title: "BPJS Kesehatan (1%)", amount: 75000, isDeduction: true),
        SalaryComponent(title: "PPh 21", amount: 275000, isDeduction: true),
      ],
    );
  }

  Future<List<Payslip>> getPayslipHistory() async {
    await Future.delayed(const Duration(milliseconds: 300));
    return [
      Payslip(
        id: "PAY-2026-08-001",
        monthPeriod: "Agustus 2026",
        paymentDate: DateTime(2026, 8, 25),
        basicSalary: 6500000,
        netSalary: 8450000,
        earnings: const [],
        deductions: const [],
      ),
      Payslip(
        id: "PAY-2026-07-002",
        monthPeriod: "Juli 2026",
        paymentDate: DateTime(2026, 7, 25),
        basicSalary: 6500000,
        netSalary: 8200000,
        earnings: const [],
        deductions: const [],
      ),
      Payslip(
        id: "PAY-2026-06-003",
        monthPeriod: "Juni 2026",
        paymentDate: DateTime(2026, 6, 25),
        basicSalary: 6500000,
        netSalary: 8900000,
        earnings: const [],
        deductions: const [],
      ),
    ];
  }

  Future<List<OvertimeClaim>> getOvertimeClaims() async {
    await Future.delayed(const Duration(milliseconds: 200));
    return [
      OvertimeClaim(
        id: "OT-001",
        date: DateTime.now().subtract(const Duration(days: 2)),
        hours: 3.5,
        reason: "Maintenance rutin server & persiapan audit ISO",
        status: "PENDING",
        estimatedPay: 140000,
      ),
      OvertimeClaim(
        id: "OT-002",
        date: DateTime.now().subtract(const Duration(days: 10)),
        hours: 4.0,
        reason: "Setup Mesin CNC Line 2 tambahan target",
        status: "APPROVED",
        estimatedPay: 180000,
      ),
    ];
  }

  Future<List<ReimbursementClaim>> getReimbursementClaims() async {
    await Future.delayed(const Duration(milliseconds: 200));
    return [
      ReimbursementClaim(
        id: "REIMB-001",
        title: "Bensin & Tol Kunjungan Vendor Bekasi",
        category: "Transportasi",
        amount: 245000,
        date: DateTime.now().subtract(const Duration(days: 4)),
        status: "PENDING",
      ),
      ReimbursementClaim(
        id: "REIMB-002",
        title: "Kacamata Safety & Alat Ukur Presisi",
        category: "Operational",
        amount: 450000,
        date: DateTime.now().subtract(const Duration(days: 15)),
        status: "APPROVED",
      ),
    ];
  }
}
