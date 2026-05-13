import '../../../core/network/api_client.dart';
import '../domain/models/feedback_form.dart';

/// Feedback service — list forms, create quick form.
class FeedbackService {
  FeedbackService(this._api);

  final ApiClient _api;

  Future<List<FeedbackForm>> listFeedbackForms({String? outletId}) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/feedback/forms',
      queryParameters: {'outlet_id': outletId, 'per_page': 100},
    );
    final raw = response.data?['data'];
    if (raw is List) {
      return raw
          .whereType<Map<String, dynamic>>()
          .map(FeedbackForm.fromJson)
          .toList();
    }
    return const [];
  }

  Future<void> createQuickFeedbackForm({
    required String outletId,
    required String title,
  }) async {
    await _api.post<Map<String, dynamic>>(
      '/feedback/forms',
      data: {
        'outlet_id': outletId,
        'title': title,
        'description': 'Mobile POS feedback form',
        'is_active': true,
        'schema_json': {
          'questions': [
            {
              'id': 'rating_${DateTime.now().millisecondsSinceEpoch}',
              'type': 'rating',
              'label': 'Bagaimana pengalaman Anda?',
              'required': true,
              'order': 1,
              'config': {'min': 1, 'max': 5, 'step': 1},
            },
            {
              'id': 'note_${DateTime.now().millisecondsSinceEpoch}',
              'type': 'text',
              'label': 'Catatan',
              'required': false,
              'order': 2,
              'config': {'max_length': 500},
            },
          ],
        },
      },
    );
  }
}
