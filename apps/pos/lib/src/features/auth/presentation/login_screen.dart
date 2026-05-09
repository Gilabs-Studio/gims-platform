import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/error_utils.dart';
import '../../../shared/models/user_session.dart';
import '../../../app/app.dart';

/// Login screen with username/password form.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLoggedIn});

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
      final user = await ServiceLocator.instance.authService.login(
        username: _username.text.trim(),
        password: _password.text,
      );
      widget.onLoggedIn(user);
    } catch (error) {
      if (mounted) {
        showError(context, error);
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
