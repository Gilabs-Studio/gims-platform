/// Request body for enrolling a member (matches web API contract).
class EnrollMemberRequest {
  EnrollMemberRequest({
    required this.name,
    required this.outletId,
    this.phone,
    this.email,
    this.programId,
    this.customerId,
  });

  final String name;
  final String outletId;
  final String? phone;
  final String? email;
  final String? programId;
  final String? customerId;

  Map<String, dynamic> toJson() {
    final data = <String, dynamic>{
      'name': name,
      'outlet_id': outletId,
    };
    if (phone != null && phone!.isNotEmpty) data['phone'] = phone;
    if (email != null && email!.isNotEmpty) data['email'] = email;
    if (programId != null && programId!.isNotEmpty) data['program_id'] = programId;
    if (customerId != null && customerId!.isNotEmpty) data['customer_id'] = customerId;
    return data;
  }
}
