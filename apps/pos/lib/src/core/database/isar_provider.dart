import 'package:flutter/foundation.dart';
import 'package:isar/isar.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'models/cached_catalog_item.dart';
import 'models/cached_floor_plan.dart';
import 'models/cached_order.dart';
import 'models/cached_outlet.dart';
import 'models/cached_pos_config.dart';
import '../sync/sync_job.dart';

export 'models/cached_catalog_item.dart';
export 'models/cached_floor_plan.dart';
export 'models/cached_order.dart';
export 'models/cached_outlet.dart';
export 'models/cached_pos_config.dart';

final isarProvider = Provider<Isar>((ref) {
  throw UnimplementedError('Isar must be initialised before ProviderScope');
});

Future<Isar> openIsar() async {
  if (kIsWeb) {
    throw UnsupportedError(
      'Isar 3.x does not support Flutter web in this project. '
      'Use a non-web target to enable offline storage.',
    );
  }

  final dir = await getApplicationDocumentsDirectory();
  return Isar.open(
    [
      CachedCatalogItemSchema,
      CachedOutletSchema,
      CachedFloorPlanSchema,
      CachedOrderSchema,
      CachedPosConfigSchema,
      SyncJobSchema,
    ],
    name: 'gims_pos',
    directory: dir.path,
  );
}
