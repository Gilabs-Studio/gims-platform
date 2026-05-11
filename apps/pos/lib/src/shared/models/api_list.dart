/// Generic API list wrapper with pagination total.
class ApiList<T> {
  ApiList({required this.items, this.total = 0});

  final List<T> items;
  final int total;
}
