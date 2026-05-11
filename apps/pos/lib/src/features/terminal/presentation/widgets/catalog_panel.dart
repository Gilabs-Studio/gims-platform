import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/utils/url_utils.dart';
import '../../domain/models/catalog_item.dart';

/// Product catalog grid with search and category filtering.
class CatalogPanel extends StatefulWidget {
  const CatalogPanel({
    super.key,
    required this.search,
    required this.products,
    required this.categories,
    required this.onChanged,
    required this.onTap,
  });

  final TextEditingController search;
  final List<CatalogItem> products;
  final List<String> categories;
  final VoidCallback onChanged;
  final ValueChanged<CatalogItem> onTap;

  @override
  State<CatalogPanel> createState() => _CatalogPanelState();
}

class _CatalogPanelState extends State<CatalogPanel> {
  String? _categoryFilter;

  @override
  Widget build(BuildContext context) {
    final filteredProducts = widget.products.where((item) {
      final matchCategory =
          _categoryFilter == null || item.category == _categoryFilter;
      return matchCategory;
    }).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            TextField(
              controller: widget.search,
              onChanged: (_) => widget.onChanged(),
              decoration: const InputDecoration(
                hintText: 'Cari produk',
                prefixIcon: Icon(Icons.search),
              ),
            ),
            const SizedBox(height: 12),
            if (widget.categories.isNotEmpty)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    ChoiceChip(
                      label: const Text('All'),
                      selected: _categoryFilter == null,
                      onSelected: (_) {
                        setState(() => _categoryFilter = null);
                        widget.onChanged();
                      },
                    ),
                    const SizedBox(width: 8),
                    for (final category in widget.categories) ...[
                      ChoiceChip(
                        label: Text(category),
                        selected: _categoryFilter == category,
                        onSelected: (_) {
                          setState(() => _categoryFilter = category);
                          widget.onChanged();
                        },
                      ),
                      const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
            if (widget.categories.isNotEmpty) const SizedBox(height: 12),
            Expanded(
              child: filteredProducts.isEmpty
                  ? const Center(child: Text('No products found.'))
                  : GridView.builder(
                      gridDelegate:
                          const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 210,
                        mainAxisExtent: 238,
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                      ),
                      itemCount: filteredProducts.length,
                      itemBuilder: (context, index) {
                        final item = filteredProducts[index];
                        final imageUrl = resolveImageUrl(item.imageUrl);
                        return InkWell(
                          borderRadius: BorderRadius.circular(12),
                          onTap: item.isAvailable
                              ? () => widget.onTap(item)
                              : null,
                          child: Ink(
                            decoration: BoxDecoration(
                              color: item.isAvailable
                                  ? Colors.white
                                  : GimsColors.muted,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: GimsColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Expanded(
                                  child: imageUrl == null
                                      ? Container(
                                          color: GimsColors.muted
                                              .withValues(alpha: 0.18),
                                          child: Icon(
                                            item.productKind == 'RECIPE'
                                                ? Icons.restaurant_menu
                                                : Icons.inventory_2_outlined,
                                            size: 34,
                                            color: item.isAvailable
                                                ? GimsColors.primary
                                                : GimsColors.mutedForeground,
                                          ),
                                        )
                                      : Image.network(
                                          imageUrl,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) =>
                                              Container(
                                            color: GimsColors.muted
                                                .withValues(alpha: 0.18),
                                            child: Icon(
                                              item.productKind == 'RECIPE'
                                                  ? Icons.restaurant_menu
                                                  : Icons.inventory_2_outlined,
                                              size: 34,
                                              color: item.isAvailable
                                                  ? GimsColors.primary
                                                  : GimsColors.mutedForeground,
                                            ),
                                          ),
                                        ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      if ((item.category ?? '').isNotEmpty)
                                        Padding(
                                          padding:
                                              const EdgeInsets.only(bottom: 5),
                                          child: Text(
                                            item.category!,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color:
                                                  GimsColors.mutedForeground,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      Text(
                                        item.productName,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(formatMoney(item.price, 'IDR')),
                                      Text(
                                        item.productKind == 'STOCK'
                                            ? 'Stok ${item.stock.toStringAsFixed(0)}'
                                            : item.productKind,
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: GimsColors.mutedForeground,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
