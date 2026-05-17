/// POS outlet representation.
class Outlet {
  Outlet({required this.id, required this.name, this.tenantId});

  final String id;
  final String name;
  final String? tenantId;

  factory Outlet.fromJson(Map<String, dynamic> json) {
    return Outlet(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Outlet',
      tenantId: json['tenant_id'] as String?,
    );
  }
}
