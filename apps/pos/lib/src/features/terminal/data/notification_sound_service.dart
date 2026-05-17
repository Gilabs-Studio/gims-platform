import 'dart:async';
import 'dart:collection';

import 'package:audioplayers/audioplayers.dart';

class NotificationSoundService {
  NotificationSoundService._();

  static final instance = NotificationSoundService._();

  final AudioPlayer _player = AudioPlayer();
  final Queue<void> _queue = Queue<void>();
  StreamSubscription<void>? _completionSub;
  bool _playing = false;

  Future<void> init() async {
    _completionSub ??= _player.onPlayerComplete.listen((_) => _playNext());
    await _player.setReleaseMode(ReleaseMode.stop);
  }

  Future<void> play() async {
    await init();
    _queue.add(null);
    if (!_playing) {
      await _playNext();
    }
  }

  Future<void> _playNext() async {
    if (_queue.isEmpty) {
      _playing = false;
      return;
    }
    _playing = true;
    _queue.removeFirst();
    await _player.stop();
    await _player.play(AssetSource('mp3/notification.mp3'));
  }

  Future<void> dispose() async {
    _queue.clear();
    await _completionSub?.cancel();
    _completionSub = null;
    await _player.dispose();
  }
}
