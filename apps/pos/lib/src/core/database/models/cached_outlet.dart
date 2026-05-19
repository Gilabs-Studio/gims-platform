import 'package:isar/isar.dart';

part 'cached_outlet.g.dart';

@Collection()
class CachedOutlet {
  Id id = Isar.autoIncrement;

  @Index(unique: true)
  late String outletId;

  late String name;
  late String code;
  String? address;
  late DateTime cachedAt;
}
