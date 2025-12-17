import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/socket_provider.dart';
import 'providers/webrtc_provider.dart';
import 'screens/login_screen.dart';
import 'utils/theme.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => SocketProvider()),
        ChangeNotifierProvider(create: (_) => WebRTCProvider()),
      ],
      child: MaterialApp(
        title: 'FaceUp',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.blue,
          scaffoldBackgroundColor: AppTheme.backgroundColor,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        ),
        home: const LoginScreen(),
      ),
    );
  }
}
