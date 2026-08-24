import '../../domain/entities/payroll_entity.dart';
import '../../domain/repositories/payroll_repository.dart';
import '../datasources/mock_payroll_datasource.dart';

class PayrollRepositoryImpl implements PayrollRepository {
  final MockPayrollDatasource _datasource;

  PayrollRepositoryImpl({MockPayrollDatasource? datasource})
      : _datasource = datasource ?? MockPayrollDatasource();

  final List<OvertimeClaim> _localOvertimes = [];
  final List<ReimbursementClaim> _localReimbursements = [];

  @override
  Future<Payslip> getLatestPayslip() => _datasource.getLatestPayslip();

  @override
  Future<List<Payslip>> getPayslipHistory() => _datasource.getPayslipHistory();

  @override
  Future<List<OvertimeClaim>> getOvertimeClaims() async {
    final claims = await _datasource.getOvertimeClaims();
    return [..._localOvertimes, ...claims];
  }

  @override
  Future<List<ReimbursementClaim>> getReimbursementClaims() async {
    final claims = await _datasource.getReimbursementClaims();
    return [..._localReimbursements, ...claims];
  }

  @override
  Future<void> submitOvertimeClaim(OvertimeClaim claim) async {
    await Future.delayed(const Duration(milliseconds: 300));
    _localOvertimes.insert(0, claim);
  }

  @override
  Future<void> submitReimbursementClaim(ReimbursementClaim claim) async {
    await Future.delayed(const Duration(milliseconds: 300));
    _localReimbursements.insert(0, claim);
  }
}
