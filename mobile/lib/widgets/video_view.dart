import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

class VideoView extends StatelessWidget {
  final RTCVideoRenderer renderer;
  final bool isLocal;
  final bool mirror;

  const VideoView({
    Key? key,
    required this.renderer,
    this.isLocal = false,
    this.mirror = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Transform(
      alignment: Alignment.center,
      transform: Matrix4.identity()..scale(mirror ? -1.0 : 1.0, 1.0),
      child: RTCVideoView(
        renderer,
        objectFit: isLocal ? RTCVideoViewObjectFit.RTCVideoViewObjectFitCover : RTCVideoViewObjectFit.RTCVideoViewObjectFitContain,
        mirror: false, // Transform ile zaten yapıyoruz
      ),
    );
  }
}

