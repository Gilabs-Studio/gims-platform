class PosCustomer {
  PosCustomer({
    required this.id,
    required this.code,
    required this.name,
    this.contactPerson,
    this.email,
  });

  final String id;
  final String code;
  final String name;
  final String? contactPerson;
  final String? email;

  factory PosCustomer.fromJson(Map<String, dynamic> json) {
    return PosCustomer(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      contactPerson: json['contact_person'] as String?,
      email: json['email'] as String?,
    );
  }
}

class XenditConnectionStatus {
  XenditConnectionStatus({
    required this.isConnected,
    required this.status,
  });

  final bool isConnected;
  final String status;

  factory XenditConnectionStatus.fromJson(Map<String, dynamic> json) {
    return XenditConnectionStatus(
      isConnected: json['is_connected'] == true,
      status: json['status'] as String? ?? 'not_connected',
    );
  }
}
