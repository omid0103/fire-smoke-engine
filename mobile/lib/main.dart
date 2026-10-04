import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

const String _appUrl = 'https://engin.rabinazar.ir';
const String _appTitle = 'نرم‌افزار محاسباتی رابین آذر | Rabin Azar Fire Engineering';
const Color _background = Color(0xFF050608);
const Color _accent = Color(0xFFB3261E);
const Color _brandBlue = Color(0xFF0A477D);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: _background,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: _background,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const RabinFireEngineeringApp());
}

class RabinFireEngineeringApp extends StatelessWidget {
  const RabinFireEngineeringApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: _appTitle,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: _background,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _accent,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),
      home: const EngineeringWebView(),
    );
  }
}

class EngineeringWebView extends StatefulWidget {
  const EngineeringWebView({super.key});

  @override
  State<EngineeringWebView> createState() => _EngineeringWebViewState();
}

class _EngineeringWebViewState extends State<EngineeringWebView> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasMainFrameError = false;
  int _progress = 0;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(_background)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (!mounted) return;
            setState(() => _progress = progress);
          },
          onPageStarted: (_) {
            if (!mounted) return;
            setState(() {
              _isLoading = true;
              _hasMainFrameError = false;
              _progress = 0;
            });
          },
          onPageFinished: (_) {
            if (!mounted) return;
            setState(() {
              _progress = 100;
              _isLoading = false;
            });
          },
          onWebResourceError: (error) {
            if (!mounted || error.isForMainFrame != true) return;
            setState(() {
              _hasMainFrameError = true;
              _isLoading = false;
            });
          },
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            if (uri == null) return NavigationDecision.prevent;
            if (uri.scheme == 'http' || uri.scheme == 'https') {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.prevent;
          },
        ),
      );

    _loadFreshApp();
  }

  Future<void> _loadFreshApp() async {
    await _controller.clearCache();
    await _controller.loadRequest(Uri.parse(_appUrl));
  }

  Future<void> _handleSystemBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return;
    }
    await SystemNavigator.pop();
  }

  Future<void> _retry() async {
    setState(() {
      _hasMainFrameError = false;
      _isLoading = true;
      _progress = 0;
    });
    await _loadFreshApp();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (!didPop) {
          await _handleSystemBack();
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: Stack(
            children: [
              Positioned.fill(child: WebViewWidget(controller: _controller)),
              if (_isLoading && !_hasMainFrameError)
                Positioned.fill(
                  child: _BrandSplash(progress: _progress),
                ),
              if (_hasMainFrameError)
                Positioned.fill(
                  child: ColoredBox(
                    color: _background,
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Directionality(
                          textDirection: TextDirection.rtl,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Image.asset(
                                'assets/rabin_azar_logo.jpg',
                                width: 210,
                                fit: BoxFit.contain,
                              ),
                              const SizedBox(height: 24),
                              const Icon(Icons.cloud_off_rounded, size: 46),
                              const SizedBox(height: 14),
                              const Text(
                                'اتصال به سامانه برقرار نشد',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'اینترنت دستگاه را بررسی کنید و دوباره تلاش کنید.',
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 20),
                              FilledButton.icon(
                                onPressed: _retry,
                                icon: const Icon(Icons.refresh_rounded),
                                label: const Text('تلاش مجدد'),
                              ),
                            ],
                          ),
                        ),
                      ),
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

class _BrandSplash extends StatelessWidget {
  const _BrandSplash({required this.progress});

  final int progress;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: _background,
      child: Directionality(
        textDirection: TextDirection.rtl,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 34),
            child: Column(
              children: [
                const Spacer(flex: 3),
                Image.asset(
                  'assets/rabin_azar_logo.jpg',
                  width: 300,
                  fit: BoxFit.contain,
                ),
                const SizedBox(height: 28),
                const Text(
                  'نرم‌افزار محاسباتی رابین آذر',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 7),
                const Text(
                  'Rabin Azar Fire Engineering',
                  textDirection: TextDirection.ltr,
                  style: TextStyle(
                    color: Color(0xFFB9BEC4),
                    fontSize: 13,
                    letterSpacing: 0.6,
                  ),
                ),
                const Spacer(flex: 2),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: LinearProgressIndicator(
                    value: progress > 0 ? progress / 100 : null,
                    minHeight: 3,
                    backgroundColor: _brandBlue.withValues(alpha: 0.22),
                    color: _accent,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  progress > 0 ? 'در حال بارگذاری... $progress٪' : 'در حال اتصال به سامانه...',
                  style: const TextStyle(
                    color: Color(0xFF8D949B),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
