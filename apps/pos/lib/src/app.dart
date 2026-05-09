import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import 'core/api_client.dart';
import 'features/pos/floor_canvas.dart';
import 'features/pos/models.dart';
import 'features/pos/pos_repository.dart';
import 'theme/app_theme.dart';

class GimsPosApp extends StatefulWidget {
  const GimsPosApp({super.key});

  @override
  State<GimsPosApp> createState() => _GimsPosAppState();
}

class _GimsPosAppState extends State<GimsPosApp> {
  late final Future<void> _boot;
  late final PosRepository _repo;

  @override
  void initState() {
    super.initState();
    _boot = ApiClient.instance.init();
    _repo = PosRepository(ApiClient.instance);
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'GIMS POS',
      theme: buildGimsTheme(),
      home: FutureBuilder<void>(
        future: _boot,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            );
          }
          return AuthGate(repo: _repo);
        },
      ),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key, required this.repo});

  final PosRepository repo;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  UserSession? _user;
  bool _hasSession = false;

  @override
  void initState() {
    super.initState();
    _hasSession = ApiClient.instance.hasSession;
  }

  @override
  Widget build(BuildContext context) {
    if (_hasSession) {
      return PosShell(
        repo: widget.repo,
        user: _user,
        onLogout: () async {
          await widget.repo.logout();
          if (mounted) {
            setState(() {
              _user = null;
              _hasSession = false;
            });
          }
        },
      );
    }

    return LoginScreen(
      repo: widget.repo,
      onLoggedIn: (user) => setState(() {
        _user = user;
        _hasSession = true;
      }),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.repo, required this.onLoggedIn});

  final PosRepository repo;
  final ValueChanged<UserSession> onLoggedIn;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() => _loading = true);
    try {
      final user = await widget.repo.login(
        username: _username.text.trim(),
        password: _password.text,
      );
      widget.onLoggedIn(user);
    } catch (error) {
      if (mounted) {
        _showError(context, error);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.point_of_sale,
                        color: GimsColors.primary,
                        size: 42,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'GIMS POS Mobile',
                        style: Theme.of(context).textTheme.headlineSmall,
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Masuk dengan akun GIMS untuk membuka terminal, meja, layout, loyalty, dan feedback.',
                        style: TextStyle(color: GimsColors.mutedForeground),
                      ),
                      const SizedBox(height: 20),
                      TextField(
                        controller: _username,
                        decoration: const InputDecoration(
                          labelText: 'Username',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _password,
                        obscureText: true,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          prefixIcon: Icon(Icons.lock_outline),
                        ),
                        onSubmitted: (_) => _login(),
                      ),
                      const SizedBox(height: 18),
                      FilledButton.icon(
                        onPressed: _loading ? null : _login,
                        icon: _loading
                            ? const SizedBox.square(
                                dimension: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.login),
                        label: const Text('Masuk'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class PosShell extends StatefulWidget {
  const PosShell({
    super.key,
    required this.repo,
    required this.user,
    required this.onLogout,
  });

  final PosRepository repo;
  final UserSession? user;
  final Future<void> Function() onLogout;

  @override
  State<PosShell> createState() => _PosShellState();
}

class _PosShellState extends State<PosShell> {
  PosFeature? _feature;
  bool _loading = true;
  List<Outlet> _outlets = const [];
  Outlet? _selectedOutlet;

  @override
  void initState() {
    super.initState();
    _loadOutlets();
  }

  Future<void> _loadOutlets() async {
    setState(() => _loading = true);
    try {
      final outlets = await widget.repo.listOutlets();
      setState(() {
        _outlets = outlets;
        _selectedOutlet = outlets.isNotEmpty ? outlets.first : null;
      });
    } catch (error) {
      if (_isAuthError(error)) {
        if (mounted) {
          _showError(context, error);
          await widget.onLogout();
        }
        return;
      }
      if (mounted) {
        _showError(context, error);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final outlet = _selectedOutlet;
    return Scaffold(
      appBar: AppBar(
        leading: _feature == null
            ? null
            : IconButton(
                tooltip: 'Kembali',
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _feature = null),
              ),
        title: Text(_feature?.title ?? 'GIMS POS'),
        actions: [
          if (_outlets.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<Outlet>(
                  value: outlet,
                  borderRadius: BorderRadius.circular(8),
                  items: [
                    for (final item in _outlets)
                      DropdownMenuItem(value: item, child: Text(item.name)),
                  ],
                  onChanged: (value) => setState(() => _selectedOutlet = value),
                ),
              ),
            ),
          IconButton(
            tooltip: 'Refresh outlet',
            onPressed: _loadOutlets,
            icon: const Icon(Icons.refresh),
          ),
          IconButton(
            tooltip: 'Logout',
            onPressed: widget.onLogout,
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : outlet == null
          ? const EmptyState(
              icon: Icons.store_mall_directory_outlined,
              title: 'Outlet tidak tersedia',
              message: 'Akun ini belum memiliki outlet dalam scope POS.',
            )
          : _feature == null
          ? PosHomeGrid(
              outlet: outlet,
              user: widget.user,
              onSelected: (feature) => setState(() => _feature = feature),
            )
          : _FeatureView(feature: _feature!, repo: widget.repo, outlet: outlet),
    );
  }
}

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

class PosHomeGrid extends StatelessWidget {
  const PosHomeGrid({
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

class _FeatureView extends StatelessWidget {
  const _FeatureView({
    required this.feature,
    required this.repo,
    required this.outlet,
  });

  final PosFeature feature;
  final PosRepository repo;
  final Outlet outlet;

  @override
  Widget build(BuildContext context) {
    switch (feature) {
      case PosFeature.terminal:
        return UnifiedTerminalFlowScreen(repo: repo, outlet: outlet);
      case PosFeature.floor:
        return FloorEditorScreen(repo: repo, outlet: outlet);
      case PosFeature.loyalty:
        return LoyaltyScreen(repo: repo, outlet: outlet);
      case PosFeature.feedback:
        return FeedbackScreen(repo: repo, outlet: outlet);
    }
  }
}

class UnifiedTerminalFlowScreen extends StatefulWidget {
  const UnifiedTerminalFlowScreen({
    super.key,
    required this.repo,
    required this.outlet,
  });

  final PosRepository repo;
  final Outlet outlet;

  @override
  State<UnifiedTerminalFlowScreen> createState() =>
      _UnifiedTerminalFlowScreenState();
}

class _UnifiedTerminalFlowScreenState extends State<UnifiedTerminalFlowScreen> {
  bool _loading = true;
  bool _hasPublishedLayout = false;
  TableSelection? _selectedTable;

  @override
  void initState() {
    super.initState();
    _resolveOutletMode();
  }

  @override
  void didUpdateWidget(covariant UnifiedTerminalFlowScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.outlet.id != widget.outlet.id) {
      _selectedTable = null;
      _resolveOutletMode();
    }
  }

  Future<void> _resolveOutletMode() async {
    setState(() => _loading = true);
    try {
      final plans = await widget.repo.listFloorPlans(
        outletId: widget.outlet.id,
        status: 'published',
        perPage: 1,
      );
      if (!mounted) return;
      setState(() {
        _hasPublishedLayout = plans.isNotEmpty;
      });
    } catch (error) {
      if (mounted) {
        _showError(context, error);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (!_hasPublishedLayout) {
      return TerminalScreen(repo: widget.repo, outlet: widget.outlet);
    }

    final selectedTable = _selectedTable;
    if (selectedTable == null) {
      return LiveTableScreen(
        repo: widget.repo,
        outlet: widget.outlet,
        onSelectTable: (table) {
          setState(() => _selectedTable = table);
        },
      );
    }

    return TerminalScreen(
      repo: widget.repo,
      outlet: widget.outlet,
      selectedTable: selectedTable,
      onBackToLiveTable: () => setState(() => _selectedTable = null),
    );
  }
}

class TerminalScreen extends StatefulWidget {
  const TerminalScreen({
    super.key,
    required this.repo,
    required this.outlet,
    this.selectedTable,
    this.onBackToLiveTable,
  });

  final PosRepository repo;
  final Outlet outlet;
  final TableSelection? selectedTable;
  final VoidCallback? onBackToLiveTable;

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  final _customerName = TextEditingController();
  final _search = TextEditingController();
  List<CatalogItem> _catalog = const [];
  List<CartLine> _cart = [];
  PosOrder? _order;
  PosConfig? _config;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant TerminalScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.outlet.id != widget.outlet.id) _load();
  }

  @override
  void dispose() {
    _customerName.dispose();
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        widget.repo.getCatalog(widget.outlet.id),
        widget.repo.getConfig(widget.outlet.id),
      ]);
      setState(() {
        _catalog = results[0] as List<CatalogItem>;
        _config = results[1] as PosConfig?;
        _cart = [];
        _order = null;
      });
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _addToCart(CatalogItem product) {
    if (!product.isAvailable) return;
    final existing = _cart
        .where((line) => line.product.productId == product.productId)
        .firstOrNull;
    setState(() {
      if (existing == null) {
        _cart = [..._cart, CartLine(product: product)];
      } else {
        existing.quantity += 1;
      }
    });
  }

  Future<void> _openOrder() async {
    if (_cart.isEmpty) return;
    setState(() => _loading = true);
    try {
      final selectedTable = widget.selectedTable;
      var order = await widget.repo.createOrder(
        outletId: widget.outlet.id,
        orderType: selectedTable == null ? 'TAKE_AWAY' : 'DINE_IN',
        tableId: selectedTable?.id,
        tableLabel: selectedTable?.label,
        guestCount: selectedTable?.seatCount ?? 1,
        customerName: _customerName.text,
      );
      for (final line in _cart) {
        order = await widget.repo.addItem(order.id, line);
      }
      order = await widget.repo.confirmOrder(order.id);
      setState(() {
        _order = order;
        _cart = [];
      });
      if (!mounted) return;
      final checkoutResult = await showModalBottomSheet<_CheckoutResult>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        showDragHandle: true,
        backgroundColor: Theme.of(context).colorScheme.surface,
        builder: (context) => _CheckoutFlowSheet(
          repo: widget.repo,
          order: order,
          config: _config,
          selectedTable: selectedTable,
          outletId: widget.outlet.id,
        ),
      );
      if (checkoutResult != null && mounted) {
        handleOrderCompleted(
          checkoutResult.customerName,
          checkoutResult.tenderAmount,
        );
      }
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void handleOrderCompleted(
    String? customerName,
    double? tenderAmount,
  ) {
    if (customerName != null && customerName.isNotEmpty) {
      _customerName.text = customerName;
    }
    if (tenderAmount != null) {
      // Tender amount is already reflected in the payment confirmation state.
    }
    setState(() {
      _cart = [];
    });
  }

  @override
  Widget build(BuildContext context) {
    final query = _search.text.trim().toLowerCase();
    final products = query.isEmpty
        ? _catalog
        : _catalog
              .where(
                (p) =>
                    p.productName.toLowerCase().contains(query) ||
                    p.productCode.toLowerCase().contains(query),
              )
              .toList();
    final total = _cart.fold<double>(0, (sum, line) => sum + line.subtotal);

    if (_loading) return const Center(child: CircularProgressIndicator());

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= 760;
        final selectedTable = widget.selectedTable;
        final catalog = _CatalogPanel(
          search: _search,
          products: products,
          categories: _catalog
              .map((item) => item.category?.trim())
              .whereType<String>()
              .where((value) => value.isNotEmpty)
              .toSet()
              .toList()
            ..sort(),
          onChanged: () => setState(() {}),
          onTap: _addToCart,
        );
        final cart = _CartPanel(
          currency: _config?.currency ?? 'IDR',
          cart: _cart,
          order: _order,
          customerName: _customerName,
          total: total,
          onQtyChanged: (line, qty) => setState(() => line.quantity = qty),
          onRemove: (line) => setState(
            () => _cart = _cart.where((item) => item != line).toList(),
          ),
          onOpenOrder: _openOrder,
          onReceipt: _order == null
              ? null
              : () => _openExternal(widget.repo.receiptUrl(_order!.id)),
          onWhatsApp: _order == null
              ? null
              : () => _shareWhatsApp(_order!, _config?.receiptWhatsAppTemplate),
        );

        return Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              if (selectedTable != null)
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.table_bar_outlined),
                    title: Text('Meja ${selectedTable.label}'),
                    subtitle: Text(
                      selectedTable.seatCount > 0
                          ? 'Dine in • ${selectedTable.seatCount} kursi'
                          : 'Dine in',
                    ),
                    trailing: widget.onBackToLiveTable == null
                        ? null
                        : OutlinedButton.icon(
                            onPressed: widget.onBackToLiveTable,
                            icon: const Icon(Icons.arrow_back),
                            label: const Text('Kembali ke Live Table'),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: GimsColors.border),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                  ),
                ),
              if (selectedTable != null) const SizedBox(height: 12),
              Expanded(
                child: wide
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(flex: 7, child: catalog),
                          const SizedBox(width: 12),
                          SizedBox(width: 360, child: cart),
                        ],
                      )
                    : Column(
                        children: [
                          Expanded(child: catalog),
                          const SizedBox(height: 12),
                          SizedBox(height: 330, child: cart),
                        ],
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _shareWhatsApp(PosOrder order, String? template) async {
    final receipt = widget.repo.receiptUrl(order.id);
    final text = (template == null || template.trim().isEmpty)
        ? 'Terima kasih. Nota pesanan ${order.orderNumber}: $receipt'
        : template
              .replaceAll('{{order_number}}', order.orderNumber)
              .replaceAll('{{receipt_url}}', receipt)
              .replaceAll(
                '{{total_amount}}',
                formatMoney(order.totalAmount, _config?.currency ?? 'IDR'),
              );
    await _openExternal('https://wa.me/?text=${Uri.encodeComponent(text)}');
  }
}

class _CatalogPanel extends StatefulWidget {
  const _CatalogPanel({
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
  State<_CatalogPanel> createState() => _CatalogPanelState();
}

class _CatalogPanelState extends State<_CatalogPanel> {
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
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
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
                          onTap: item.isAvailable ? () => widget.onTap(item) : null,
                          child: Ink(
                            decoration: BoxDecoration(
                              color: item.isAvailable ? Colors.white : GimsColors.muted,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: GimsColors.border),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Expanded(
                                  child: imageUrl == null
                                      ? Container(
                                          color: GimsColors.muted.withValues(alpha: 0.18),
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
                                          errorBuilder: (_, __, ___) => Container(
                                            color: GimsColors.muted.withValues(alpha: 0.18),
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
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if ((item.category ?? '').isNotEmpty)
                                        Padding(
                                          padding: const EdgeInsets.only(bottom: 5),
                                          child: Text(
                                            item.category!,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color: GimsColors.mutedForeground,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      Text(
                                        item.productName,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(fontWeight: FontWeight.w600),
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

class _CartPanel extends StatelessWidget {
  const _CartPanel({
    required this.currency,
    required this.cart,
    required this.order,
    required this.customerName,
    required this.total,
    required this.onQtyChanged,
    required this.onRemove,
    required this.onOpenOrder,
    required this.onReceipt,
    required this.onWhatsApp,
  });

  final String currency;
  final List<CartLine> cart;
  final PosOrder? order;
  final TextEditingController customerName;
  final double total;
  final void Function(CartLine line, double qty) onQtyChanged;
  final ValueChanged<CartLine> onRemove;
  final VoidCallback onOpenOrder;
  final VoidCallback? onReceipt;
  final VoidCallback? onWhatsApp;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.hardEdge,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Order',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                  ),
                ),
                if (order != null) Chip(label: Text(order!.status.value)),
              ],
            ),
            const SizedBox(height: 10),
            TextField(
              controller: customerName,
              decoration: const InputDecoration(
                labelText: 'Customer / member',
                prefixIcon: Icon(Icons.person_outline),
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: cart.isEmpty && order == null
                  ? const Center(child: Text('Keranjang kosong'))
                  : ListView(
                      children: [
                        for (final line in cart)
                          _CartItemRow(
                            line: line,
                            currency: currency,
                            onQtyChanged: onQtyChanged,
                            onRemove: onRemove,
                          ),
                        if (order != null)
                          for (final item in order!.items)
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(item.productName),
                              subtitle: Text(
                                '${item.status} x ${item.quantity.toStringAsFixed(0)}',
                              ),
                              trailing: Text(
                                formatMoney(item.subtotal, currency),
                              ),
                            ),
                      ],
                    ),
            ),
            const Divider(),
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Total',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
                Text(
                  formatMoney(order?.totalAmount ?? total, currency),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (order == null)
              FilledButton.icon(
                onPressed: cart.isEmpty ? null : onOpenOrder,
                icon: const Icon(Icons.lock_outline),
                label: const Text('Confirm order'),
              )
            else
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  OutlinedButton.icon(
                    onPressed: onReceipt,
                    icon: const Icon(Icons.receipt_long),
                    label: const Text('Nota'),
                  ),
                  OutlinedButton.icon(
                    onPressed: onWhatsApp,
                    icon: const Icon(Icons.send_outlined),
                    label: const Text('WA'),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _CartItemRow extends StatelessWidget {
  const _CartItemRow({
    required this.line,
    required this.currency,
    required this.onQtyChanged,
    required this.onRemove,
  });

  final CartLine line;
  final String currency;
  final void Function(CartLine line, double qty) onQtyChanged;
  final ValueChanged<CartLine> onRemove;

  @override
  Widget build(BuildContext context) {
    final imageUrl = resolveImageUrl(line.product.imageUrl);
    final fallbackIcon = line.product.productKind == 'STOCK'
        ? Icons.inventory_2_outlined
        : Icons.restaurant_menu;

    return Dismissible(
      key: ValueKey(line.product.productId),
      direction: DismissDirection.endToStart,
      background: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        decoration: BoxDecoration(
          color: GimsColors.destructive.withValues(alpha: 0.92),
          borderRadius: BorderRadius.circular(12),
        ),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      onDismissed: (_) => onRemove(line),
      child: Card(
        margin: const EdgeInsets.symmetric(vertical: 4),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: 52,
                  height: 52,
                  color: GimsColors.muted.withValues(alpha: 0.2),
                  child: imageUrl == null
                      ? Icon(fallbackIcon, color: GimsColors.mutedForeground)
                      : Image.network(
                          imageUrl,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Icon(
                            fallbackIcon,
                            color: GimsColors.mutedForeground,
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      line.product.productName,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      formatMoney(line.product.price, currency),
                      style: const TextStyle(color: GimsColors.mutedForeground),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    onPressed: () {
                      final nextQty = line.quantity - 1;
                      if (nextQty <= 0) {
                        onRemove(line);
                        return;
                      }
                      onQtyChanged(line, nextQty);
                    },
                    icon: const Icon(Icons.remove_circle_outline),
                  ),
                  Text(
                    line.quantity.toStringAsFixed(0),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    onPressed: () => onQtyChanged(line, line.quantity + 1),
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String? resolveImageUrl(String? value) {
  final trimmed = value?.trim();
  if (trimmed == null || trimmed.isEmpty) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return '${ApiClient.instance.apiOrigin}$trimmed';
  }
  return trimmed;
}

class _CheckoutResult {
  const _CheckoutResult({
    required this.customerName,
    this.tenderAmount,
  });

  final String? customerName;
  final double? tenderAmount;
}

class _CheckoutFlowSheet extends StatefulWidget {
  const _CheckoutFlowSheet({
    required this.repo,
    required this.order,
    required this.config,
    required this.selectedTable,
    required this.outletId,
  });

  final PosRepository repo;
  final PosOrder order;
  final PosConfig? config;
  final TableSelection? selectedTable;
  final String outletId;

  @override
  State<_CheckoutFlowSheet> createState() => _CheckoutFlowSheetState();
}

class _CheckoutFlowSheetState extends State<_CheckoutFlowSheet> {
  final _customerName = TextEditingController();
  final _customerPhone = TextEditingController();
  final _memberSearch = TextEditingController();
  final _tender = TextEditingController();

  bool _existingCustomer = false;
  bool _loading = false;
  int _step = 0;
  LoyaltyMemberLookup? _memberLookup;
  LoyaltyReward? _selectedReward;

  @override
  void dispose() {
    _customerName.dispose();
    _customerPhone.dispose();
    _memberSearch.dispose();
    _tender.dispose();
    super.dispose();
  }

  double get _orderTotal => widget.order.totalAmount;

  String get _displayCustomerName {
    if (_existingCustomer && _memberLookup?.customerName != null && _memberLookup!.customerName!.isNotEmpty) {
      return _memberLookup!.customerName!;
    }
    return _customerName.text.trim();
  }

  Future<void> _lookupMember() async {
    final query = _memberSearch.text.trim();
    if (query.isEmpty) return;
    setState(() => _loading = true);
    try {
      final lookup = await widget.repo.lookupMember(
        name: query,
        outletId: widget.outletId,
      );
      setState(() {
        _memberLookup = lookup;
        _selectedReward = null;
        if (lookup.found && lookup.customerName != null && lookup.customerName!.isNotEmpty) {
          _customerName.text = lookup.customerName!;
        }
        if (lookup.availableRewards.isNotEmpty) {
          _step = 1;
        } else {
          _step = 2;
        }
      });
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _continueFromCustomerStep() {
    if (_existingCustomer) {
      if (_memberLookup == null) {
        if (_memberSearch.text.trim().isEmpty) {
          _showError(context, ApiException('Masukkan nama member terlebih dahulu'));
          return;
        }
        _lookupMember();
        return;
      }
      setState(() => _step = _memberLookup!.availableRewards.isNotEmpty ? 1 : 2);
      return;
    }

    if (_customerName.text.trim().isEmpty) {
      _showError(context, ApiException('Masukkan nama customer terlebih dahulu'));
      return;
    }
    setState(() => _step = 2);
  }

  Future<void> _payCash() async {
    final tenderValue = double.tryParse(_tender.text.replaceAll(RegExp(r'[^0-9.]'), '')) ?? _orderTotal;
    if (tenderValue < _orderTotal) {
      _showError(context, ApiException('Nominal cash kurang dari total pembayaran'));
      return;
    }

    setState(() => _loading = true);
    try {
      await widget.repo.processCash(
        widget.order.id,
        amount: tenderValue,
        customerName: _displayCustomerName.isEmpty ? null : _displayCustomerName,
        loyaltyMemberId: _memberLookup?.memberId,
        loyaltyRewardId: _selectedReward?.id,
      );
      if (!mounted) return;
      Navigator.of(context).pop(
        _CheckoutResult(
          customerName: _displayCustomerName.isEmpty ? null : _displayCustomerName,
          tenderAmount: tenderValue,
        ),
      );
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _payDigital() async {
    setState(() => _loading = true);
    try {
      final payment = await widget.repo.initiateDigital(
        widget.order.id,
        amount: _orderTotal,
        channelCode: 'QRIS',
        customerName: _displayCustomerName.isEmpty ? null : _displayCustomerName,
        loyaltyMemberId: _memberLookup?.memberId,
        loyaltyRewardId: _selectedReward?.id,
      );
      if (payment.paymentUrl != null && payment.paymentUrl!.isNotEmpty) {
        await _openExternal(payment.paymentUrl!);
      }
      if (!mounted) return;
      Navigator.of(context).pop(
        _CheckoutResult(
          customerName: _displayCustomerName.isEmpty ? null : _displayCustomerName,
        ),
      );
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final rewards = _memberLookup?.availableRewards ?? const <LoyaltyReward>[];
    final keyboardInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: keyboardInset),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    const Icon(Icons.receipt_long, color: GimsColors.primary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Checkout ${widget.order.orderNumber}',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.selectedTable == null
                                ? 'Take away'
                                : 'Meja ${widget.selectedTable!.label}',
                            style: const TextStyle(color: GimsColors.mutedForeground),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      formatMoney(_orderTotal, widget.config?.currency ?? 'IDR'),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            if (_step == 0) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      SegmentedButton<bool>(
                        segments: const [
                          ButtonSegment<bool>(value: false, label: Text('Customer Baru'), icon: Icon(Icons.person_outline)),
                          ButtonSegment<bool>(value: true, label: Text('Member'), icon: Icon(Icons.loyalty_outlined)),
                        ],
                        selected: {_existingCustomer},
                        onSelectionChanged: (selection) {
                          setState(() {
                            _existingCustomer = selection.first;
                            _memberLookup = null;
                            _selectedReward = null;
                          });
                        },
                      ),
                      const SizedBox(height: 12),
                      if (_existingCustomer) ...[
                        TextField(
                          controller: _memberSearch,
                          decoration: const InputDecoration(
                            labelText: 'Cari nama member',
                            prefixIcon: Icon(Icons.search),
                          ),
                          onSubmitted: (_) => _lookupMember(),
                        ),
                        const SizedBox(height: 10),
                        FilledButton.icon(
                          onPressed: _loading ? null : _lookupMember,
                          icon: _loading
                              ? const SizedBox.square(
                                  dimension: 16,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.search),
                          label: const Text('Cari Member'),
                        ),
                        if (_memberLookup != null) ...[
                          const SizedBox(height: 12),
                          Card(
                            child: ListTile(
                              leading: Icon(
                                _memberLookup!.found ? Icons.verified_outlined : Icons.info_outline,
                              ),
                              title: Text(_memberLookup!.customerName ?? 'Member'),
                              subtitle: Text(
                                '${_memberLookup!.currentTier ?? '-'} · ${_memberLookup!.pointBalance.toStringAsFixed(0)} poin',
                              ),
                            ),
                          ),
                        ],
                      ] else ...[
                        TextField(
                          controller: _customerName,
                          decoration: const InputDecoration(
                            labelText: 'Nama customer',
                            prefixIcon: Icon(Icons.person_outline),
                          ),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _customerPhone,
                          decoration: const InputDecoration(
                            labelText: 'No. telepon (opsional)',
                            prefixIcon: Icon(Icons.phone_outlined),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _loading ? null : _continueFromCustomerStep,
                child: Text(rewards.isNotEmpty && _existingCustomer ? 'Lanjut ke Kupon' : 'Lanjut ke Pembayaran'),
              ),
            ] else if (_step == 1) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Redeem Kupon',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Pilih reward yang berlaku untuk member ini.',
                        style: TextStyle(color: GimsColors.mutedForeground.withValues(alpha: 0.9)),
                      ),
                      const SizedBox(height: 10),
                      for (final reward in rewards)
                        Card(
                          child: RadioListTile<LoyaltyReward>(
                            value: reward,
                            groupValue: _selectedReward,
                            onChanged: (value) => setState(() => _selectedReward = value),
                            title: Text(reward.name),
                            subtitle: Text('${reward.type} · ${reward.pointsRequired.toStringAsFixed(0)} poin'),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _loading
                          ? null
                          : () => setState(() => _step = 0),
                      child: const Text('Kembali'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton(
                      onPressed: _loading ? null : () => setState(() => _step = 2),
                      child: const Text('Lanjut ke Pembayaran'),
                    ),
                  ),
                ],
              ),
            ] else ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Pembayaran',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _tender,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: 'Nominal cash',
                          helperText: formatMoney(_orderTotal, widget.config?.currency ?? 'IDR'),
                          prefixIcon: const Icon(Icons.payments_outlined),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          FilledButton.icon(
                            onPressed: _loading ? null : _payCash,
                            icon: const Icon(Icons.payments_outlined),
                            label: const Text('Cash'),
                          ),
                          FilledButton.icon(
                            onPressed: _loading ? null : _payDigital,
                            icon: const Icon(Icons.qr_code_2),
                            label: const Text('Xendit'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _loading ? null : () => setState(() => _step = _memberLookup?.availableRewards.isNotEmpty == true ? 1 : 0),
                      child: const Text('Kembali'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _loading ? null : () => Navigator.of(context).pop(),
                      child: const Text('Batal'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class LiveTableScreen extends StatefulWidget {
  const LiveTableScreen({
    super.key,
    required this.repo,
    required this.outlet,
    this.onSelectTable,
  });

  final PosRepository repo;
  final Outlet outlet;
  final ValueChanged<TableSelection>? onSelectTable;

  @override
  State<LiveTableScreen> createState() => _LiveTableScreenState();
}

class _LiveTableScreenState extends State<LiveTableScreen> {
  Timer? _timer;
  Timer? _clockTimer;
  FloorPlan? _plan;
  List<PosOrder> _orders = const [];
  DateTime _now = DateTime.now();
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(
      const Duration(seconds: 15),
      (_) => _load(silent: true),
    );
    _clockTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) {
        if (!mounted) return;
        setState(() => _now = DateTime.now());
      },
    );
  }

  @override
  void didUpdateWidget(covariant LiveTableScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.outlet.id != widget.outlet.id) _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _clockTimer?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final plans = await widget.repo.listFloorPlans(
        outletId: widget.outlet.id,
        status: 'published',
      );
      final orders = await widget.repo.listOrders(outletId: widget.outlet.id);
      FloorPlan? plan = plans.isEmpty
          ? null
          : await widget.repo.getFloorPlan(plans.first.id);
      setState(() {
        _plan = plan;
        _orders = orders;
        _now = DateTime.now();
      });
    } catch (error) {
      if (mounted && !silent) _showError(context, error);
    } finally {
      if (mounted && !silent) setState(() => _loading = false);
    }
  }

  List<LiveTableInfo> _liveTables() {
    final plan = _plan;
    if (plan == null) return const [];
    final seatCounts = <String, int>{};
    for (final object in plan.objects) {
      if (object.isChair && object.parentId != null) {
        seatCounts[object.parentId!] = (seatCounts[object.parentId!] ?? 0) + 1;
      }
    }
    final active = <String, PosOrder>{};
    for (final order in _orders) {
      if (order.tableLabel == null) continue;
      if (!{
        PosOrderStatus.paid,
        PosOrderStatus.partialServed,
        PosOrderStatus.served,
      }.contains(order.status)) {
        continue;
      }
      final existing = active[order.tableLabel!];
      if (existing == null || order.createdAt.isAfter(existing.createdAt)) {
        active[order.tableLabel!] = order;
      }
    }

    return plan.objects.where((object) => object.isTable).map((table) {
      final label = table.label ?? table.tableNumber?.toString() ?? table.id;
      final order = active[label];
      final duration = order == null
          ? Duration.zero
          : _now.difference(order.createdAt);
      String status = 'AVAILABLE';
      if (order != null) {
        if (order.status == PosOrderStatus.partialServed) {
          status = 'PARTIAL_SERVED';
        } else if (order.status == PosOrderStatus.served) {
          status = 'SERVED';
        } else {
          status = duration.inMinutes > 30 ? 'WARN_LONG' : 'SEATED';
        }
      }
      return LiveTableInfo(
        table: table,
        seatCount: seatCounts[table.id] ?? table.capacity ?? 0,
        status: status,
        duration: duration,
        order: order,
      );
    }).toList();
  }

  Future<void> _tapTable(LiveTableInfo info) async {
    if (info.order == null) {
      final onSelectTable = widget.onSelectTable;
      if (onSelectTable != null) {
        onSelectTable(
          TableSelection(
            id: info.table.id,
            label:
                info.table.label ??
                info.table.tableNumber?.toString() ??
                info.table.id,
            seatCount: info.seatCount,
          ),
        );
        return;
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pilih meja dari flow Terminal.')),
        );
      }
      return;
    }

    final order = info.order!;
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '${info.table.label ?? info.table.id} · ${order.orderNumber}',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Text(
              'Status ${order.status.value}',
            ),
            Text(
              'Mulai ${DateFormat('HH:mm').format(order.createdAt)} · tunggu ${formatDuration(info.duration)}',
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.icon(
                  onPressed: () async {
                    Navigator.pop(context);
                    await widget.repo.serveOrder(order.id);
                    await _load();
                  },
                  icon: const Icon(Icons.room_service_outlined),
                  label: const Text('Sajikan'),
                ),
                FilledButton.icon(
                  onPressed: () async {
                    Navigator.pop(context);
                    await widget.repo.completeOrder(order.id);
                    await _load();
                  },
                  icon: const Icon(Icons.check_circle_outline),
                  label: const Text('Selesai'),
                ),
                OutlinedButton.icon(
                  onPressed: () =>
                      _openExternal(widget.repo.receiptUrl(order.id)),
                  icon: const Icon(Icons.receipt_long),
                  label: const Text('Nota'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    final plan = _plan;
    if (plan == null) {
      return const EmptyState(
        icon: Icons.table_bar_outlined,
        title: 'Belum ada published floor layout',
        message:
            'Publish layout outlet ini dari tab Floor agar Live Table aktif.',
      );
    }
    final liveTables = _liveTables();
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          _StatusLegend(onRefresh: _load),
          const SizedBox(height: 12),
          Expanded(
            child: Card(
              clipBehavior: Clip.antiAlias,
              child: FloorCanvas(
                objects: plan.objects,
                width: plan.width,
                height: plan.height,
                liveTables: liveTables,
                onSelect: (table) {
                  final info = liveTables.firstWhere(
                    (item) => item.table.id == table.id,
                  );
                  _tapTable(info);
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class FloorEditorScreen extends StatefulWidget {
  const FloorEditorScreen({
    super.key,
    required this.repo,
    required this.outlet,
  });

  final PosRepository repo;
  final Outlet outlet;

  @override
  State<FloorEditorScreen> createState() => _FloorEditorScreenState();
}

class TableSelection {
  const TableSelection({
    required this.id,
    required this.label,
    required this.seatCount,
  });

  final String id;
  final String label;
  final int seatCount;
}

class _FloorEditorScreenState extends State<FloorEditorScreen> {
  List<FloorPlan> _plans = const [];
  FloorPlan? _plan;
  String? _selectedId;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant FloorEditorScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.outlet.id != widget.outlet.id) _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final plans = await widget.repo.listFloorPlans(
        outletId: widget.outlet.id,
      );
      final plan = plans.isEmpty
          ? null
          : await widget.repo.getFloorPlan(plans.first.id);
      setState(() {
        _plans = plans;
        _plan = plan;
        _selectedId = null;
      });
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _addObject(String type) {
    final plan = _plan;
    if (plan == null) return;
    final count =
        plan.objects.where((object) => object.type == type).length + 1;
    final object = LayoutObject(
      id: '${type}_${DateTime.now().microsecondsSinceEpoch}',
      type: type,
      x: 40 + count * 8,
      y: 40 + count * 8,
      width: type == 'wall' ? 140 : 82,
      height: type == 'wall' ? 18 : 64,
      label: type == 'table' ? 'T$count' : type,
      tableNumber: type == 'table' ? count : null,
      tableShape: type == 'table' ? 'rectangle' : null,
      capacity: type == 'table' ? 4 : null,
    );
    setState(() {
      plan.objects.add(object);
      _selectedId = object.id;
    });
  }

  Future<void> _save() async {
    final plan = _plan;
    if (plan == null) return;
    try {
      final saved = await widget.repo.saveFloorLayout(plan);
      setState(() => _plan = saved);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Layout tersimpan')));
      }
    } catch (error) {
      if (mounted) _showError(context, error);
    }
  }

  Future<void> _publish() async {
    final plan = _plan;
    if (plan == null) return;
    try {
      final saved = await widget.repo.publishFloorPlan(plan.id);
      setState(() => _plan = saved);
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Layout dipublish')));
      }
    } catch (error) {
      if (mounted) _showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    final plan = _plan;
    if (plan == null) {
      return const EmptyState(
        icon: Icons.grid_off_outlined,
        title: 'Floor plan belum ada',
        message:
            'Buat floor plan pertama dari web, lalu editor mobile bisa memodifikasi canvas-nya.',
      );
    }

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Row(
                children: [
                  Expanded(
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<FloorPlan>(
                        value: _plans.any((item) => item.id == plan.id)
                            ? _plans.firstWhere((item) => item.id == plan.id)
                            : null,
                        items: [
                          for (final item in _plans)
                            DropdownMenuItem(
                              value: item,
                              child: Text('${item.name} · ${item.status}'),
                            ),
                        ],
                        onChanged: (value) async {
                          if (value == null) return;
                          final detail = await widget.repo.getFloorPlan(
                            value.id,
                          );
                          setState(() => _plan = detail);
                        },
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => _addObject('table'),
                    icon: const Icon(Icons.table_bar_outlined),
                    tooltip: 'Table',
                  ),
                  IconButton(
                    onPressed: () => _addObject('chair'),
                    icon: const Icon(Icons.chair_outlined),
                    tooltip: 'Chair',
                  ),
                  IconButton(
                    onPressed: () => _addObject('wall'),
                    icon: const Icon(Icons.horizontal_rule),
                    tooltip: 'Wall',
                  ),
                  IconButton(
                    onPressed: () => _addObject('cashier'),
                    icon: const Icon(Icons.point_of_sale),
                    tooltip: 'Cashier',
                  ),
                  FilledButton.icon(
                    onPressed: _save,
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Save'),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    onPressed: _publish,
                    icon: const Icon(Icons.publish_outlined),
                    label: const Text('Publish'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: Card(
              clipBehavior: Clip.antiAlias,
              child: FloorCanvas(
                objects: plan.objects,
                width: plan.width,
                height: plan.height,
                selectedId: _selectedId,
                onSelect: (object) => setState(() => _selectedId = object.id),
                onMove: (object, delta) => setState(() {
                  object.x = (object.x + delta.dx).clamp(
                    0,
                    plan.width - object.width,
                  );
                  object.y = (object.y + delta.dy).clamp(
                    0,
                    plan.height - object.height,
                  );
                }),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class LoyaltyScreen extends StatefulWidget {
  const LoyaltyScreen({super.key, required this.repo, required this.outlet});

  final PosRepository repo;
  final Outlet outlet;

  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  LoyaltyMemberLookup? _member;
  bool _loading = false;

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _lookup() async {
    if (_name.text.trim().isEmpty) return;
    setState(() => _loading = true);
    try {
      final member = await widget.repo.lookupMember(
        name: _name.text,
        outletId: widget.outlet.id,
      );
      setState(() => _member = member);
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _enroll() async {
    setState(() => _loading = true);
    try {
      final member = await widget.repo.enrollMember(
        name: _name.text,
        phone: _phone.text,
        outletId: widget.outlet.id,
      );
      setState(() => _member = member);
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final member = _member;
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Loyalty Member',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Nama member'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _phone,
                decoration: const InputDecoration(labelText: 'Telepon'),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                children: [
                  FilledButton.icon(
                    onPressed: _loading ? null : _lookup,
                    icon: const Icon(Icons.search),
                    label: const Text('Lookup'),
                  ),
                  OutlinedButton.icon(
                    onPressed: _loading ? null : _enroll,
                    icon: const Icon(Icons.person_add_alt_1),
                    label: const Text('Enroll'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (_loading) const LinearProgressIndicator(),
              if (member != null)
                Expanded(
                  child: ListView(
                    children: [
                      ListTile(
                        leading: Icon(
                          member.found
                              ? Icons.verified_outlined
                              : Icons.info_outline,
                        ),
                        title: Text(
                          member.found
                              ? member.customerName ?? 'Member'
                              : 'Member tidak ditemukan',
                        ),
                        subtitle: Text(
                          'Tier ${member.currentTier ?? '-'} · ${member.pointBalance.toStringAsFixed(0)} poin',
                        ),
                      ),
                      for (final reward in member.availableRewards)
                        ListTile(
                          leading: const Icon(Icons.card_giftcard),
                          title: Text(reward.name),
                          subtitle: Text(
                            '${reward.pointsRequired.toStringAsFixed(0)} poin · ${reward.type}',
                          ),
                          trailing: Text(reward.value.toStringAsFixed(0)),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key, required this.repo, required this.outlet});

  final PosRepository repo;
  final Outlet outlet;

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  final _title = TextEditingController(text: 'Feedback Outlet');
  List<FeedbackForm> _forms = const [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didUpdateWidget(covariant FeedbackScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.outlet.id != widget.outlet.id) _load();
  }

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final forms = await widget.repo.listFeedbackForms(
        outletId: widget.outlet.id,
      );
      setState(() => _forms = forms);
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    try {
      await widget.repo.createQuickFeedbackForm(
        outletId: widget.outlet.id,
        title: _title.text,
      );
      await _load();
    } catch (error) {
      if (mounted) _showError(context, error);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    return Padding(
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _title,
                      decoration: const InputDecoration(
                        labelText: 'Judul form',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: _create,
                    icon: const Icon(Icons.add),
                    label: const Text('Form'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: _forms.isEmpty
                ? const EmptyState(
                    icon: Icons.rate_review_outlined,
                    title: 'Form feedback kosong',
                    message:
                        'Buat form singkat atau kelola detailnya dari web.',
                  )
                : ListView.separated(
                    itemCount: _forms.length,
                    separatorBuilder: (context, index) =>
                        const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final form = _forms[index];
                      return Card(
                        child: ListTile(
                          leading: Icon(
                            form.isActive ? Icons.toggle_on : Icons.toggle_off,
                          ),
                          title: Text(form.title),
                          subtitle: Text(form.description ?? form.outletId),
                          trailing: Chip(
                            label: Text(form.isActive ? 'active' : 'inactive'),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _StatusLegend extends StatelessWidget {
  const _StatusLegend({required this.onRefresh});

  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            const Expanded(
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _LegendDot(color: Colors.white, label: 'Available'),
                  _LegendDot(color: Color(0xffdbeafe), label: 'Seated'),
                  _LegendDot(color: Color(0xffffedd5), label: '>30m'),
                  _LegendDot(color: Color(0xfffef3c7), label: 'Partial'),
                  _LegendDot(color: Color(0xffdcfce7), label: 'Served'),
                ],
              ),
            ),
            IconButton(onPressed: onRefresh, icon: const Icon(Icons.refresh)),
          ],
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: color,
            border: Border.all(color: GimsColors.border),
            borderRadius: BorderRadius.circular(3),
          ),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 42, color: GimsColors.mutedForeground),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 6),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: GimsColors.mutedForeground),
            ),
          ],
        ),
      ),
    );
  }
}

extension FirstOrNullExtension<T> on Iterable<T> {
  T? get firstOrNull {
    final iterator = this.iterator;
    if (iterator.moveNext()) return iterator.current;
    return null;
  }
}

String formatMoney(double amount, String currency) {
  final formatter = NumberFormat.currency(
    locale: 'id_ID',
    symbol: currency == 'IDR' ? 'Rp ' : '$currency ',
    decimalDigits: 0,
  );
  return formatter.format(amount);
}

String formatDuration(Duration duration) {
  if (duration.inHours > 0) {
    return '${duration.inHours}j ${duration.inMinutes.remainder(60)}m';
  }
  return '${duration.inMinutes}m';
}

Future<void> _openExternal(String value) async {
  final uri = Uri.parse(value);
  await launchUrl(uri, mode: LaunchMode.externalApplication);
}

void _showError(BuildContext context, Object error) {
  final message = error is ApiException ? error.message : error.toString();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message), backgroundColor: GimsColors.destructive),
  );
}

bool _isAuthError(Object error) {
  return error is ApiException &&
      (error.statusCode == 401 ||
          error.code == 'UNAUTHORIZED' ||
          error.code == 'TOKEN_EXPIRED' ||
          error.code == 'TOKEN_INVALID');
}
