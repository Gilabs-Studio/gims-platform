import 'package:flutter_test/flutter_test.dart';
import 'package:superapp/app.dart';

void main() {
  testWidgets('SuperApp login page renders correctly', (WidgetTester tester) async {
    await tester.pumpWidget(const SuperApp());
    expect(find.text('SuperApp Meccaya'), findsOneWidget);
    expect(find.text('Masuk sebagai Staff'), findsOneWidget);
    expect(find.text('Masuk sebagai Admin'), findsOneWidget);
  });
}
