import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';

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
    'Response feedback pelanggan per outlet',
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
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
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
          SliverToBoxAdapter(
            child: FutureBuilder<PackageInfo>(
              future: PackageInfo.fromPlatform(),
              builder: (context, snapshot) {
                if (snapshot.hasData) {
                  final info = snapshot.data!;
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Text(
                      'Versi ${info.version}+${info.buildNumber}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: GimsColors.mutedForeground,
                        fontSize: 12,
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
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

  final Outlet outlet; // Kept for API compatibility, but unused in UI to avoid duplication.
  final UserSession? user;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Welcome back,',
            style: TextStyle(
              color: GimsColors.mutedForeground,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            user == null ? 'Cashier' : user!.name,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (user?.roleName != null && user!.roleName.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              user!.roleName,
              style: const TextStyle(
                color: GimsColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
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
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: GimsColors.border.withValues(alpha: 0.5),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(feature.icon, color: GimsColors.primary, size: 32),
              const SizedBox(height: 16),
              Text(
                feature.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 8),
              Flexible(
                child: Text(
                  feature.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: GimsColors.mutedForeground,
                    fontSize: 13,
                    height: 1.3,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
