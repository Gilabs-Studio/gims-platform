import 'package:flutter/material.dart';
import '../../../domain/entities/payroll_entity.dart';
import '../../../domain/repositories/payroll_repository.dart';

class PayrollViewModel extends ChangeNotifier {
  final PayrollRepository _repository;

  PayrollViewModel(this._repository);

  Payslip? _latestPayslip;
  List<Payslip> _payslipHistory = [];
  List<OvertimeClaim> _overtimeClaims = [];
  List<ReimbursementClaim> _reimbursementClaims = [];
  bool _isLoading = false;

  Payslip? get latestPayslip => _latestPayslip;
  List<Payslip> get payslipHistory => _payslipHistory;
  List<OvertimeClaim> get overtimeClaims => _overtimeClaims;
  List<ReimbursementClaim> get reimbursementClaims => _reimbursementClaims;
  bool get isLoading => _isLoading;

  Future<void> loadPayrollData() async {
    _isLoading = true;
    notifyListeners();

    try {
      _latestPayslip = await _repository.getLatestPayslip();
      _payslipHistory = await _repository.getPayslipHistory();
      _overtimeClaims = await _repository.getOvertimeClaims();
      _reimbursementClaims = await _repository.getReimbursementClaims();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> submitOvertime(double hours, String reason) async {
    final claim = OvertimeClaim(
      id: "OT-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}",
      date: DateTime.now(),
      hours: hours,
      reason: reason,
      status: "PENDING",
      estimatedPay: hours * 40000,
    );
    await _repository.submitOvertimeClaim(claim);
    await loadPayrollData();
  }

  Future<void> submitReimbursement(String title, String category, double amount) async {
    final claim = ReimbursementClaim(
      id: "REIMB-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}",
      title: title,
      category: category,
      amount: amount,
      date: DateTime.now(),
      status: "PENDING",
    );
    await _repository.submitReimbursementClaim(claim);
    await loadPayrollData();
  }
}
