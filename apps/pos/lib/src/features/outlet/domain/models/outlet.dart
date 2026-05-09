/// POS outlet representation.
class Outlet {
  Outlet({required this.id, required this.name});

  final String id;
  final String name;

  factory Outlet.fromJson(Map<String, dynamic> json) {
    return Outlet(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Outlet',
    );
  }
}
