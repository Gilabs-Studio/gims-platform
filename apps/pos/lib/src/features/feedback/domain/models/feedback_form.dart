/// Feedback form definition for an outlet.
class FeedbackForm {
  FeedbackForm({
    required this.id,
    required this.outletId,
    required this.title,
    required this.isActive,
    this.description,
  });

  final String id;
  final String outletId;
  final String title;
  final bool isActive;
  final String? description;

  factory FeedbackForm.fromJson(Map<String, dynamic> json) {
    return FeedbackForm(
      id: json['id'] as String? ?? '',
      outletId: json['outlet_id'] as String? ?? '',
      title: json['title'] as String? ?? 'Feedback',
      isActive: json['is_active'] as bool? ?? false,
      description: json['description'] as String?,
    );
  }
}
