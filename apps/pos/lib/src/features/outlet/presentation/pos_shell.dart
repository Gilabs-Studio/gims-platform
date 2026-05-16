import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/error_utils.dart';

import '../../../shared/models/user_session.dart';
import '../../../app/app.dart';
import '../domain/models/outlet.dart';
import 'widgets/home_grid.dart';
import '../../terminal/presentation/unified_terminal_flow.dart';
import '../../floor_layout/presentation/floor_editor_screen.dart';
import '../../loyalty/presentation/loyalty_screen.dart';
import '../../feedback/presentation/feedback_screen.dart';

/// Main shell — outlet selector + feature navigation (no bottom nav).
class PosShell extends StatefulWidget {
  const PosShell({super.key, this.user, required this.onLogout});

  final UserSession? user;
  final VoidCallback onLogout;

  @override
  State<PosShell> createState() => _PosShellState();
}

class _PosShellState extends State<PosShell> {
  List<Outlet> _outlets = const [];
  Outlet? _outlet;
  bool _outletLoading = true;
  PosFeature? _feature;
  final _baseUrlController = TextEditingController(
    text: ApiClient.instance.baseUrl,
  );

  @override
  void initState() {
    super.initState();
    _loadOutlets();
  }

  @override
  void dispose() {
    _baseUrlController.dispose();
    super.dispose();
  }

  Future<void> _loadOutlets() async {
    setState(() => _outletLoading = true);
    try {
      final outlets = await ServiceLocator.instance.outletService.listOutlets();
      setState(() {
        _outlets = outlets;
        _outlet = outlets.isNotEmpty ? outlets.first : null;
      });
    } catch (error) {
      if (mounted) {
        if (isAuthError(error)) {
          widget.onLogout();
        } else {
          showError(context, error);
        }
      }
    } finally {
      if (mounted) setState(() => _outletLoading = false);
    }
  }

  void _handleAuthError(Object error) {
    if (isAuthError(error)) widget.onLogout();
  }

  @override
  Widget build(BuildContext context) {
    if (_outletLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final outlet = _outlet;
    if (outlet == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.storefront_outlined,
                size: 42,
                color: GimsColors.mutedForeground,
              ),
              const SizedBox(height: 12),
              const Text('Belum ada outlet POS.'),
              const SizedBox(height: 12),
              FilledButton(onPressed: _loadOutlets, child: const Text('Retry')),
              OutlinedButton(
                onPressed: widget.onLogout,
                child: const Text('Logout'),
              ),
            ],
          ),
        ),
      );
    }

    Widget body;
    switch (_feature) {
      case PosFeature.terminal:
        body = UnifiedTerminalFlow(
          outlet: outlet,
          onAuthError: _handleAuthError,
        );
        break;
      case PosFeature.floor:
        body = FloorEditorScreen(outlet: outlet);
        break;
      case PosFeature.loyalty:
        body = LoyaltyScreen(outlet: outlet, user: widget.user);
        break;
      case PosFeature.feedback:
        body = FeedbackScreen(outlet: outlet);
        break;
      case null:
        body = HomeGrid(
          user: widget.user,
          outlet: outlet,
          onSelected: (feature) => setState(() => _feature = feature),
        );
    }

    return Scaffold(
      appBar: AppBar(
        leading: _feature == null
            ? null
            : IconButton(
                tooltip: 'Kembali',
                icon: const Icon(Icons.arrow_back),
                onPressed: () => setState(() => _feature = null),
              ),
        title: Text(_feature?.title ?? outlet.name),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) async {
              switch (value) {
                case 'change_outlet':
                  _showOutletSelector();
                  break;
                case 'refresh':
                  _loadOutlets();
                  break;

                case 'logout':
                  widget.onLogout();
                  break;
              }
            },
            itemBuilder: (_) => [
              if (_outlets.length > 1)
                const PopupMenuItem(
                  value: 'change_outlet',
                  child: Text('Ganti Outlet'),
                ),
              const PopupMenuItem(value: 'refresh', child: Text('Refresh')),

              const PopupMenuItem(value: 'logout', child: Text('Logout')),
            ],
          ),
        ],
      ),
      body: body,
    );
  }

  void _showSettings() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('API Settings'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _baseUrlController,
              decoration: const InputDecoration(labelText: 'Base URL'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () async {
              await ApiClient.instance.setBaseUrl(_baseUrlController.text);
              if (context.mounted) Navigator.pop(dialogContext);
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  void _showOutletSelector() {
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Pilih Outlet'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: _outlets.length,
            itemBuilder: (context, index) {
              final item = _outlets[index];
              return ListTile(
                leading: const Icon(Icons.storefront_outlined),
                title: Text(item.name),
                selected: item.id == _outlet?.id,
                onTap: () {
                  setState(() {
                    _outlet = item;
                    _feature = null;
                  });
                  Navigator.pop(dialogContext);
                },
              );
            },
          ),
        ),
      ),
    );
  }
}
