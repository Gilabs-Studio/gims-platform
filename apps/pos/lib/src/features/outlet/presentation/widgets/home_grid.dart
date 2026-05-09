import 'package:flutter/material.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/models/user_session.dart';
import '../../domain/models/outlet.dart';

enum PosFeature {
  terminal(
    'Terminal',
    'Kasir POS dengan alur meja otomatis per outlet',
    Icons.point_of_sale_outlined,
  ),
  floor(
    'Floor Layout',
    'Edit canvas layout meja seperti versi web',
    Icons.grid_on_outlined,
  ),
  loyalty(
    'Loyalty',
    'Lookup member, enroll, poin, dan reward',
    Icons.loyalty_outlined,
  ),
  feedback(
    'Feedback',
    'Form feedback outlet dan rating pelanggan',
    Icons.rate_review_outlined,
  );

  const PosFeature(this.title, this.description, this.icon);

  final String title;
  final String description;
  final IconData icon;
}

class HomeGrid extends StatelessWidget {
  const HomeGrid({
    super.key,
    required this.outlet,
    required this.user,
    required this.onSelected,
  });

  final Outlet outlet;
  final UserSession? user;
  final ValueChanged<PosFeature> onSelected;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: CustomScrollView(
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
            sliver: SliverToBoxAdapter(
              child: _HomeHeader(outlet: outlet, user: user),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            sliver: SliverGrid.builder(
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 240,
                mainAxisExtent: 170,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: PosFeature.values.length,
              itemBuilder: (context, index) {
                final feature = PosFeature.values[index];
                return _HomeFeatureTile(
                  feature: feature,
                  onTap: () => onSelected(feature),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _HomeHeader extends StatelessWidget {
  const _HomeHeader({required this.outlet, required this.user});

  final Outlet outlet;
  final UserSession? user;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: GimsColors.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.storefront_outlined,
                color: GimsColors.primary,
                size: 30,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    outlet.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user == null
                        ? 'POS workspace'
                        : '${user!.name} · ${user!.roleName}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: GimsColors.mutedForeground),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeFeatureTile extends StatelessWidget {
  const _HomeFeatureTile({required this.feature, required this.onTap});

  final PosFeature feature;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: GimsColors.primary.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(feature.icon, color: GimsColors.primary),
              ),
              const Spacer(),
              Text(
                feature.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                feature.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: GimsColors.mutedForeground,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
