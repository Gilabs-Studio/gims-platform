/// Pagination metadata from feedback response list endpoint.
class FeedbackPagination {
  FeedbackPagination({
    required this.page,
    required this.perPage,
    required this.total,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrev,
  });

  final int page;
  final int perPage;
  final int total;
  final int totalPages;
  final bool hasNext;
  final bool hasPrev;

  factory FeedbackPagination.fromJson(Map<String, dynamic> json) {
    return FeedbackPagination(
      page: (json['page'] as num?)?.toInt() ?? 1,
      perPage: (json['per_page'] as num?)?.toInt() ?? 20,
      total: (json['total'] as num?)?.toInt() ?? 0,
      totalPages: (json['total_pages'] as num?)?.toInt() ?? 1,
      hasNext: json['has_next'] as bool? ?? false,
      hasPrev: json['has_prev'] as bool? ?? false,
    );
  }
}

/// Response envelope for feedback response list endpoint.
class FeedbackResponseList {
  FeedbackResponseList({
    required this.items,
    this.pagination,
  });

  final List<FeedbackResponseItem> items;
  final FeedbackPagination? pagination;
}

/// Feedback response item aligned with web module contract.
class FeedbackResponseItem {
  FeedbackResponseItem({
    required this.id,
    required this.formId,
    required this.outletId,
    required this.answers,
    required this.submittedAt,
    this.outletName,
    this.salesOrderId,
    this.posOrderId,
    this.customerName,
    this.avgScore,
  });

  final String id;
  final String formId;
  final String outletId;
  final String? outletName;
  final String? salesOrderId;
  final String? posOrderId;
  final String? customerName;
  final Map<String, dynamic> answers;
  final double? avgScore;
  final DateTime submittedAt;

  factory FeedbackResponseItem.fromJson(Map<String, dynamic> json) {
    return FeedbackResponseItem(
      id: json['id'] as String? ?? '',
      formId: json['form_id'] as String? ?? '',
      outletId: json['outlet_id'] as String? ?? '',
      outletName: json['outlet_name'] as String?,
      salesOrderId: json['sales_order_id'] as String?,
      posOrderId: json['pos_order_id'] as String?,
      customerName: json['customer_name'] as String?,
      answers: _answersMap(json['answers']),
      avgScore: (json['avg_score'] as num?)?.toDouble(),
      submittedAt: _parseDate(json['submitted_at'] as String?),
    );
  }

  static Map<String, dynamic> _answersMap(Object? raw) {
    if (raw is Map<String, dynamic>) return raw;
    if (raw is Map) {
      return raw.map((key, value) => MapEntry('$key', value));
    }
    return <String, dynamic>{};
  }

  static DateTime _parseDate(String? value) {
    if (value == null || value.isEmpty) return DateTime.fromMillisecondsSinceEpoch(0);
    return DateTime.tryParse(value)?.toLocal() ?? DateTime.fromMillisecondsSinceEpoch(0);
  }
}
