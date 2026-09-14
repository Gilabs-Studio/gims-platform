class SalaryComponent {
  final String title;
  final double amount;
  final bool isDeduction;

  const SalaryComponent({
    required this.title,
    required this.amount,
    this.isDeduction = false,
  });
}

class Payslip {
  final String id;
  final String monthPeriod; // e.g. "Agustus 2026"
  final DateTime paymentDate;
  final double basicSalary;
  final double netSalary;
  final List<SalaryComponent> earnings;
  final List<SalaryComponent> deductions;
  final String status; // "TERBAYAR"

  const Payslip({
    required this.id,
    required this.monthPeriod,
    required this.paymentDate,
    required this.basicSalary,
    required this.netSalary,
    required this.earnings,
    required this.deductions,
    this.status = "TERBAYAR",
  });
}

class OvertimeClaim {
  final String id;
  final DateTime date;
  final double hours;
  final String reason;
  final String status; // "PENDING", "APPROVED", "REJECTED"
  final double estimatedPay;

  const OvertimeClaim({
    required this.id,
    required this.date,
    required this.hours,
    required this.reason,
    required this.status,
    required this.estimatedPay,
  });
}

class ReimbursementClaim {
  final String id;
  final String title;
  final String category; // "Transportasi", "Medical", "Operational"
  final double amount;
  final DateTime date;
  final String status; // "PENDING", "APPROVED"

  const ReimbursementClaim({
    required this.id,
    required this.title,
    required this.category,
    required this.amount,
    required this.date,
    required this.status,
  });
}
