import 'package:isar/isar.dart';

part 'cached_floor_plan.g.dart';

@Collection()
class CachedFloorPlan {
  Id id = Isar.autoIncrement;

  @Index(unique: true)
  late String planId;

  @Index()
  late String outletId;

  late String name;
  late String status;
  late String layoutJson;
  late DateTime cachedAt;
}
