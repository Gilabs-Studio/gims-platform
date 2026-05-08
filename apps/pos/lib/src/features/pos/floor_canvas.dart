import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';
import 'models.dart';

class FloorCanvas extends StatelessWidget {
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
  final List<LiveTableInfo> liveTables;
  final String? selectedId;
  final ValueChanged<LayoutObject>? onSelect;
  final void Function(LayoutObject object, Offset delta)? onMove;

  @override
  Widget build(BuildContext context) {
    final liveMap = {for (final info in liveTables) info.table.id: info};
    return InteractiveViewer(
      minScale: 0.35,
      maxScale: 2.4,
      boundaryMargin: const EdgeInsets.all(180),
      child: SizedBox(
        width: width.toDouble(),
        height: height.toDouble(),
        child: Stack(
          children: [
            Positioned.fill(child: CustomPaint(painter: _GridPainter())),
            for (final object in objects)
              _CanvasObjectView(
                object: object,
                selected: selectedId == object.id,
                liveInfo: liveMap[object.id],
                onSelect: onSelect,
                onMove: onMove,
              ),
          ],
        ),
      ),
    );
  }
}

class _CanvasObjectView extends StatelessWidget {
  const _CanvasObjectView({
    required this.object,
    required this.selected,
    required this.liveInfo,
    required this.onSelect,
    required this.onMove,
  });

  final LayoutObject object;
  final bool selected;
  final LiveTableInfo? liveInfo;
  final ValueChanged<LayoutObject>? onSelect;
  final void Function(LayoutObject object, Offset delta)? onMove;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: object.x,
      top: object.y,
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
  @override
  void paint(Canvas canvas, Size size) {
    final bgPaint = Paint()..color = Colors.white;
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
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _ObjectPainter extends CustomPainter {
  _ObjectPainter({
    required this.object,
    required this.selected,
    required this.liveInfo,
  });

  final LayoutObject object;
  final bool selected;
  final LiveTableInfo? liveInfo;

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
    final textPainter = TextPainter(
      text: TextSpan(
        text: label,
        style: const TextStyle(
          color: GimsColors.foreground,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
      textDirection: TextDirection.ltr,
      maxLines: 1,
    )..layout(maxWidth: size.width - 8);
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
