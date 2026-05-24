import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';

class StatusLegend extends StatelessWidget {
  const StatusLegend({
    super.key,
    required this.onRefresh,
    this.draftsCount = 0,
    this.onTapDrafts,
  });

  final VoidCallback onRefresh;
  final int draftsCount;
  final VoidCallback? onTapDrafts;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            const Expanded(
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _LegendDot(color: Colors.white, label: 'Available'),
                  _LegendDot(color: Color(0xfffffbeb), label: 'Waiting Payment'),
                  _LegendDot(color: Color(0xffdbeafe), label: 'Seated'),
                  _LegendDot(color: Color(0xffffedd5), label: '>30m'),
                  _LegendDot(color: Color(0xfffef3c7), label: 'Partial'),
                  _LegendDot(color: Color(0xffdcfce7), label: 'Served'),
                ],
              ),
            ),
            if (onTapDrafts != null) ...[
              Badge(
                isLabelVisible: draftsCount > 0,
                label: Text(draftsCount.toString()),
                child: OutlinedButton.icon(
                  onPressed: onTapDrafts,
                  icon: const Icon(Icons.archive_outlined, size: 16),
                  label: const Text('Saved Transactions'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
            ],
            IconButton(onPressed: onRefresh, icon: const Icon(Icons.refresh)),
          ],
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 14, height: 14, decoration: BoxDecoration(color: color, border: Border.all(color: GimsColors.border), borderRadius: BorderRadius.circular(3))),
      const SizedBox(width: 4),
      Text(label, style: const TextStyle(fontSize: 12)),
    ]);
  }
}
