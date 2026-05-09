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
    'Katalog, cart, checkout, nota, dan WhatsApp',
    Icons.point_of_sale_outlined,
  ),
  liveTable(
    'Live Table',
    'Meja, sajikan, waktu tunggu, dan status order',
    Icons.table_bar_outlined,
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
        return TerminalScreen(repo: repo, outlet: outlet);
      case PosFeature.liveTable:
        return LiveTableScreen(repo: repo, outlet: outlet);
      case PosFeature.floor:
        return FloorEditorScreen(repo: repo, outlet: outlet);
      case PosFeature.loyalty:
        return LoyaltyScreen(repo: repo, outlet: outlet);
      case PosFeature.feedback:
        return FeedbackScreen(repo: repo, outlet: outlet);
    }
  }
}

class TerminalScreen extends StatefulWidget {
  const TerminalScreen({super.key, required this.repo, required this.outlet});

  final PosRepository repo;
  final Outlet outlet;

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
      var order = await widget.repo.createOrder(
        outletId: widget.outlet.id,
        orderType: 'TAKE_AWAY',
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
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _pay({required bool digital}) async {
    final order = _order;
    if (order == null) return;
    setState(() => _loading = true);
    try {
      final payment = digital
          ? await widget.repo.initiateDigital(
              order.id,
              amount: order.totalAmount,
              customerName: _customerName.text,
            )
          : await widget.repo.processCash(
              order.id,
              amount: order.totalAmount,
              customerName: _customerName.text,
            );
      if (digital && payment.paymentUrl != null) {
        await _openExternal(payment.paymentUrl!);
      }
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Payment ${payment.status}')));
      }
    } catch (error) {
      if (mounted) _showError(context, error);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
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
        final catalog = _CatalogPanel(
          search: _search,
          products: products,
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
          onCash: () => _pay(digital: false),
          onDigital: () => _pay(digital: true),
          onReceipt: _order == null
              ? null
              : () => _openExternal(widget.repo.receiptUrl(_order!.id)),
          onWhatsApp: _order == null
              ? null
              : () => _shareWhatsApp(_order!, _config?.receiptWhatsAppTemplate),
        );

        return Padding(
          padding: const EdgeInsets.all(12),
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

class _CatalogPanel extends StatelessWidget {
  const _CatalogPanel({
    required this.search,
    required this.products,
    required this.onChanged,
    required this.onTap,
  });

  final TextEditingController search;
  final List<CatalogItem> products;
  final VoidCallback onChanged;
  final ValueChanged<CatalogItem> onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            TextField(
              controller: search,
              onChanged: (_) => onChanged(),
              decoration: const InputDecoration(
                hintText: 'Cari produk',
                prefixIcon: Icon(Icons.search),
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: GridView.builder(
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 180,
                  mainAxisExtent: 150,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                ),
                itemCount: products.length,
                itemBuilder: (context, index) {
                  final item = products[index];
                  return InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: item.isAvailable ? () => onTap(item) : null,
                    child: Ink(
                      decoration: BoxDecoration(
                        color: item.isAvailable
                            ? Colors.white
                            : GimsColors.muted,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: GimsColors.border),
                      ),
                      padding: const EdgeInsets.all(10),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            item.productKind == 'RECIPE'
                                ? Icons.restaurant_menu
                                : Icons.inventory_2_outlined,
                            color: item.isAvailable
                                ? GimsColors.primary
                                : GimsColors.mutedForeground,
                          ),
                          const Spacer(),
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
    required this.onCash,
    required this.onDigital,
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
  final VoidCallback onCash;
  final VoidCallback onDigital;
  final VoidCallback? onReceipt;
  final VoidCallback? onWhatsApp;

  @override
  Widget build(BuildContext context) {
    return Card(
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
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(line.product.productName),
                            subtitle: Text(
                              formatMoney(line.product.price, currency),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  onPressed: () => onQtyChanged(
                                    line,
                                    (line.quantity - 1).clamp(1, 999),
                                  ),
                                  icon: const Icon(Icons.remove_circle_outline),
                                ),
                                Text(line.quantity.toStringAsFixed(0)),
                                IconButton(
                                  onPressed: () =>
                                      onQtyChanged(line, line.quantity + 1),
                                  icon: const Icon(Icons.add_circle_outline),
                                ),
                                IconButton(
                                  onPressed: () => onRemove(line),
                                  icon: const Icon(Icons.delete_outline),
                                ),
                              ],
                            ),
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
                  FilledButton.icon(
                    onPressed: onCash,
                    icon: const Icon(Icons.payments_outlined),
                    label: const Text('Cash'),
                  ),
                  FilledButton.icon(
                    onPressed: onDigital,
                    icon: const Icon(Icons.qr_code_2),
                    label: const Text('Xendit'),
                  ),
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

class LiveTableScreen extends StatefulWidget {
  const LiveTableScreen({super.key, required this.repo, required this.outlet});

  final PosRepository repo;
  final Outlet outlet;

  @override
  State<LiveTableScreen> createState() => _LiveTableScreenState();
}

class _LiveTableScreenState extends State<LiveTableScreen> {
  Timer? _timer;
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
  }

  @override
  void didUpdateWidget(covariant LiveTableScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.outlet.id != widget.outlet.id) _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
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
      try {
        await widget.repo.createOrder(
          outletId: widget.outlet.id,
          orderType: 'DINE_IN',
          tableId: info.table.id,
          tableLabel:
              info.table.label ??
              info.table.tableNumber?.toString() ??
              info.table.id,
          guestCount: info.seatCount == 0 ? 1 : info.seatCount,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Order meja dibuat. Tambahkan item dari Terminal.'),
            ),
          );
        }
      } catch (error) {
        if (mounted) _showError(context, error);
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
              'Status ${order.status.value} · tunggu ${formatDuration(info.duration)}',
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
