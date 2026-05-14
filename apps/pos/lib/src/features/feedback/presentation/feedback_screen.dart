import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../app/app.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/error_utils.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../outlet/domain/models/outlet.dart';
import '../domain/models/feedback_form.dart';

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key, required this.outlet});
  final Outlet outlet;

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  static const int _defaultPageSize = 20;
  static const List<int> _pageSizeOptions = [10, 20, 50];

  String _searchInput = '';
  List<FeedbackResponseItem>? _responses;
  FeedbackPagination? _pagination;
  int _page = 1;
  int? _pageSize = _defaultPageSize;
  String _search = '';

  bool _loading = true;
  bool _openingDetail = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant FeedbackScreen old) {
    super.didUpdateWidget(old);
    if (old.outlet.id != widget.outlet.id) {
      _page = 1;
      _search = '';
      _searchInput = '';
      _load();
    }
  }

  @override
  void dispose() => super.dispose();

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final result = await ServiceLocator.instance.feedbackService.listFeedbackResponses(
        outletId: widget.outlet.id,
        page: _page,
        perPage: _effectivePageSize,
        search: _search,
      );
      if (!mounted) return;
      setState(() {
        _responses = result.items;
        _pagination = result.pagination;
      });
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openDetail(FeedbackResponseItem item) async {
    if (_openingDetail) return;
    setState(() => _openingDetail = true);

    try {
      final detail = await ServiceLocator.instance.feedbackService.getFeedbackResponseById(item.id);
      if (!mounted) return;

      final payload = detail ?? item;
      await showDialog<void>(
        context: context,
        builder: (context) => Dialog(
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(GimsRadius.medium),
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: _FeedbackDetailDialog(item: payload),
            ),
          ),
        ),
      );
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _openingDetail = false);
    }
  }

  void _onSearchSubmit() {
    final next = _searchInput.trim();
    if (next == _search) return;
    setState(() {
      _search = next;
      _page = 1;
    });
    _load();
  }

  int get _effectivePageSize {
    final current = _pageSize;
    if (current == null) return _defaultPageSize;
    if (_pageSizeOptions.contains(current)) return current;
    return _defaultPageSize;
  }

  void _goPrev() {
    if (_page <= 1) return;
    setState(() => _page -= 1);
    _load();
  }

  void _goNext() {
    final canNext = _pagination?.hasNext ?? false;
    if (!canNext) return;
    setState(() => _page += 1);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final responses = _responses ?? const <FeedbackResponseItem>[];

    if (_loading) return const Center(child: CircularProgressIndicator());
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final compact = constraints.maxWidth < 640;
                  final searchField = TextField(
                    key: const ValueKey('feedback-search-input'),
                    textInputAction: TextInputAction.search,
                    onTapOutside: (_) => FocusScope.of(context).unfocus(),
                    onSubmitted: (_) => _onSearchSubmit(),
                    onChanged: (value) => setState(() => _searchInput = value),
                    decoration: InputDecoration(
                      labelText: 'Cari customer / order',
                      prefixIcon: const Icon(Icons.search),
                      suffixIcon: _searchInput.trim().isEmpty
                          ? null
                          : IconButton(
                              tooltip: 'Clear',
                              onPressed: () {
                                setState(() => _searchInput = '');
                                _onSearchSubmit();
                              },
                              icon: const Icon(Icons.close),
                            ),
                    ),
                  );

                  final actionButtons = Row(
                    children: [
                      FilledButton.icon(
                        onPressed: _onSearchSubmit,
                        icon: const Icon(Icons.search),
                        label: const Text('Cari'),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: _load,
                        icon: const Icon(Icons.refresh),
                        label: const Text('Refresh'),
                      ),
                    ],
                  );

                  if (compact) {
                    return Column(
                      children: [
                        searchField,
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerRight,
                          child: actionButtons,
                        ),
                      ],
                    );
                  }

                  return Row(
                    children: [
                      Expanded(child: searchField),
                      const SizedBox(width: 8),
                      actionButtons,
                    ],
                  );
                },
              ),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: responses.isEmpty
                ? const EmptyState(
                    icon: Icons.rate_review_outlined,
                    title: 'Belum ada response feedback',
                    message: 'Response yang masuk dari form publik akan tampil di halaman ini.',
                  )
                : ListView.separated(
                    itemCount: responses.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      final item = responses[i];
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: GimsColors.primary.withValues(alpha: 0.12),
                                    child: const Icon(Icons.feedback_outlined, color: GimsColors.primary),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      item.customerName ?? 'Tanpa nama pelanggan',
                                      style: const TextStyle(fontWeight: FontWeight.w600),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  if (item.avgScore != null)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.amber.withValues(alpha: 0.18),
                                        borderRadius: BorderRadius.circular(999),
                                      ),
                                      child: Text(
                                        '★ ${item.avgScore!.toStringAsFixed(1)}',
                                        style: const TextStyle(fontSize: 12),
                                      ),
                                    )
                                  else
                                    const Text('★ -', style: TextStyle(color: GimsColors.mutedForeground, fontSize: 12)),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(
                                'Outlet: ${item.outletName ?? item.outletId}',
                                style: const TextStyle(fontSize: 13, color: GimsColors.mutedForeground),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Order: ${item.salesOrderId ?? item.posOrderId ?? '-'}',
                                style: const TextStyle(fontSize: 13, color: GimsColors.mutedForeground),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Submitted: ${_formatSubmittedAt(item.submittedAt)}',
                                style: const TextStyle(fontSize: 13, color: GimsColors.mutedForeground),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 10),
                              Align(
                                alignment: Alignment.centerRight,
                                child: FilledButton.icon(
                                  onPressed: () => _openDetail(item),
                                  icon: const Icon(Icons.visibility_outlined, size: 18),
                                  label: const Text('Detail'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          const SizedBox(height: 12),
          _PaginationBar(
            page: _pagination?.page ?? _page,
            total: _pagination?.total ?? responses.length,
            hasPrev: _pagination?.hasPrev ?? (_page > 1),
            hasNext: _pagination?.hasNext ?? false,
            onPrev: _goPrev,
            onNext: _goNext,
            pageSize: _effectivePageSize,
            onPageSizeChanged: (value) {
              if (value == _effectivePageSize) return;
              setState(() {
                _pageSize = value;
                _page = 1;
              });
              _load();
            },
          ),
        ],
      ),
    );
  }

  String _formatSubmittedAt(DateTime date) {
    if (date.millisecondsSinceEpoch == 0) return '-';
    return DateFormat('dd MMM yyyy HH:mm').format(date);
  }
}

class _PaginationBar extends StatelessWidget {
  const _PaginationBar({
    required this.page,
    required this.total,
    required this.hasPrev,
    required this.hasNext,
    required this.onPrev,
    required this.onNext,
    required this.pageSize,
    required this.onPageSizeChanged,
  });

  final int page;
  final int total;
  final bool hasPrev;
  final bool hasNext;
  final VoidCallback onPrev;
  final VoidCallback onNext;
  final int? pageSize;
  final ValueChanged<int> onPageSizeChanged;

  @override
  Widget build(BuildContext context) {
    const options = <int>[10, 20, 50];
    final selectedPageSize = options.contains(pageSize) ? pageSize! : 20;

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compact = constraints.maxWidth < 560;

            final leftControls = Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Total: $total'),
                const SizedBox(width: 12),
                const Text('Rows:'),
                const SizedBox(width: 8),
                DropdownButton<int>(
                  value: selectedPageSize,
                  items: options
                      .map((size) => DropdownMenuItem(value: size, child: Text('$size')))
                      .toList(),
                  onChanged: (value) {
                    if (value != null) onPageSizeChanged(value);
                  },
                ),
              ],
            );

            final rightControls = Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Page $page'),
                const SizedBox(width: 8),
                IconButton(
                  tooltip: 'Prev',
                  onPressed: hasPrev ? onPrev : null,
                  icon: const Icon(Icons.chevron_left),
                ),
                IconButton(
                  tooltip: 'Next',
                  onPressed: hasNext ? onNext : null,
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            );

            if (compact) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  leftControls,
                  const SizedBox(height: 8),
                  rightControls,
                ],
              );
            }

            return Row(
              children: [
                leftControls,
                const Spacer(),
                rightControls,
              ],
            );
          },
        ),
      ),
    );
  }
}

class _FeedbackDetailDialog extends StatelessWidget {
  const _FeedbackDetailDialog({required this.item});

  final FeedbackResponseItem item;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.visibility_outlined, color: GimsColors.primary),
            const SizedBox(width: 8),
            Text(
              'Detail Response',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const Spacer(),
            IconButton(
              tooltip: 'Close',
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.close),
            ),
          ],
        ),
        const SizedBox(height: 8),
        const Divider(height: 1),
        const SizedBox(height: 12),
        _DetailRow(label: 'Customer', value: item.customerName ?? '-'),
        _DetailRow(label: 'Outlet', value: item.outletName ?? item.outletId),
        _DetailRow(label: 'Order ID', value: item.salesOrderId ?? item.posOrderId ?? '-'),
        _DetailRow(
          label: 'Average Score',
          value: item.avgScore != null ? item.avgScore!.toStringAsFixed(1) : '-',
        ),
        _DetailRow(
          label: 'Submitted At',
          value: item.submittedAt.millisecondsSinceEpoch == 0
              ? '-'
              : DateFormat('dd MMM yyyy HH:mm').format(item.submittedAt),
        ),
        const SizedBox(height: 16),
        Text(
          'Answers',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 300),
          child: item.answers.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(12),
                    child: Text(
                      'Tidak ada jawaban.',
                      style: TextStyle(color: GimsColors.mutedForeground),
                    ),
                  ),
                )
              : ListView.separated(
                  shrinkWrap: true,
                  itemCount: item.answers.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (_, index) {
                    final entry = item.answers.entries.elementAt(index);
                    final questionLabel = item.getQuestionLabel(entry.key);
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              questionLabel,
                              style: const TextStyle(
                                color: GimsColors.mutedForeground,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _answerValue(entry.value),
                              textAlign: TextAlign.right,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  String _answerValue(Object? value) {
    if (value is List) {
      if (value.isEmpty) return '-';
      return value.map((item) => '$item').join(', ');
    }
    if (value == null) return '-';
    final text = '$value'.trim();
    return text.isEmpty ? '-' : text;
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                color: GimsColors.mutedForeground,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
