import '../entities/payroll_entity.dart';

abstract class PayrollRepository {
  Future<Payslip> getLatestPayslip();
  Future<List<Payslip>> getPayslipHistory();
  Future<List<OvertimeClaim>> getOvertimeClaims();
  Future<List<ReimbursementClaim>> getReimbursementClaims();
  Future<void> submitOvertimeClaim(OvertimeClaim claim);
  Future<void> submitReimbursementClaim(ReimbursementClaim claim);
}
