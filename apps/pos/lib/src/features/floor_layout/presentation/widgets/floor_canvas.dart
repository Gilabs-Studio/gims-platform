import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../domain/models/floor_plan.dart';
import '../../domain/live_table_data.dart';

class FloorCanvas extends StatefulWidget {
  const FloorCanvas({
    super.key,
    required this.objects,
    required this.width,
    required this.height,
    this.liveTables = const [],
    this.selectedId,
    this.onSelect,
    this.onMove,
  });

  final List<LayoutObject> objects;
  final int width;
  final int height;
  final List<LiveTableData> liveTables;
  final String? selectedId;
  final ValueChanged<LayoutObject>? onSelect;
  final void Function(LayoutObject object, Offset delta)? onMove;

  @override
  State<FloorCanvas> createState() => _FloorCanvasState();
}

class _FloorCanvasState extends State<FloorCanvas> {
  late TransformationController _transformationController;
  bool _initializedScale = false;
  double _lastParentWidth = 0;
  double _lastParentHeight = 0;

  @override
  void initState() {
    super.initState();
    _transformationController = TransformationController();
  }

  @override
  void dispose() {
    _transformationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final liveMap = {for (final info in widget.liveTables) info.table.id: info};

    return LayoutBuilder(
      builder: (context, constraints) {
        final double parentWidth = constraints.maxWidth;
        final double parentHeight = constraints.maxHeight;

        // Calculate size based on objects
        const double padding = 40.0;
        double contentWidth = widget.width.toDouble() + (padding * 2);
        double contentHeight = widget.height.toDouble() + (padding * 2);
        for (final object in widget.objects) {
          final right = object.x + object.width + (padding * 2);
          final bottom = object.y + object.height + (padding * 2);
          if (right > contentWidth) contentWidth = right;
          if (bottom > contentHeight) contentHeight = bottom;
        }

        // Dynamically expand canvas size to at least parent size
        // so the background grid spans the whole screen when stretched
        final double canvasWidth = math.max(contentWidth, parentWidth);
        final double canvasHeight = math.max(contentHeight, parentHeight);

        // Auto-scale to fit available size on load or window resize
        if (!_initializedScale || parentWidth != _lastParentWidth || parentHeight != _lastParentHeight) {
          _lastParentWidth = parentWidth;
          _lastParentHeight = parentHeight;
          _initializedScale = true;

          final double scaleX = parentWidth / contentWidth;
          final double scaleY = parentHeight / contentHeight;
          final double fitScale = math.min(scaleX, scaleY).clamp(0.35, 1.0);

          final double dx = (parentWidth - (contentWidth * fitScale)) / 2;
          final double dy = (parentHeight - (contentHeight * fitScale)) / 2;

          _transformationController.value = Matrix4.identity()
            ..translate(dx, dy)
            ..scale(fitScale);
        }

        final Color gridBgColor = Theme.of(context).cardColor;

        return InteractiveViewer(
          transformationController: _transformationController,
          minScale: 0.35,
          maxScale: 2.4,
          boundaryMargin: const EdgeInsets.all(180),
          child: SizedBox(
            width: canvasWidth,
            height: canvasHeight,
            child: Stack(
              children: [
                Positioned.fill(
                  child: CustomPaint(
                    painter: _GridPainter(backgroundColor: gridBgColor),
                  ),
                ),
                for (final object in widget.objects)
                  _CanvasObjectView(
                    object: object,
                    offsetX: padding,
                    offsetY: padding,
                    selected: widget.selectedId == object.id,
                    liveInfo: liveMap[object.id],
                    onSelect: widget.onSelect,
                    onMove: widget.onMove,
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _CanvasObjectView extends StatelessWidget {
  const _CanvasObjectView({
    required this.object,
    required this.offsetX,
    required this.offsetY,
    required this.selected,
    required this.liveInfo,
    required this.onSelect,
    required this.onMove,
  });

  final LayoutObject object;
  final double offsetX;
  final double offsetY;
  final bool selected;
  final LiveTableData? liveInfo;
  final ValueChanged<LayoutObject>? onSelect;
  final void Function(LayoutObject object, Offset delta)? onMove;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: object.x + offsetX,
      top: object.y + offsetY,
      width: object.width,
      height: object.height,
      child: GestureDetector(
        onTap: () => onSelect?.call(object),
        onPanUpdate: onMove == null
            ? null
            : (details) => onMove?.call(object, details.delta),
        child: Transform.rotate(
          angle: object.rotation * 3.1415926535 / 180,
          child: CustomPaint(
            painter: _ObjectPainter(
              object: object,
              selected: selected,
              liveInfo: liveInfo,
            ),
          ),
        ),
      ),
    );
  }
}

class _GridPainter extends CustomPainter {
  _GridPainter({required this.backgroundColor});

  final Color backgroundColor;

  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = backgroundColor;
    canvas.drawRect(Offset.zero & size, bgPaint);

    final gridPaint = Paint()
      ..color = GimsColors.border.withValues(alpha: 0.45)
      ..strokeWidth = 1;
    const gap = 20.0;
    for (double x = 0; x <= size.width; x += gap) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y <= size.height; y += gap) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _GridPainter oldDelegate) =>
      oldDelegate.backgroundColor != backgroundColor;
}

class _ObjectPainter extends CustomPainter {
  _ObjectPainter({
    required this.object,
    required this.selected,
    required this.liveInfo,
  });

  final LayoutObject object;
  final bool selected;
  final LiveTableData? liveInfo;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final paint = Paint()..style = PaintingStyle.fill;
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = selected ? 3 : 1.5
      ..color = selected ? GimsColors.primary : GimsColors.border;

    switch (object.type) {
      case 'chair':
        paint.color = const Color(0xffdbeafe);
        canvas.drawRRect(
          RRect.fromRectAndRadius(rect.deflate(2), const Radius.circular(4)),
          paint,
        );
        break;
      case 'wall':
        paint.color = const Color(0xff475467);
        canvas.drawRRect(
          RRect.fromRectAndRadius(rect, const Radius.circular(2)),
          paint,
        );
        break;
      case 'door':
        paint.color = const Color(0xfffde68a);
        canvas.drawRRect(
          RRect.fromRectAndRadius(rect.deflate(1), const Radius.circular(5)),
          paint,
        );
        break;
      case 'cashier':
        paint.color = const Color(0xffcffafe);
        canvas.drawRRect(
          RRect.fromRectAndRadius(rect.deflate(1), const Radius.circular(6)),
          paint,
        );
        break;
      case 'zone':
        paint.color = _parseColor(object.color) ?? const Color(0xffdcfce7);
        paint.color = paint.color.withValues(alpha: object.opacity ?? 0.35);
        canvas.drawRRect(
          RRect.fromRectAndRadius(rect.deflate(1), const Radius.circular(8)),
          paint,
        );
        break;
      default:
        paint.color = _tableColor(liveInfo?.status);
        final isCircle = object.tableShape == 'circle';
        if (isCircle) {
          canvas.drawOval(rect.deflate(2), paint);
          canvas.drawOval(rect.deflate(2), stroke);
        } else {
          final rrect = RRect.fromRectAndRadius(
            rect.deflate(2),
            const Radius.circular(7),
          );
          canvas.drawRRect(rrect, paint);
          canvas.drawRRect(rrect, stroke);
        }
    }

    if (object.type != 'table' || object.tableShape != 'circle') {
      canvas.drawRRect(
        RRect.fromRectAndRadius(rect.deflate(1), const Radius.circular(7)),
        stroke,
      );
    }

    final label = object.label ?? object.tableNumber?.toString() ?? object.type;
    final isCircle = object.tableShape == 'circle';
    final maxWidth = isCircle ? (size.width * 0.7) : (size.width - 8.0);

    double fontSize = 12.0;
    TextPainter textPainter;

    while (true) {
      textPainter = TextPainter(
        text: TextSpan(
          text: label,
          style: TextStyle(
            color: GimsColors.foreground,
            fontSize: fontSize,
            fontWeight: FontWeight.w700,
          ),
        ),
        textDirection: TextDirection.ltr,
        maxLines: 1,
      )..layout();

      if (textPainter.width <= maxWidth || fontSize <= 6.0) {
        break;
      }
      fontSize -= 0.5;
    }

    textPainter.layout(maxWidth: maxWidth);
    textPainter.paint(
      canvas,
      Offset(
        (size.width - textPainter.width) / 2,
        (size.height - textPainter.height) / 2,
      ),
    );
  }

  Color _tableColor(String? status) {
    switch (status) {
      case 'WARN_LONG':
        return const Color(0xffffedd5);
      case 'WAITING_PAYMENT':
        return const Color(0xfffffbeb);
      case 'PARTIAL_SERVED':
        return const Color(0xfffef3c7);
      case 'SERVED':
        return const Color(0xffdcfce7);
      case 'SEATED':
        return const Color(0xffdbeafe);
      default:
        return Colors.white;
    }
  }

  Color? _parseColor(String? value) {
    if (value == null || !value.startsWith('#')) return null;
    final hex = value.replaceFirst('#', '');
    final normalized = hex.length == 6 ? 'ff$hex' : hex;
    return Color(int.parse(normalized, radix: 16));
  }

  @override
  bool shouldRepaint(covariant _ObjectPainter oldDelegate) {
    return oldDelegate.object != object ||
        oldDelegate.selected != selected ||
        oldDelegate.liveInfo?.status != liveInfo?.status;
  }
}
