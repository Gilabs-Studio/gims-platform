import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:gims_pos/src/app.dart';

void main() {
  testWidgets('renders empty state smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: EmptyState(
          icon: Icons.point_of_sale,
          title: 'POS ready',
          message: 'Mobile shell renders.',
        ),
      ),
    );

    expect(find.text('POS ready'), findsOneWidget);
    expect(find.byIcon(Icons.point_of_sale), findsOneWidget);
  });
}
