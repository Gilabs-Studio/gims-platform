import 'package:flutter/material.dart';

import '../../../app/app.dart';
import '../../../core/utils/error_utils.dart';
import '../../../core/network/api_exception.dart';
import '../../../shared/models/user_session.dart';
import '../../outlet/domain/models/outlet.dart';
import '../domain/models/loyalty_member.dart';

/// Mobile-first loyalty members screen with simple list and enroll bottom sheet.
class LoyaltyScreen extends StatefulWidget {
  const LoyaltyScreen({super.key, required this.outlet, this.user});
  final Outlet outlet;
  final UserSession? user;

  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> {
  final _search = TextEditingController();
  final List<LoyaltyMember> _members = [];
  bool _loading = false;
  int _page = 1;
  int _perPage = 20;
  int _total = 0;

  // Enroll sheet state
  bool _enrollLoading = false;
  List<LoyaltyProgram> _programs = [];
  String? _selectedProgramId;
  bool _tabExisting = true;
  final _lookupName = TextEditingController();
  final _newName = TextEditingController();
  final _newPhone = TextEditingController();
  final _newEmail = TextEditingController();

  bool get _canCreate {
    final permissions = widget.user?.permissions ?? const <String, String>{};
    if (permissions.isEmpty) return true;

    bool hasPermissionValue(String key) {
      if (!permissions.containsKey(key)) return false;
      return (permissions[key] ?? '').trim().isNotEmpty;
    }

    return hasPermissionValue('loyalty.create') ||
        hasPermissionValue('loyalty_member.create') ||
        hasPermissionValue('loyalty_members.create') ||
        hasPermissionValue('loyalty.*');
  }

  @override
  void initState() {
    super.initState();
    _fetchMembers(reset: true);
    _fetchPrograms();
  }

  @override
  void dispose() {
    _search.dispose();
    _lookupName.dispose();
    _newName.dispose();
    _newPhone.dispose();
    _newEmail.dispose();
    super.dispose();
  }

  Future<void> _fetchMembers({bool reset = false}) async {
    if (reset) {
      _page = 1;
      _members.clear();
    }
    setState(() => _loading = true);
    try {
      final res = await ServiceLocator.instance.loyaltyService.listMembers(page: _page, perPage: _perPage, search: _search.text.trim().isEmpty ? null : _search.text.trim());
      setState(() {
        _members.addAll(res.items);
        _total = res.total;
      });
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fetchPrograms() async {
    try {
      final list = await ServiceLocator.instance.loyaltyService.listPrograms(perPage: 100);
      setState(() {
        _programs = list.map((m) => LoyaltyProgram.fromJson(m)).toList();
      });
    } catch (_) {
      // ignore errors silently for programs
    }
  }

  Future<void> _openEnroll() async {
    setState(() {
      _selectedProgramId = _programs.isNotEmpty ? _programs.first.id : null;
      _tabExisting = true;
      _lookupName.text = '';
      _newName.text = '';
      _newPhone.text = '';
      _newEmail.text = '';
    });
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(12))),
      builder: (_) => Padding(
        padding: MediaQuery.of(context).viewInsets,
        child: StatefulBuilder(builder: (ctx, setModalState) {
          Future<void> enrollExisting() async {
            if (_lookupName.text.trim().isEmpty) return;
            setModalState(() => _enrollLoading = true);
            try {
              final lookup = await ServiceLocator.instance.loyaltyService.lookupMember(name: _lookupName.text.trim(), outletId: widget.outlet.id);
              if (lookup.found && lookup.memberId != null) {
                await ServiceLocator.instance.loyaltyService.enrollMember(name: lookup.customerName ?? _lookupName.text.trim(), outletId: widget.outlet.id, programId: _selectedProgramId);
                Navigator.of(ctx).pop();
                // refresh
                _fetchMembers(reset: true);
              } else {
                // Not found: enroll new with that name
                await ServiceLocator.instance.loyaltyService.enrollMember(name: _lookupName.text.trim(), outletId: widget.outlet.id, programId: _selectedProgramId);
                Navigator.of(ctx).pop();
                _fetchMembers(reset: true);
              }
            } catch (e) {
              showError(ctx, e);
            } finally {
              setModalState(() => _enrollLoading = false);
            }
          }

          Future<void> enrollNew() async {
            if (_newName.text.trim().length < 2) {
              showError(ctx, ApiException('Nama minimal 2 karakter'));
              return;
            }
            setModalState(() => _enrollLoading = true);
            try {
              await ServiceLocator.instance.loyaltyService.enrollMember(name: _newName.text.trim(), phone: _newPhone.text.trim(), email: _newEmail.text.trim(), outletId: widget.outlet.id, programId: _selectedProgramId);
              Navigator.of(ctx).pop();
              _fetchMembers(reset: true);
            } catch (e) {
              showError(ctx, e);
            } finally {
              setModalState(() => _enrollLoading = false);
            }
          }

          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const SizedBox(width: 40),
                const Text('Enroll Member', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(ctx).pop()),
              ]),
              const SizedBox(height: 8),
              // Program selector
              if (_programs.isNotEmpty) DropdownButton<String>(
                value: _selectedProgramId,
                isExpanded: true,
                items: _programs.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name))).toList(),
                onChanged: (v) => setModalState(() => _selectedProgramId = v),
              ),
              const SizedBox(height: 8),
              // Tabs: existing / new
              Row(children: [
                Expanded(child: GestureDetector(onTap: () => setModalState(() => _tabExisting = true), child: Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: _tabExisting ? Colors.blue.shade50 : Colors.transparent, borderRadius: BorderRadius.circular(8)), child: Center(child: Text('Existing'))))),
                const SizedBox(width: 8),
                Expanded(child: GestureDetector(onTap: () => setModalState(() => _tabExisting = false), child: Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: !_tabExisting ? Colors.blue.shade50 : Colors.transparent, borderRadius: BorderRadius.circular(8)), child: Center(child: Text('New'))))),
              ]),
              const SizedBox(height: 12),
              if (_tabExisting) ...[
                TextField(controller: _lookupName, decoration: const InputDecoration(labelText: 'Search name or phone', prefixIcon: Icon(Icons.search))),
                const SizedBox(height: 12),
                ElevatedButton(onPressed: _enrollLoading ? null : enrollExisting, child: _enrollLoading ? const SizedBox(height:20,width:20,child:CircularProgressIndicator(strokeWidth:2)) : const Text('Enroll')),
              ] else ...[
                TextField(controller: _newName, decoration: const InputDecoration(labelText: 'Name')),
                const SizedBox(height: 8),
                TextField(controller: _newPhone, decoration: const InputDecoration(labelText: 'Phone')),
                const SizedBox(height: 8),
                TextField(controller: _newEmail, decoration: const InputDecoration(labelText: 'Email')),
                const SizedBox(height: 12),
                ElevatedButton(onPressed: _enrollLoading ? null : enrollNew, child: _enrollLoading ? const SizedBox(height:20,width:20,child:CircularProgressIndicator(strokeWidth:2)) : const Text('Enroll')),
              ],
              const SizedBox(height: 8),
            ]),
          );
        }),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Loyalty Members',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                  ),
                ),
                if (_canCreate)
                  FilledButton.icon(
                    onPressed: _openEnroll,
                    icon: const Icon(Icons.person_add_alt_1, size: 18),
                    label: const Text('Enroll'),
                  ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _search,
              decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search members...'),
              onSubmitted: (_) => _fetchMembers(reset: true),
            ),
          ),
          Expanded(
            child: _loading && _members.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : _members.isEmpty && !_loading
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.inbox_outlined, size: 64, color: Colors.grey.shade300),
                        const SizedBox(height: 16),
                        Text('No members yet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Colors.grey.shade600)),
                        const SizedBox(height: 8),
                        Text('Tap + button to enroll a member', style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: () async => _fetchMembers(reset: true),
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      itemCount: _members.length + 1,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (ctx, i) {
                        if (i >= _members.length) {
                          if (_members.length >= _total) return const SizedBox.shrink();
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                              child: OutlinedButton(
                                onPressed: () { _page += 1; _fetchMembers(); },
                                child: const Text('Load more'),
                              ),
                            ),
                          );
                        }
                        final m = _members[i];
                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          leading: CircleAvatar(child: Text(m.memberCode.isNotEmpty ? m.memberCode.substring(0,1) : '?')),
                          title: Text(m.customerName ?? m.memberCode),
                          subtitle: Text('${m.currentTier ?? '-'} · ${m.pointBalance.toStringAsFixed(0)} pts'),
                          trailing: Text(m.pointBalance.toStringAsFixed(0)),
                          onTap: () async {
                            await showDialog<void>(
                              context: context,
                              builder: (dialogContext) => AlertDialog(
                                title: Text(m.customerName ?? 'Member'),
                                content: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Code: ${m.memberCode}'),
                                    const SizedBox(height: 4),
                                    Text('Tier: ${m.currentTier ?? '-'}'),
                                    const SizedBox(height: 4),
                                    Text('Points: ${m.pointBalance.toStringAsFixed(0)}'),
                                    if (m.enrolledOutletName != null) ...[
                                      const SizedBox(height: 8),
                                      Text('Outlet: ${m.enrolledOutletName}'),
                                    ],
                                  ],
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.of(dialogContext).pop(),
                                    child: const Text('Close'),
                                  ),
                                ],
                              ),
                            );
                          },
                        );
                      },
                    ),
                  ),
          ),
        ]),
      ),
    );
  }
}
