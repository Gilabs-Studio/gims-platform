import 'package:isar/isar.dart';

part 'cached_pos_config.g.dart';

@Collection()
class CachedPosConfig {
  Id id = Isar.autoIncrement;

  @Index(unique: true)
  late String outletId;

  late String currency;
  late double taxRate;
  late double serviceChargeRate;
  late bool printReceiptAuto;
  String? receiptFooter;
  String? receiptWhatsAppTemplate;
  late DateTime cachedAt;
}
