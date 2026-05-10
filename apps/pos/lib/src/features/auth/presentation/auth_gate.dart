import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../shared/models/user_session.dart';
import '../../../app/app.dart';
import '../../outlet/presentation/pos_shell.dart';
import 'login_screen.dart';

/// Decides whether to show login or the POS shell based on session.
class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

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
        user: _user,
        onLogout: () async {
          await ServiceLocator.instance.authService.logout();
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
      onLoggedIn: (user) => setState(() {
        _user = user;
        _hasSession = true;
      }),
    );
  }
}
