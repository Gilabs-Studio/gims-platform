import 'dart:convert';

import '../../../../shared/models/json_helpers.dart';

/// Floor plan with layout objects.
class FloorPlan {
  FloorPlan({
    required this.id,
    required this.outletId,
    required this.name,
    required this.floorNumber,
    required this.status,
    required this.gridSize,
    required this.snapToGrid,
    required this.width,
    required this.height,
    required this.objects,
  });

  final String id;
  final String outletId;
  final String name;
  final int floorNumber;
  final String status;
  final int gridSize;
  final bool snapToGrid;
  final int width;
  final int height;
  final List<LayoutObject> objects;

  factory FloorPlan.fromJson(Map<String, dynamic> json) {
    return FloorPlan(
      id: json['id'] as String? ?? '',
      outletId: json['outlet_id'] as String? ?? '',
      name: json['name'] as String? ?? 'Floor',
      floorNumber: (json['floor_number'] as num?)?.toInt() ?? 1,
      status: json['status'] as String? ?? 'draft',
      gridSize: (json['grid_size'] as num?)?.toInt() ?? 20,
      snapToGrid: json['snap_to_grid'] as bool? ?? true,
      width: (json['width'] as num?)?.toInt() ?? 900,
      height: (json['height'] as num?)?.toInt() ?? 600,
      objects: LayoutObject.decodeList(json['layout_data']),
    );
  }

  String encodeLayout() {
    return jsonEncode(objects.map((object) => object.toJson()).toList());
  }
}

/// A renderable object on the floor canvas (table, chair, wall, etc).
class LayoutObject {
  LayoutObject({
    required this.id,
    required this.type,
    required this.x,
    required this.y,
    required this.width,
    required this.height,
    this.rotation = 0,
    this.label,
    this.parentId,
    this.tableNumber,
    this.tableShape,
    this.capacity,
    this.zoneType,
    this.color,
    this.opacity,
  });

  final String id;
  final String type;
  double x;
  double y;
  double width;
  double height;
  double rotation;
  String? label;
  String? parentId;
  int? tableNumber;
  String? tableShape;
  int? capacity;
  String? zoneType;
  String? color;
  double? opacity;

  bool get isTable => type == 'table';
  bool get isChair => type == 'chair';

  factory LayoutObject.fromJson(Map<String, dynamic> json) {
    return LayoutObject(
      id:
          json['id'] as String? ??
          DateTime.now().microsecondsSinceEpoch.toString(),
      type: json['type'] as String? ?? 'table',
      x: asDouble(json['x']),
      y: asDouble(json['y']),
      width: asDouble(json['width'], fallback: 90),
      height: asDouble(json['height'], fallback: 70),
      rotation: asDouble(json['rotation']),
      label: json['label'] as String?,
      parentId: json['parentId'] as String?,
      tableNumber: (json['tableNumber'] as num?)?.toInt(),
      tableShape: json['tableShape'] as String?,
      capacity: (json['capacity'] as num?)?.toInt(),
      zoneType: json['zoneType'] as String?,
      color: json['color'] as String?,
      opacity: nullableDouble(json['opacity']),
    );
  }

  static List<LayoutObject> decodeList(Object? value) {
    Object? parsed = value;
    if (value is String && value.trim().isNotEmpty) {
      parsed = jsonDecode(value);
    }
    if (parsed is List) {
      return parsed
          .whereType<Map<String, dynamic>>()
          .map(LayoutObject.fromJson)
          .toList();
    }
    return [];
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'x': x,
      'y': y,
      'width': width,
      'height': height,
      'rotation': rotation,
      if (label != null) 'label': label,
      if (parentId != null) 'parentId': parentId,
      if (tableNumber != null) 'tableNumber': tableNumber,
      if (tableShape != null) 'tableShape': tableShape,
      if (capacity != null) 'capacity': capacity,
      if (zoneType != null) 'zoneType': zoneType,
      if (color != null) 'color': color,
      if (opacity != null) 'opacity': opacity,
    };
  }
}

/// Live status of a table on the floor canvas.
class LiveTableInfo {
  LiveTableInfo({
    required this.table,
    required this.seatCount,
    required this.status,
    required this.duration,
    this.order,
  });

  final LayoutObject table;
  final int seatCount;
  final String status;
  final Duration duration;
  final dynamic order; // PosOrder — imported at usage site to avoid circular deps
}
