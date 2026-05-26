import 'dart:convert';

import 'package:isar/isar.dart';
import 'package:uuid/uuid.dart';

import '../../../core/database/isar_provider.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/sync/sync_engine.dart';
import '../../../core/sync/sync_job.dart';
import '../domain/models/cart_line.dart';
import '../domain/models/catalog_item.dart';
import '../domain/models/pos_customer.dart';
import '../domain/models/pos_config.dart';
import '../domain/models/pos_order.dart';

class PosOfflineReadiness {
  const PosOfflineReadiness({
    required this.outletId,
    required this.hasOutlet,
    required this.hasConfig,
    required this.hasCatalog,
    required this.lastSyncedAt,
  });

  final String outletId;
  final bool hasOutlet;
  final bool hasConfig;
  final bool hasCatalog;
  final DateTime? lastSyncedAt;

  bool get isReady => hasOutlet && hasConfig && hasCatalog;
}

/// Terminal service — catalog, config, orders, payments.
class TerminalService {
  TerminalService(this._api, this._syncEngine, this._isar);

  final ApiClient _api;
  final SyncEngine _syncEngine;
  final Isar _isar;
  static const _uuid = Uuid();
  static final Map<String, List<CatalogItem>> _catalogByOutlet = {};
  static final Map<String, PosConfig> _configByOutlet = {};
  static final Map<String, List<PosOrder>> _ordersByOutlet = {};
  static final Map<String, PosOrder> _orderById = {};
  static List<PosCustomer> _customerCache = [];

  bool _isOfflineError(Object error) {
    return error is ApiException && error.isOffline;
  }

  String _normalizeClientId(String raw) {
    var value = raw;
    while (value.startsWith('local-')) {
      value = value.substring(6);
    }
    return value;
  }

  /// Creates a local order ID that encodes the clientId so it can be
  /// extracted later for SyncEngine job payloads.
  String _newLocalOrderId(String clientId) =>
      'local-${_normalizeClientId(clientId)}';

  /// Extracts the original clientId from a local order ID, or returns null
  /// if the order ID belongs to a server-confirmed order.
  String? _extractClientId(String orderId) {
    if (orderId.startsWith('local-')) {
      return _normalizeClientId(orderId.substring(6));
    }
    return null;
  }

  Future<void> _normalizeMalformedLocalCache(String outletId) async {
    final cached = await _isar.cachedOrders
        .filter()
        .outletIdEqualTo(outletId)
        .findAll();

    final malformed = cached
        .where((entry) => entry.clientId.startsWith('local-'))
        .toList();
    if (malformed.isEmpty) return;

    await _isar.writeTxn(() async {
      for (final entry in malformed) {
        final normalizedClientId = _normalizeClientId(entry.clientId);
        if (normalizedClientId == entry.clientId) continue;

        final canonical = await _isar.cachedOrders
            .filter()
            .clientIdEqualTo(normalizedClientId)
            .findFirst();
        if (canonical != null && canonical.id != entry.id) {
          await _isar.cachedOrders.delete(entry.id);
          continue;
        }

        entry.clientId = normalizedClientId;
        await _isar.cachedOrders.put(entry);
      }
    });
  }

  Future<void> _saveCachedOrder(PosOrder order, String syncStatus) async {
    final clientId = _extractClientId(order.id) ?? order.id;
    await _isar.writeTxn(() async {
      final existing = await _isar.cachedOrders
          .filter()
          .clientIdEqualTo(clientId)
          .or()
          .orderIdEqualTo(order.id)
          .findFirst();
      final entry = existing ?? CachedOrder();

      var statusToSave = order.status.value;
      var itemsJsonToSave = jsonEncode(order.items.map((item) => {
        'id': item.id,
        'product_id': item.productId,
        'product_name': item.productName,
        'product_code': item.productCode,
        'quantity': item.quantity,
        'unit_price': item.unitPrice,
        'subtotal': item.subtotal,
        'status': item.status,
        if (item.notes != null) 'notes': item.notes,
      }).toList());
      var syncStatusToSave = syncStatus;
      var totalAmountToSave = order.totalAmount;
      var tableIdToSave = order.tableId;
      var tableLabelToSave = order.tableLabel;
      var customerNameToSave = order.customerName;

      if (existing != null) {
        final localStatus = PosOrderStatus.fromValue(existing.status);
        final newStatus = order.status;
        final hasLocalProgress = _orderStatusRank(localStatus) > _orderStatusRank(newStatus);

        if (hasLocalProgress) {
          statusToSave = existing.status;
          itemsJsonToSave = existing.itemsJson;
          totalAmountToSave = existing.totalAmount;
          tableIdToSave = existing.tableId;
          tableLabelToSave = existing.tableLabel;
          customerNameToSave = existing.customerName;

          if (syncStatus == CachedOrderSyncStatus.synced) {
            syncStatusToSave = existing.syncStatus;
          }
        }
      }

      entry
        ..clientId = clientId
        ..orderId = order.id.startsWith('local-') ? null : order.id
        ..outletId = order.outletId
        ..status = statusToSave
        ..itemsJson = itemsJsonToSave
        ..totalAmount = totalAmountToSave
        ..syncStatus = syncStatusToSave
        ..cachedAt = order.createdAt
        ..tableId = tableIdToSave
        ..tableLabel = tableLabelToSave
        ..customerName = customerNameToSave;
      await _isar.cachedOrders.put(entry);
    });
  }

  PosOrder _cachedToOrder(CachedOrder cached) {
    List<PosOrderItem> items = const [];
    try {
      final raw = jsonDecode(cached.itemsJson) as List<dynamic>;
      items = raw
          .whereType<Map<String, dynamic>>()
          .map(PosOrderItem.fromJson)
          .toList();
    } catch (_) {}

    return PosOrder(
      id: cached.orderId ?? _newLocalOrderId(cached.clientId),
      orderNumber: cached.orderId != null
          ? (cached.orderId!.length >= 8
                ? cached.orderId!.substring(0, 8).toUpperCase()
                : cached.orderId!.toUpperCase())
          : 'LOCAL-${cached.clientId.length >= 8 ? cached.clientId.substring(0, 8).toUpperCase() : cached.clientId.toUpperCase()}',
      outletId: cached.outletId,
      status: PosOrderStatus.fromValue(cached.status),
      guestCount: 1,
      subtotal: cached.totalAmount,
      taxAmount: 0,
      serviceCharge: 0,
      discountAmount: 0,
      totalAmount: cached.totalAmount,
      items: items,
      createdAt: cached.cachedAt,
      tableId: cached.tableId,
      tableLabel: cached.tableLabel,
      customerName: cached.customerName,
    );
  }

  /// Enqueues a [SyncJob] to SyncEngine for background processing.
  ///
  /// For [createOrder] jobs [clientId] becomes the job's own clientId so that
  /// [SyncEngine._resolveDownstreamJobs] can propagate the server orderId.
  /// For downstream jobs (addItem, confirmOrder, processCash, voidOrder) the
  /// [clientId] in [payload] must equal the parent order's clientId.
  Future<void> _enqueueJob({
    required String jobClientId,
    required String action,
    required Map<String, dynamic> payload,
  }) async {
    final job = SyncJob()
      ..clientId = jobClientId
      ..feature = 'terminal'
      ..action = action
      ..payload = jsonEncode(payload)
      ..status = SyncJobStatus.pending
      ..createdAt = DateTime.now();
    await _syncEngine.enqueue(job);
  }

  void _upsertOrderCache(PosOrder order) {
    _orderById[order.id] = order;
    final outletOrders = List<PosOrder>.from(
      _ordersByOutlet[order.outletId] ?? const <PosOrder>[],
    );
    final idx = outletOrders.indexWhere((item) => item.id == order.id);
    if (idx >= 0) {
      outletOrders[idx] = order;
    } else {
      outletOrders.insert(0, order);
    }
    _ordersByOutlet[order.outletId] = outletOrders;
  }

  void _reconcileLocalOrderId(String localOrderId, PosOrder serverOrder) {
    _orderById.remove(localOrderId);
    for (final entry in _ordersByOutlet.entries) {
      final idx = entry.value.indexWhere((order) => order.id == localOrderId);
      if (idx >= 0) {
        final next = List<PosOrder>.from(entry.value);
        next[idx] = serverOrder;
        _ordersByOutlet[entry.key] = next;
        break;
      }
    }
    _upsertOrderCache(serverOrder);
  }

  /// Applies a server-side [PosOrder] (e.g. from a WebSocket event) to the
  /// in-memory cache, correctly evicting any stale `local-xxx` ghost entries
  /// that were previously created offline and have now been resolved by sync.
  ///
  /// Must be awaited so the Isar lookup can resolve the local ↔ server ID
  /// mapping. Returns the canonical order to display in the UI.
  Future<PosOrder> applyServerOrder(PosOrder serverOrder) async {
    // 1. Find any `local-xxx` cached entry that resolved to this server ID.
    final localEntry = await _isar.cachedOrders
        .filter()
        .orderIdEqualTo(serverOrder.id)
        .findFirst();

    if (localEntry != null) {
      final localId = _newLocalOrderId(localEntry.clientId);

      // Evict from in-memory maps.
      _orderById.remove(localId);
      for (final key in _ordersByOutlet.keys.toList()) {
        _ordersByOutlet[key] =
            _ordersByOutlet[key]!.where((o) => o.id != localId).toList();
      }
    }

    // 2. Upsert the canonical server order.
    _upsertOrderCache(serverOrder);
    return serverOrder;
  }

  /// Returns the `local-xxx` order ID that maps to [serverOrderId] if one
  /// still exists in the in-memory cache, or `null` if already reconciled.
  /// Used by the UI to purge ghost entries from its own order list.
  String? localIdForServerId(String serverOrderId) {
    for (final orders in _ordersByOutlet.values) {
      for (final o in orders) {
        // A local-xxx order that has been upserted with the server ID during
        // _reconcileLocalOrderId was already replaced in-memory. But if the
        // WS event arrived before reconciliation, the local-xxx version may
        // still be present alongside the server version.
        if (o.id.startsWith('local-')) {
          // We can't check the DB synchronously, but we can match by tableId.
          // This is used only to clean up a UI list — a false-negative is safe.
          if (o.tableId != null && o.tableId == serverOrderId) return o.id;
        }
      }
    }
    return null;
  }

  Future<PosOrder?> _findCachedOrder(String orderId) async {
    final byId = _orderById[orderId];
    if (byId != null) return byId;
    for (final orders in _ordersByOutlet.values) {
      final idx = orders.indexWhere((o) => o.id == orderId);
      if (idx >= 0) return orders[idx];
    }
    final clientId = _extractClientId(orderId) ?? orderId;
    final cached = await _isar.cachedOrders
        .filter()
        .clientIdEqualTo(clientId)
        .or()
        .orderIdEqualTo(orderId)
        .findFirst();
    if (cached != null) {
      final mapped = _cachedToOrder(cached);
      _upsertOrderCache(mapped);
      return mapped;
    }
    return null;
  }

  bool _isLocallyActiveStatus(PosOrderStatus status) {
    return {
      PosOrderStatus.draft,
      PosOrderStatus.inProgress,
      PosOrderStatus.ready,
      PosOrderStatus.waitingPayment,
      PosOrderStatus.paid,
      PosOrderStatus.partialServed,
      PosOrderStatus.served,
    }.contains(status);
  }

  int _orderStatusRank(PosOrderStatus status) {
    switch (status) {
      case PosOrderStatus.draft:
        return 1;
      case PosOrderStatus.inProgress:
        return 2;
      case PosOrderStatus.ready:
      case PosOrderStatus.waitingPayment:
        return 3;
      case PosOrderStatus.paid:
        return 4;
      case PosOrderStatus.partialServed:
        return 5;
      case PosOrderStatus.served:
        return 6;
      case PosOrderStatus.completed:
        return 7;
      case PosOrderStatus.voided:
        return 0;
    }
  }

  PosOrder _preferFurthestProgress(PosOrder server, PosOrder local) {
    if (_orderStatusRank(local.status) <= _orderStatusRank(server.status)) {
      return server;
    }

    return PosOrder(
      id: server.id,
      orderNumber: server.orderNumber,
      outletId: server.outletId,
      status: local.status,
      guestCount: local.guestCount,
      subtotal: local.subtotal,
      taxAmount: local.taxAmount,
      serviceCharge: local.serviceCharge,
      discountAmount: local.discountAmount,
      totalAmount: local.totalAmount,
      items: local.items,
      createdAt: server.createdAt,
      tableId: server.tableId ?? local.tableId,
      tableLabel: server.tableLabel ?? local.tableLabel,
      customerId: local.customerId ?? server.customerId,
      customerName: local.customerName ?? server.customerName,
      loyaltyMemberId: local.loyaltyMemberId ?? server.loyaltyMemberId,
      loyaltyRewardId: local.loyaltyRewardId ?? server.loyaltyRewardId,
      orderSource: server.orderSource ?? local.orderSource,
      notes: local.notes ?? server.notes,
    );
  }

  Future<String?> _resolvedServerOrderIdForLocal(String orderId) async {
    final clientId = _extractClientId(orderId);
    if (clientId == null) return null;
    final cached = await _isar.cachedOrders
        .filter()
        .clientIdEqualTo(clientId)
        .findFirst();
    return cached?.orderId;
  }

  void _removeOrderFromMemory(Set<String> orderIds) {
    final ids = orderIds.where((value) => value.isNotEmpty).toSet();
    if (ids.isEmpty) return;

    for (final id in ids) {
      _orderById.remove(id);
    }

    for (final entry in _ordersByOutlet.entries) {
      _ordersByOutlet[entry.key] = entry.value
          .where((order) => !ids.contains(order.id))
          .toList();
    }
  }

  Future<List<SyncJob>> _findRelatedSyncJobs({
    required String clientId,
    required Set<String> orderIds,
  }) async {
    final relatedOrderIds = orderIds.where((value) => value.isNotEmpty).toSet();
    final jobs = await _isar.syncJobs
        .filter()
        .group((q) => q
            .statusEqualTo(SyncJobStatus.pending)
            .or()
            .statusEqualTo(SyncJobStatus.processing)
            .or()
            .statusEqualTo(SyncJobStatus.failed)
            .or()
            .statusEqualTo(SyncJobStatus.failedConflict))
        .findAll();

    final matches = <SyncJob>[];
    for (final job in jobs) {
      if (job.feature != 'terminal') continue;

      if (job.clientId == clientId) {
        matches.add(job);
        continue;
      }

      final resolvedOrderId = job.resolvedOrderId;
      if (resolvedOrderId != null && relatedOrderIds.contains(resolvedOrderId)) {
        matches.add(job);
        continue;
      }

      try {
        final payload = jsonDecode(job.payload) as Map<String, dynamic>;
        final payloadClientId = payload['clientId'] as String?;
        final payloadOrderId = payload['orderId'] as String?;
        if (payloadClientId == clientId ||
            (payloadOrderId != null && relatedOrderIds.contains(payloadOrderId))) {
          matches.add(job);
        }
      } catch (_) {
        // Ignore malformed payloads during cleanup so deletion remains best-effort.
      }
    }

    return matches;
  }

  Future<bool> _isUnresolvedLocalOrder(String orderId) async {
    final clientId = _extractClientId(orderId);
    final lookupId = clientId ?? orderId;

    // Check 1: Check CachedOrder table syncStatus
    final cached = await _isar.cachedOrders
        .filter()
        .clientIdEqualTo(lookupId)
        .or()
        .orderIdEqualTo(orderId)
        .findFirst();
    if (cached != null && cached.syncStatus != CachedOrderSyncStatus.synced) {
      return true;
    }

    // Check 2: Check SyncJob table for pending/processing/failed jobs for this order
    final resolvedServerId = cached?.orderId ?? (orderId.startsWith('local-') ? null : orderId);
    
    final activeJobsCount = await _isar.syncJobs.filter()
        .group((q) => q
            .statusEqualTo(SyncJobStatus.pending)
            .or()
            .statusEqualTo(SyncJobStatus.processing)
            .or()
            .statusEqualTo(SyncJobStatus.failed)
            .or()
            .statusEqualTo(SyncJobStatus.failedConflict)
        )
        .and()
        .group((q) {
          var res = q.clientIdEqualTo(lookupId);
          if (resolvedServerId != null && resolvedServerId.isNotEmpty) {
            res = res.or().resolvedOrderIdEqualTo(resolvedServerId);
          }
          return res;
        })
        .count();

    if (activeJobsCount > 0) {
      return true;
    }

    return false;
  }

  ApiException _pendingSyncOrderException() {
    return ApiException(
      'Order masih dalam sinkronisasi. Coba lagi beberapa saat.',
      statusCode: null,
    );
  }

  PosOrder _markOrderServedLocally(PosOrder source) {
    final servedItems = source.items
        .map(
          (item) => PosOrderItem(
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            productCode: item.productCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            status: 'SERVED',
            notes: item.notes,
          ),
        )
        .toList(growable: false);

    return PosOrder(
      id: source.id,
      orderNumber: source.orderNumber,
      outletId: source.outletId,
      status: PosOrderStatus.served,
      guestCount: source.guestCount,
      subtotal: source.subtotal,
      taxAmount: source.taxAmount,
      serviceCharge: source.serviceCharge,
      discountAmount: source.discountAmount,
      totalAmount: source.totalAmount,
      items: servedItems,
      createdAt: source.createdAt,
      tableId: source.tableId,
      tableLabel: source.tableLabel,
      customerId: source.customerId,
      customerName: source.customerName,
      loyaltyMemberId: source.loyaltyMemberId,
      loyaltyRewardId: source.loyaltyRewardId,
      orderSource: source.orderSource,
      notes: source.notes,
    );
  }

  PosOrder _markOrderCompletedLocally(PosOrder source) {
    return PosOrder(
      id: source.id,
      orderNumber: source.orderNumber,
      outletId: source.outletId,
      status: PosOrderStatus.completed,
      guestCount: source.guestCount,
      subtotal: source.subtotal,
      taxAmount: source.taxAmount,
      serviceCharge: source.serviceCharge,
      discountAmount: source.discountAmount,
      totalAmount: source.totalAmount,
      items: source.items,
      createdAt: source.createdAt,
      tableId: source.tableId,
      tableLabel: source.tableLabel,
      customerId: source.customerId,
      customerName: source.customerName,
      loyaltyMemberId: source.loyaltyMemberId,
      loyaltyRewardId: source.loyaltyRewardId,
      orderSource: source.orderSource,
      notes: source.notes,
    );
  }

  PosOrder _markOrderItemServedLocally(PosOrder source, String itemId) {
    var foundItem = false;
    final nextItems = source.items
        .map((item) {
          if (item.id != itemId) return item;
          foundItem = true;
          return PosOrderItem(
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            productCode: item.productCode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            status: 'SERVED',
            notes: item.notes,
          );
        })
        .toList(growable: false);

    if (!foundItem) {
      return source;
    }

    final allServed = nextItems.every(
      (item) => item.status == 'SERVED' || item.status == 'CANCELLED',
    );

    final nextStatus = allServed
        ? PosOrderStatus.served
        : PosOrderStatus.partialServed;

    return PosOrder(
      id: source.id,
      orderNumber: source.orderNumber,
      outletId: source.outletId,
      status: nextStatus,
      guestCount: source.guestCount,
      subtotal: source.subtotal,
      taxAmount: source.taxAmount,
      serviceCharge: source.serviceCharge,
      discountAmount: source.discountAmount,
      totalAmount: source.totalAmount,
      items: nextItems,
      createdAt: source.createdAt,
      tableId: source.tableId,
      tableLabel: source.tableLabel,
      customerId: source.customerId,
      customerName: source.customerName,
      loyaltyMemberId: source.loyaltyMemberId,
      loyaltyRewardId: source.loyaltyRewardId,
      orderSource: source.orderSource,
      notes: source.notes,
    );
  }

  double _normalizeRate(double rate) {
    if (rate <= 0) return 0;
    if (rate > 1) return rate / 100;
    return rate;
  }

  double _roundCurrency(double value) => (value * 100).roundToDouble() / 100;

  Future<PosOrder> _applyItemLocally(PosOrder source, CartLine line) async {
    final items = List<PosOrderItem>.from(source.items);
    final existingIndex = items.indexWhere(
      (item) => item.productId == line.product.productId,
    );
    if (existingIndex >= 0) {
      final existing = items[existingIndex];
      final qty = existing.quantity + line.quantity;
      final subtotal = qty * existing.unitPrice;
      items[existingIndex] = PosOrderItem(
        id: existing.id,
        productId: existing.productId,
        productName: existing.productName,
        productCode: existing.productCode,
        quantity: qty,
        unitPrice: existing.unitPrice,
        subtotal: subtotal,
        status: existing.status,
        notes: line.notes ?? existing.notes,
      );
    } else {
      items.add(
        PosOrderItem(
          id: 'item-${_uuid.v4()}',
          productId: line.product.productId,
          productName: line.product.productName,
          productCode: line.product.productCode,
          quantity: line.quantity,
          unitPrice: line.product.price,
          subtotal: line.subtotal,
          status: 'PENDING',
          notes: line.notes,
        ),
      );
    }
    final subtotal = _roundCurrency(
      items.fold<double>(0, (sum, item) => sum + item.subtotal),
    );
    final config = await getConfig(source.outletId);
    if (config == null) {
      throw ApiException(
        'Konfigurasi POS belum tersedia di cache offline. Jalankan Sync POS Offline Data saat online terlebih dahulu.',
      );
    }

    final taxableBase = subtotal - source.discountAmount;
    final safeTaxableBase = taxableBase < 0 ? 0.0 : taxableBase;
    final taxAmount = _roundCurrency(
      safeTaxableBase * _normalizeRate(config.taxRate),
    );
    final serviceCharge = _roundCurrency(
      safeTaxableBase * _normalizeRate(config.serviceChargeRate),
    );
    final totalAmount = _roundCurrency(
      safeTaxableBase + taxAmount + serviceCharge,
    );

    return PosOrder(
      id: source.id,
      orderNumber: source.orderNumber,
      outletId: source.outletId,
      status: source.status,
      guestCount: source.guestCount,
      subtotal: subtotal,
      taxAmount: taxAmount,
      serviceCharge: serviceCharge,
      discountAmount: source.discountAmount,
      totalAmount: totalAmount,
      items: items,
      createdAt: source.createdAt,
      tableId: source.tableId,
      tableLabel: source.tableLabel,
      customerId: source.customerId,
      customerName: source.customerName,
      loyaltyMemberId: source.loyaltyMemberId,
      loyaltyRewardId: source.loyaltyRewardId,
      orderSource: source.orderSource,
      notes: source.notes,
    );
  }

  Future<void> _markOrderPaidLocally({
    required String orderId,
    String? customerId,
    String? customerName,
    String? loyaltyMemberId,
    String? loyaltyRewardId,
    required String syncStatus,
  }) async {
    final baseOrder = await _findCachedOrder(orderId);
    if (baseOrder == null) return;

    final nextStatus =
        {
          PosOrderStatus.draft,
          PosOrderStatus.inProgress,
          PosOrderStatus.ready,
          PosOrderStatus.waitingPayment,
        }.contains(baseOrder.status)
        ? PosOrderStatus.paid
        : baseOrder.status;

    final updated = PosOrder(
      id: baseOrder.id,
      orderNumber: baseOrder.orderNumber,
      outletId: baseOrder.outletId,
      status: nextStatus,
      guestCount: baseOrder.guestCount,
      subtotal: baseOrder.subtotal,
      taxAmount: baseOrder.taxAmount,
      serviceCharge: baseOrder.serviceCharge,
      discountAmount: baseOrder.discountAmount,
      totalAmount: baseOrder.totalAmount,
      items: baseOrder.items,
      createdAt: baseOrder.createdAt,
      tableId: baseOrder.tableId,
      tableLabel: baseOrder.tableLabel,
      customerId: customerId ?? baseOrder.customerId,
      customerName: customerName ?? baseOrder.customerName,
      loyaltyMemberId: loyaltyMemberId ?? baseOrder.loyaltyMemberId,
      loyaltyRewardId: loyaltyRewardId ?? baseOrder.loyaltyRewardId,
      orderSource: baseOrder.orderSource,
      notes: baseOrder.notes,
    );
    _upsertOrderCache(updated);
    await _saveCachedOrder(updated, syncStatus);
  }

  String receiptUrl(String orderId) =>
      '${_api.apiV1}/pos/orders/$orderId/receipt';

  Future<List<CatalogItem>> getCatalog(String outletId) async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/pos/catalog/outlet/$outletId',
      );
      final raw = response.data?['data'];
      if (raw is List) {
        final items = raw
            .whereType<Map<String, dynamic>>()
            .map(CatalogItem.fromJson)
            .toList();
        _catalogByOutlet[outletId] = items;
        await _cacheCatalog(outletId, items);
        return items;
      }
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final cached = _catalogByOutlet[outletId];
      if (cached != null) return cached;
    }
    final cached = await _getCachedCatalog(outletId);
    if (cached.isNotEmpty) _catalogByOutlet[outletId] = cached;
    return cached;
  }

  Future<void> _cacheCatalog(String outletId, List<CatalogItem> items) async {
    final now = DateTime.now();
    await _isar.writeTxn(() async {
      final stale = await _isar.cachedCatalogItems
          .filter()
          .outletIdEqualTo(outletId)
          .findAll();
      await _isar.cachedCatalogItems.deleteAll(stale.map((e) => e.id).toList());

      for (final item in items) {
        final cached = CachedCatalogItem()
          ..productId = item.productId
          ..outletId = outletId
          ..productCode = item.productCode
          ..productName = item.productName
          ..productKind = item.productKind
          ..price = item.price
          ..stock = item.stock.round()
          ..isAvailable = item.isAvailable
          ..imageUrl = item.imageUrl
          ..category = item.category
          ..cachedAt = now;
        await _isar.cachedCatalogItems.put(cached);
      }
    });
  }

  Future<List<CatalogItem>> _getCachedCatalog(String outletId) async {
    final cached = await _isar.cachedCatalogItems
        .filter()
        .outletIdEqualTo(outletId)
        .findAll();
    return cached
        .map(
          (c) => CatalogItem(
            productId: c.productId,
            productCode: c.productCode,
            productName: c.productName,
            productKind: c.productKind,
            price: c.price,
            stock: c.stock.toDouble(),
            isAvailable: c.isAvailable,
            imageUrl: c.imageUrl,
            category: c.category,
          ),
        )
        .toList();
  }

  Future<PosConfig?> getConfig(String outletId) async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/pos/config/outlet/$outletId',
      );
      final data = _dataMap(response.data);
      if (data.isEmpty) return _configByOutlet[outletId];
      final config = PosConfig.fromJson(data);
      _configByOutlet[outletId] = config;
      await _cacheConfig(outletId, config);
      return config;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final memory = _configByOutlet[outletId];
      if (memory != null) return memory;
      final cached = await _getCachedConfig(outletId);
      if (cached != null) _configByOutlet[outletId] = cached;
      return cached;
    }
  }

  Future<void> _cacheConfig(String outletId, PosConfig config) async {
    final existing = await _isar.cachedPosConfigs
        .filter()
        .outletIdEqualTo(outletId)
        .findFirst();
    final cached = existing ?? CachedPosConfig();
    cached
      ..outletId = outletId
      ..currency = config.currency
      ..taxRate = config.taxRate
      ..serviceChargeRate = config.serviceChargeRate
      ..printReceiptAuto = config.printReceiptAuto
      ..receiptFooter = config.receiptFooter
      ..receiptWhatsAppTemplate = config.receiptWhatsAppTemplate
      ..cachedAt = DateTime.now();
    await _isar.writeTxn(() async {
      await _isar.cachedPosConfigs.put(cached);
    });
  }

  Future<PosConfig?> _getCachedConfig(String outletId) async {
    final cached = await _isar.cachedPosConfigs
        .filter()
        .outletIdEqualTo(outletId)
        .findFirst();
    if (cached == null) return null;
    return PosConfig(
      currency: cached.currency,
      taxRate: cached.taxRate,
      serviceChargeRate: cached.serviceChargeRate,
      printReceiptAuto: cached.printReceiptAuto,
      receiptFooter: cached.receiptFooter,
      receiptWhatsAppTemplate: cached.receiptWhatsAppTemplate,
    );
  }

  Future<PosOfflineReadiness> getOfflineReadiness(String outletId) async {
    final outlet = await _isar.cachedOutlets
        .filter()
        .outletIdEqualTo(outletId)
        .findFirst();
    final config = await _isar.cachedPosConfigs
        .filter()
        .outletIdEqualTo(outletId)
        .findFirst();
    final catalog = await _isar.cachedCatalogItems
        .filter()
        .outletIdEqualTo(outletId)
        .findAll();

    return PosOfflineReadiness(
      outletId: outletId,
      hasOutlet: outlet != null,
      hasConfig: config != null,
      hasCatalog: catalog.isNotEmpty,
      lastSyncedAt: _oldestDate([
        if (outlet != null) outlet.cachedAt,
        if (config != null) config.cachedAt,
        if (catalog.isNotEmpty)
          _oldestDate(catalog.map((item) => item.cachedAt)),
      ]),
    );
  }

  Future<bool> isOfflineReady(String outletId) async {
    return (await getOfflineReadiness(outletId)).isReady;
  }

  DateTime? _oldestDate(Iterable<DateTime?> dates) {
    DateTime? oldest;
    for (final date in dates) {
      if (date == null) continue;
      if (oldest == null || date.isBefore(oldest)) oldest = date;
    }
    return oldest;
  }

  Future<PosOrder> createOrder({
    required String outletId,
    required String orderType,
    String? tableId,
    String? tableLabel,
    String? customerName,
    int guestCount = 1,
  }) async {
    final clientId = _uuid.v4();
    final data = <String, dynamic>{
      'outlet_id': outletId,
      'order_type': orderType,
      'guest_count': guestCount,
      'client_id': clientId,
    };
    if (tableId != null) data['table_id'] = tableId;
    if (tableLabel != null) data['table_label'] = tableLabel;
    if (customerName != null && customerName.isNotEmpty) {
      data['customer_name'] = customerName;
    }
    try {
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders',
        data: data,
      );
      final order = PosOrder.fromJson(_dataMap(response.data));
      _upsertOrderCache(order);
      await _saveCachedOrder(order, CachedOrderSyncStatus.synced);
      return order;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      if (!await isOfflineReady(outletId)) {
        throw ApiException(
          'Offline mode belum siap untuk outlet ini. Sambungkan internet lalu jalankan Sync POS Offline Data terlebih dahulu.',
        );
      }
      final localOrder = PosOrder(
        id: _newLocalOrderId(clientId),
        orderNumber: 'LOCAL-${clientId.substring(0, 8).toUpperCase()}',
        outletId: outletId,
        status: PosOrderStatus.draft,
        guestCount: guestCount,
        subtotal: 0,
        taxAmount: 0,
        serviceCharge: 0,
        discountAmount: 0,
        totalAmount: 0,
        items: const [],
        createdAt: DateTime.now(),
        tableId: tableId,
        tableLabel: tableLabel,
        customerName: customerName,
      );
      _upsertOrderCache(localOrder);
      // Persist an Isar CachedOrder so SyncEngine can resolve the server orderId
      // for downstream jobs (addItem, confirmOrder, processCash) via CachedOrder lookup.
      await _saveCachedOrder(localOrder, CachedOrderSyncStatus.local);
      await _enqueueJob(
        jobClientId: clientId,
        action: 'createOrder',
        payload: data,
      );
      return localOrder;
    }
  }

  Future<PosOrder> addItem(String orderId, CartLine line) async {
    final jobClientId = _uuid.v4();
    final bypassServer = await _isUnresolvedLocalOrder(orderId);
    final payload = {
      'product_id': line.product.productId,
      'quantity': line.quantity,
      if (line.notes != null && line.notes!.isNotEmpty) 'notes': line.notes,
    };
    try {
      if (bypassServer) {
        throw _pendingSyncOrderException();
      }
      final resolvedOrderId =
          await _resolvedServerOrderIdForLocal(orderId) ?? orderId;
      _api.setNextRequestHeader('X-Idempotency-Key', jobClientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$resolvedOrderId/items',
        data: payload,
      );
      final order = PosOrder.fromJson(_dataMap(response.data));
      _upsertOrderCache(order);
      await _saveCachedOrder(order, CachedOrderSyncStatus.synced);
      return order;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final baseOrder = await _findCachedOrder(orderId);
      if (baseOrder == null) {
        throw ApiException('Order tidak ditemukan di cache offline');
      }
      final updated = await _applyItemLocally(baseOrder, line);
      _upsertOrderCache(updated);
      await _saveCachedOrder(updated, CachedOrderSyncStatus.local);
      // For local orders (id = 'local-{parentClientId}'), use the parent clientId
      // so SyncEngine can propagate the resolved server orderId after createOrder syncs.
      final parentClientId = _extractClientId(orderId);
      await _enqueueJob(
        jobClientId: jobClientId,
        action: 'addItem',
        payload: {
          ...payload,
          if (parentClientId != null) 'clientId': parentClientId,
          'orderId': parentClientId == null ? orderId : null,
        },
      );
      return updated;
    }
  }

  Future<PosOrder> getOrderById(String orderId) async {
    final resolvedOrderId = await _resolvedServerOrderIdForLocal(orderId);
    if (orderId.startsWith('local-') && resolvedOrderId == null) {
      final cached = _orderById[orderId];
      if (cached != null) return cached;
      throw _pendingSyncOrderException();
    }
    final targetOrderId = resolvedOrderId ?? orderId;
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/pos/orders/$targetOrderId',
      );
      final order = PosOrder.fromJson(_dataMap(response.data));
      _orderById[order.id] = order;
      await _saveCachedOrder(order, CachedOrderSyncStatus.synced);
      if (resolvedOrderId != null && orderId != targetOrderId) {
        _reconcileLocalOrderId(orderId, order);
      }
      return order;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final cached = await _findCachedOrder(orderId);
      if (cached != null) return cached;
      rethrow;
    }
  }

  Future<PosOrder> confirmOrder(String orderId) async {
    final jobClientId = _uuid.v4();
    final bypassServer = await _isUnresolvedLocalOrder(orderId);
    try {
      if (bypassServer) {
        throw _pendingSyncOrderException();
      }
      final resolvedOrderId =
          await _resolvedServerOrderIdForLocal(orderId) ?? orderId;
      _api.setNextRequestHeader('X-Idempotency-Key', jobClientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$resolvedOrderId/confirm',
        data: <String, dynamic>{},
      );
      final order = PosOrder.fromJson(_dataMap(response.data));
      _upsertOrderCache(order);
      await _saveCachedOrder(order, CachedOrderSyncStatus.synced);
      return order;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final baseOrder = await _findCachedOrder(orderId);
      if (baseOrder == null) {
        throw ApiException('Order tidak ditemukan di cache offline');
      }
      final updated = PosOrder(
        id: baseOrder.id,
        orderNumber: baseOrder.orderNumber,
        outletId: baseOrder.outletId,
        status: PosOrderStatus.waitingPayment,
        guestCount: baseOrder.guestCount,
        subtotal: baseOrder.subtotal,
        taxAmount: baseOrder.taxAmount,
        serviceCharge: baseOrder.serviceCharge,
        discountAmount: baseOrder.discountAmount,
        totalAmount: baseOrder.totalAmount,
        items: baseOrder.items,
        createdAt: baseOrder.createdAt,
        tableId: baseOrder.tableId,
        tableLabel: baseOrder.tableLabel,
        customerId: baseOrder.customerId,
        customerName: baseOrder.customerName,
        loyaltyMemberId: baseOrder.loyaltyMemberId,
        loyaltyRewardId: baseOrder.loyaltyRewardId,
        orderSource: baseOrder.orderSource,
        notes: baseOrder.notes,
      );
      _upsertOrderCache(updated);
      await _saveCachedOrder(updated, CachedOrderSyncStatus.local);
      final parentClientId = _extractClientId(orderId);
      await _enqueueJob(
        jobClientId: jobClientId,
        action: 'confirmOrder',
        payload: {
          if (parentClientId != null) 'clientId': parentClientId,
          'orderId': parentClientId == null ? orderId : null,
        },
      );
      return updated;
    }
  }

  Future<PosOrder> voidOrder(String orderId, String reason) async {
    final jobClientId = _uuid.v4();
    final bypassServer = await _isUnresolvedLocalOrder(orderId);
    try {
      if (bypassServer) {
        throw _pendingSyncOrderException();
      }
      final resolvedOrderId =
          await _resolvedServerOrderIdForLocal(orderId) ?? orderId;
      _api.setNextRequestHeader('X-Idempotency-Key', jobClientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$resolvedOrderId/void',
        data: {'reason': reason},
      );
      final order = PosOrder.fromJson(_dataMap(response.data));
      _upsertOrderCache(order);
      await _saveCachedOrder(order, CachedOrderSyncStatus.synced);
      return order;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final baseOrder = await _findCachedOrder(orderId);
      if (baseOrder == null) {
        throw ApiException('Order tidak ditemukan di cache offline');
      }
      final updated = PosOrder(
        id: baseOrder.id,
        orderNumber: baseOrder.orderNumber,
        outletId: baseOrder.outletId,
        status: PosOrderStatus.voided,
        guestCount: baseOrder.guestCount,
        subtotal: baseOrder.subtotal,
        taxAmount: baseOrder.taxAmount,
        serviceCharge: baseOrder.serviceCharge,
        discountAmount: baseOrder.discountAmount,
        totalAmount: baseOrder.totalAmount,
        items: baseOrder.items,
        createdAt: baseOrder.createdAt,
        tableId: baseOrder.tableId,
        tableLabel: baseOrder.tableLabel,
        customerId: baseOrder.customerId,
        customerName: baseOrder.customerName,
        loyaltyMemberId: baseOrder.loyaltyMemberId,
        loyaltyRewardId: baseOrder.loyaltyRewardId,
        orderSource: baseOrder.orderSource,
        notes: baseOrder.notes,
      );
      _upsertOrderCache(updated);
      await _saveCachedOrder(updated, CachedOrderSyncStatus.local);
      final parentClientId = _extractClientId(orderId);
      await _enqueueJob(
        jobClientId: jobClientId,
        action: 'voidOrder',
        payload: {
          if (parentClientId != null) 'clientId': parentClientId,
          'orderId': parentClientId == null ? orderId : null,
          'reason': reason,
        },
      );
      return updated;
    }
  }

  Future<PosOrder> updateOrderTable({
    required String orderId,
    required String tableId,
    required String tableLabel,
  }) async {
    final bypassServer = await _isUnresolvedLocalOrder(orderId);
    final data = {'table_id': tableId, 'table_label': tableLabel};
    try {
      if (bypassServer) {
        throw _pendingSyncOrderException();
      }
      final resolvedOrderId =
          await _resolvedServerOrderIdForLocal(orderId) ?? orderId;
      final response = await _api.put<Map<String, dynamic>>(
        '/pos/orders/$resolvedOrderId/table',
        data: data,
      );
      final order = PosOrder.fromJson(_dataMap(response.data));
      _upsertOrderCache(order);
      await _saveCachedOrder(order, CachedOrderSyncStatus.synced);
      return order;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final baseOrder = await _findCachedOrder(orderId);
      if (baseOrder == null) {
        throw ApiException('Order tidak ditemukan di cache offline');
      }
      final updated = PosOrder(
        id: baseOrder.id,
        orderNumber: baseOrder.orderNumber,
        outletId: baseOrder.outletId,
        status: baseOrder.status,
        guestCount: baseOrder.guestCount,
        subtotal: baseOrder.subtotal,
        taxAmount: baseOrder.taxAmount,
        serviceCharge: baseOrder.serviceCharge,
        discountAmount: baseOrder.discountAmount,
        totalAmount: baseOrder.totalAmount,
        items: baseOrder.items,
        createdAt: baseOrder.createdAt,
        tableId: tableId,
        tableLabel: tableLabel,
        customerId: baseOrder.customerId,
        customerName: baseOrder.customerName,
        loyaltyMemberId: baseOrder.loyaltyMemberId,
        loyaltyRewardId: baseOrder.loyaltyRewardId,
        orderSource: baseOrder.orderSource,
        notes: baseOrder.notes,
      );
      _upsertOrderCache(updated);
      await _saveCachedOrder(updated, CachedOrderSyncStatus.local);

      final parentClientId = _extractClientId(orderId);
      await _enqueueJob(
        jobClientId: _uuid.v4(),
        action: 'updateOrderTable',
        payload: {
          ...data,
          if (parentClientId != null) 'clientId': parentClientId,
          'orderId': parentClientId == null ? orderId : null,
        },
      );
      return updated;
    }
  }

  Future<void> deleteOrder(String orderId) async {
    final bypassServer = await _isUnresolvedLocalOrder(orderId);
    final clientId = _extractClientId(orderId) ?? orderId;
    final resolvedOrderId = await _resolvedServerOrderIdForLocal(orderId);
    final relatedOrderIds = <String>{
      orderId,
      if (resolvedOrderId != null && resolvedOrderId.isNotEmpty) resolvedOrderId,
    };
    final resolvedCachedEntries = resolvedOrderId == null ||
            resolvedOrderId.isEmpty ||
            resolvedOrderId == orderId
        ? const <CachedOrder>[]
        : await _isar.cachedOrders
            .filter()
            .orderIdEqualTo(resolvedOrderId)
            .findAll();

    _removeOrderFromMemory(relatedOrderIds);

    final cachedEntries = <CachedOrder>[
      ...await _isar.cachedOrders.filter().clientIdEqualTo(clientId).findAll(),
      ...await _isar.cachedOrders.filter().orderIdEqualTo(orderId).findAll(),
      ...resolvedCachedEntries,
    ];
    final relatedJobs = await _findRelatedSyncJobs(
      clientId: clientId,
      orderIds: relatedOrderIds,
    );

    await _isar.writeTxn(() async {
      final deletedCacheIds = <int>{};
      for (final entry in cachedEntries) {
        if (deletedCacheIds.add(entry.id)) {
          await _isar.cachedOrders.delete(entry.id);
        }
      }

      final deletedJobIds = <int>{};
      for (final job in relatedJobs) {
        if (deletedJobIds.add(job.id)) {
          await _isar.syncJobs.delete(job.id);
        }
      }
    });

    try {
      if (!bypassServer) {
        final targetOrderId = resolvedOrderId ?? orderId;
        await _api.delete('/pos/orders/$targetOrderId');
      }
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      if (!bypassServer) {
        await _enqueueJob(
          jobClientId: _uuid.v4(),
          action: 'deleteOrder',
          payload: {'orderId': resolvedOrderId ?? orderId},
        );
      }
    }
  }

  Future<PosOrder> serveOrder(String orderId) async {
    final resolvedOrderId = await _resolvedServerOrderIdForLocal(orderId);
    final targetOrderId = resolvedOrderId ?? orderId;
    try {
      final bypassServer = await _isUnresolvedLocalOrder(orderId);
      if (bypassServer) {
        throw _pendingSyncOrderException();
      }
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$targetOrderId/serve',
      );
      final updated = PosOrder.fromJson(_dataMap(response.data));
      _upsertOrderCache(updated);
      await _saveCachedOrder(updated, CachedOrderSyncStatus.synced);
      return updated;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final baseOrder = await _findCachedOrder(orderId);
      if (baseOrder == null) {
        throw ApiException('Order tidak ditemukan di cache offline');
      }

      final updated = _markOrderServedLocally(baseOrder);
      _upsertOrderCache(updated);
      await _saveCachedOrder(updated, CachedOrderSyncStatus.local);

      final parentClientId = _extractClientId(orderId);
      await _enqueueJob(
        jobClientId: _uuid.v4(),
        action: 'serveOrder',
        payload: {
          if (parentClientId != null) 'clientId': parentClientId,
          'orderId': parentClientId == null ? targetOrderId : null,
        },
      );
      return updated;
    }
  }

  Future<PosOrder> completeOrder(String orderId) async {
    final resolvedOrderId = await _resolvedServerOrderIdForLocal(orderId);
    final targetOrderId = resolvedOrderId ?? orderId;
    try {
      final bypassServer = await _isUnresolvedLocalOrder(orderId);
      if (bypassServer) {
        throw _pendingSyncOrderException();
      }
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$targetOrderId/complete',
      );
      final updated = PosOrder.fromJson(_dataMap(response.data));
      _upsertOrderCache(updated);
      await _saveCachedOrder(updated, CachedOrderSyncStatus.synced);
      return updated;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final baseOrder = await _findCachedOrder(orderId);
      if (baseOrder == null) {
        throw ApiException('Order tidak ditemukan di cache offline');
      }

      final updated = _markOrderCompletedLocally(baseOrder);
      _upsertOrderCache(updated);
      await _saveCachedOrder(updated, CachedOrderSyncStatus.local);

      final parentClientId = _extractClientId(orderId);
      await _enqueueJob(
        jobClientId: _uuid.v4(),
        action: 'completeOrder',
        payload: {
          if (parentClientId != null) 'clientId': parentClientId,
          'orderId': parentClientId == null ? targetOrderId : null,
        },
      );
      return updated;
    }
  }

  Future<PosOrder> serveItem(String orderId, String itemId) async {
    final resolvedOrderId = await _resolvedServerOrderIdForLocal(orderId);
    final targetOrderId = resolvedOrderId ?? orderId;
    try {
      final bypassServer = await _isUnresolvedLocalOrder(orderId);
      if (bypassServer) {
        throw _pendingSyncOrderException();
      }
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$targetOrderId/items/$itemId/serve',
      );
      final updated = PosOrder.fromJson(_dataMap(response.data));
      _upsertOrderCache(updated);
      await _saveCachedOrder(updated, CachedOrderSyncStatus.synced);
      return updated;
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final baseOrder = await _findCachedOrder(orderId);
      if (baseOrder == null) {
        throw ApiException('Order tidak ditemukan di cache offline');
      }

      final updated = _markOrderItemServedLocally(baseOrder, itemId);
      _upsertOrderCache(updated);
      await _saveCachedOrder(updated, CachedOrderSyncStatus.local);

      String? productId;
      for (final item in baseOrder.items) {
        if (item.id == itemId) {
          productId = item.productId;
          break;
        }
      }

      final parentClientId = _extractClientId(orderId);
      await _enqueueJob(
        jobClientId: _uuid.v4(),
        action: 'serveItem',
        payload: {
          if (parentClientId != null) 'clientId': parentClientId,
          'orderId': parentClientId == null ? targetOrderId : null,
          'itemId': itemId,
          if (productId != null && productId.isNotEmpty) 'productId': productId,
        },
      );
      return updated;
    }
  }

  Future<List<PosOrder>> listOrders({
    required String outletId,
    String? status,
    int perPage = 100,
  }) async {
    await _normalizeMalformedLocalCache(outletId);

    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/pos/orders',
        queryParameters: {
          'outlet_id': outletId,
          'status': status,
          'per_page': perPage,
        },
      );
      final raw = response.data?['data'];
      if (raw is List) {
        final serverOrders = raw
            .whereType<Map<String, dynamic>>()
            .map(PosOrder.fromJson)
            .toList();

        // 1. Fetch local cache BEFORE modifying it with server data.
        final localCached = await _isar.cachedOrders
            .filter()
            .outletIdEqualTo(outletId)
            .findAll();
        final localOrders = localCached.map(_cachedToOrder).toList();
        final localById = <String, PosOrder>{
          for (final order in localOrders) order.id: order,
        };

        // 2. Build the initial merged list starting from server orders.
        final mergedOrders = List<PosOrder>.from(serverOrders);

        // Merge local data into matching server orders.
        for (var i = 0; i < mergedOrders.length; i++) {
          final serverOrder = mergedOrders[i];
          final local = localById[serverOrder.id];
          if (local != null) {
            mergedOrders[i] = _preferFurthestProgress(serverOrder, local);
          }
        }

        // 3. Append offline active local-created orders.
        for (final cachedOrder in localOrders) {
          if (!cachedOrder.id.startsWith('local-')) continue;
          if (!_isLocallyActiveStatus(cachedOrder.status)) continue;

          final resolvedServerId = await _resolvedServerOrderIdForLocal(
            cachedOrder.id,
          );
          if (resolvedServerId != null) {
            final serverIdx = mergedOrders.indexWhere(
              (order) => order.id == resolvedServerId,
            );
            if (serverIdx >= 0) {
              // Server order exists — merge & reconcile.
              final merged = _preferFurthestProgress(
                mergedOrders[serverIdx],
                cachedOrder,
              );
              mergedOrders[serverIdx] = merged;
              _reconcileLocalOrderId(cachedOrder.id, merged);
            }
            // Server resolved this local order but it's no longer in the
            // active list (e.g. already completed / cleared). Don't re-insert
            // the stale local ghost — just skip it.
            continue;
          }

          // No server ID yet (pure offline order); include only if not already present.
          if (!mergedOrders.any((order) => order.id == cachedOrder.id)) {
            mergedOrders.insert(0, cachedOrder);
          }
        }

        // 4. Save merged states to local database (Isar).
        await _isar.writeTxn(() async {
          for (final order in mergedOrders) {
            final localClientId = _extractClientId(order.id);
            final cacheLookupKey = localClientId ?? order.id;

            final existing = await _isar.cachedOrders
                .filter()
                .orderIdEqualTo(order.id)
                .or()
                .clientIdEqualTo(cacheLookupKey)
                .findFirst();

            var syncStatusToSave = CachedOrderSyncStatus.synced;
            if (existing != null) {
              final localOrder = _cachedToOrder(existing);
              final hasLocalProgress = _orderStatusRank(localOrder.status) > _orderStatusRank(order.status);
              if (hasLocalProgress || existing.syncStatus != CachedOrderSyncStatus.synced) {
                syncStatusToSave = existing.syncStatus;
              }
            } else if (order.id.startsWith('local-')) {
              syncStatusToSave = CachedOrderSyncStatus.local;
            }

            final entry = existing ?? CachedOrder();
            entry
              ..clientId = existing?.clientId ?? cacheLookupKey
              ..orderId = order.id.startsWith('local-') ? null : order.id
              ..outletId = outletId
              ..status = order.status.value
              ..itemsJson = jsonEncode(
                order.items
                    .map(
                      (item) => {
                        'id': item.id,
                        'product_id': item.productId,
                        'product_name': item.productName,
                        'product_code': item.productCode,
                        'quantity': item.quantity,
                        'unit_price': item.unitPrice,
                        'subtotal': item.subtotal,
                        'status': item.status,
                        if (item.notes != null) 'notes': item.notes,
                      },
                    )
                    .toList(),
              )
              ..totalAmount = order.totalAmount
              ..syncStatus = syncStatusToSave
              ..cachedAt = order.createdAt
              ..tableId = order.tableId
              ..tableLabel = order.tableLabel
              ..customerName = order.customerName;
            await _isar.cachedOrders.put(entry);
          }
        });

        // 5. Update in-memory caches.
        _ordersByOutlet[outletId] = mergedOrders;
        for (final order in mergedOrders) {
          _orderById[order.id] = order;
        }

        if (status == null || status.isEmpty) return mergedOrders;
        return mergedOrders
            .where((order) => order.status.value == status)
            .toList();
      }
    } catch (_) {
      final localCached = await _isar.cachedOrders
          .filter()
          .outletIdEqualTo(outletId)
          .findAll();
      final mapped = localCached.map(_cachedToOrder).toList();
      _ordersByOutlet[outletId] = mapped;
      for (final order in mapped) {
        _orderById[order.id] = order;
      }
      if (status == null || status.isEmpty) return mapped;
      return mapped.where((order) => order.status.value == status).toList();
    }
    return const [];
  }

  Future<PosPayment> processCash(
    String orderId, {
    required num amount,
    String? customerId,
    String? customerName,
    String? customerPhone,
    String? customerEmail,
    String? loyaltyMemberId,
    String? loyaltyRewardId,
  }) async {
    final clientId = _uuid.v4();
    final bypassServer = await _isUnresolvedLocalOrder(orderId);
    final data = <String, dynamic>{
      'method': PosPaymentMethod.cash.value,
      'amount': amount,
    };
    if (customerId != null && customerId.isNotEmpty) {
      data['customer_id'] = customerId;
    }
    if (customerName != null && customerName.isNotEmpty) {
      data['customer_name'] = customerName;
    }
    if (customerPhone != null && customerPhone.isNotEmpty) {
      data['customer_phone'] = customerPhone;
    }
    if (customerEmail != null && customerEmail.isNotEmpty) {
      data['customer_email'] = customerEmail;
    }
    if (loyaltyMemberId != null) data['loyalty_member_id'] = loyaltyMemberId;
    if (loyaltyRewardId != null) data['loyalty_reward_id'] = loyaltyRewardId;
    try {
      if (bypassServer) {
        throw _pendingSyncOrderException();
      }
      final resolvedOrderId =
          await _resolvedServerOrderIdForLocal(orderId) ?? orderId;
      _api.setNextRequestHeader('X-Idempotency-Key', clientId);
      final response = await _api.post<Map<String, dynamic>>(
        '/pos/orders/$resolvedOrderId/payments/cash',
        data: data,
      );
      await _markOrderPaidLocally(
        orderId: orderId,
        customerId: customerId,
        customerName: customerName,
        loyaltyMemberId: loyaltyMemberId,
        loyaltyRewardId: loyaltyRewardId,
        syncStatus: CachedOrderSyncStatus.synced,
      );
      return PosPayment.fromJson(_dataMap(response.data));
    } catch (error) {
      if (!_isOfflineError(error)) rethrow;
      final parentClientId = _extractClientId(orderId);
      await _enqueueJob(
        jobClientId: clientId,
        action: 'processCash',
        payload: {
          ...data,
          if (parentClientId != null) 'clientId': parentClientId,
          'orderId': parentClientId == null ? orderId : null,
        },
      );
      await _markOrderPaidLocally(
        orderId: orderId,
        customerId: customerId,
        customerName: customerName,
        loyaltyMemberId: loyaltyMemberId,
        loyaltyRewardId: loyaltyRewardId,
        syncStatus: CachedOrderSyncStatus.local,
      );
      return PosPayment(
        id: clientId,
        method: PosPaymentMethod.cash.value,
        status: 'pending_sync',
        amount: amount.toDouble(),
        tenderAmount: amount.toDouble(),
        changeAmount: 0,
      );
    }
  }

  Future<PosPayment> initiateDigital(
    String orderId, {
    required double amount,
    String channelCode = 'QRIS',
    String? customerId,
    String? customerName,
    String? customerPhone,
    String? customerEmail,
    String? loyaltyMemberId,
    String? loyaltyRewardId,
  }) async {
    final data = <String, dynamic>{
      'method': PosPaymentMethod.digital.value,
      'amount': amount,
      'channel_code': channelCode,
    };
    if (customerId != null && customerId.isNotEmpty) {
      data['customer_id'] = customerId;
    }
    if (customerName != null && customerName.isNotEmpty) {
      data['customer_name'] = customerName;
    }
    if (customerPhone != null && customerPhone.isNotEmpty) {
      data['customer_phone'] = customerPhone;
    }
    if (customerEmail != null && customerEmail.isNotEmpty) {
      data['customer_email'] = customerEmail;
    }
    if (loyaltyMemberId != null) data['loyalty_member_id'] = loyaltyMemberId;
    if (loyaltyRewardId != null) data['loyalty_reward_id'] = loyaltyRewardId;
    final response = await _api.post<Map<String, dynamic>>(
      '/pos/orders/$orderId/payments/digital',
      data: data,
    );
    return PosPayment.fromJson(_dataMap(response.data));
  }

  Future<List<PosPayment>> getPaymentsByOrderId(String orderId) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/pos/orders/$orderId/payments',
    );
    final raw = response.data?['data'];
    if (raw is List) {
      return raw
          .whereType<Map<String, dynamic>>()
          .map(PosPayment.fromJson)
          .toList();
    }
    return const [];
  }

  Future<XenditConnectionStatus> getXenditConnectionStatus() async {
    final response = await _api.get<Map<String, dynamic>>(
      '/pos/payment/status',
    );
    return XenditConnectionStatus.fromJson(_dataMap(response.data));
  }

  Future<List<PosCustomer>> listCustomers({
    String? search,
    int perPage = 10,
  }) async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/customer/customers',
        queryParameters: {'per_page': perPage, 'search': search},
      );
      final raw = response.data?['data'];
      if (raw is List) {
        final customers = raw
            .whereType<Map<String, dynamic>>()
            .map(PosCustomer.fromJson)
            .toList();
        // Update in-memory cache when fetched online.
        if (search == null || search.isEmpty) {
          _customerCache = customers;
        }
        return customers;
      }
      return const [];
    } catch (error) {
      if (error is ApiException && error.isOffline) {
        // Return cached customers so checkout can still look up regulars.
        if (search == null || search.isEmpty) return _customerCache;
        final q = search.toLowerCase();
        return _customerCache
            .where((c) => c.name.toLowerCase().contains(q))
            .toList();
      }
      rethrow;
    }
  }

  Future<PosCustomer> createCustomer({
    required String name,
    String? phone,
    String? email,
  }) async {
    final data = <String, dynamic>{'name': name, 'is_active': true};
    if (phone != null && phone.isNotEmpty) {
      data['contact_person'] = phone;
    }
    if (email != null && email.isNotEmpty) {
      data['email'] = email;
    }

    final response = await _api.post<Map<String, dynamic>>(
      '/customer/customers',
      data: data,
    );
    return PosCustomer.fromJson(_dataMap(response.data));
  }

  Map<String, dynamic> _dataMap(Map<String, dynamic>? envelope) {
    final data = envelope?['data'];
    return data is Map<String, dynamic> ? data : <String, dynamic>{};
  }
}
