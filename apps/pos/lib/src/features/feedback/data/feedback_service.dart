import '../../../core/network/api_client.dart';
import '../domain/models/feedback_form.dart';

/// Feedback service — response list and response detail.
class FeedbackService {
  FeedbackService(this._api);

  final ApiClient _api;

  Future<FeedbackResponseList> listFeedbackResponses({
    required String outletId,
    int page = 1,
    int perPage = 20,
    String? search,
    String? formId,
  }) async {
    final query = <String, dynamic>{
      'outlet_id': outletId,
      'page': page,
      'per_page': perPage,
    };
    if (search != null && search.trim().isNotEmpty) {
      query['search'] = search.trim();
    }
    if (formId != null && formId.trim().isNotEmpty) {
      query['form_id'] = formId.trim();
    }

    final response = await _api.get<Map<String, dynamic>>(
      '/feedback/responses',
      queryParameters: query,
    );

    final raw = response.data?['data'];
    final items = <FeedbackResponseItem>[];
    if (raw is List) {
      items.addAll(
        raw
            .whereType<Map<String, dynamic>>()
            .map(FeedbackResponseItem.fromJson),
      );
    }

    FeedbackPagination? pagination;
    final meta = response.data?['meta'];
    if (meta is Map<String, dynamic>) {
      final pg = meta['pagination'];
      if (pg is Map<String, dynamic>) {
        pagination = FeedbackPagination.fromJson(pg);
      }
    }

    return FeedbackResponseList(items: items, pagination: pagination);
  }

  Future<FeedbackResponseItem?> getFeedbackResponseById(String id) async {
    final response = await _api.get<Map<String, dynamic>>(
      '/feedback/responses/$id',
    );
    final data = response.data?['data'];
    if (data is Map<String, dynamic>) {
      return FeedbackResponseItem.fromJson(data);
    }
    return null;
  }
}
