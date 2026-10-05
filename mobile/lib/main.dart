import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

const Color kBg = Color(0xFF080A0D);
const Color kSurface = Color(0xFF12161C);
const Color kSurface2 = Color(0xFF1A2028);
const Color kRed = Color(0xFFE6402C);
const Color kBlue = Color(0xFF2D8CFF);
const Color kGreen = Color(0xFF49A84F);
const Color kOrange = Color(0xFFF39A25);
const Color kPurple = Color(0xFF8E24AA);
const Color kTeal = Color(0xFF269C91);
const Color kTextMuted = Color(0xFF9AA6B2);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: kBg,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: kBg,
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  runApp(const RabinFireApp());
}

enum AppLanguage { fa, en }

class RabinFireApp extends StatefulWidget {
  const RabinFireApp({super.key});

  @override
  State<RabinFireApp> createState() => _RabinFireAppState();
}

class _RabinFireAppState extends State<RabinFireApp> {
  AppLanguage _language = AppLanguage.fa;
  bool _ready = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final p = await SharedPreferences.getInstance();
    final lang = p.getString('language');
    if (lang == 'en') _language = AppLanguage.en;
    if (mounted) setState(() => _ready = true);
  }

  Future<void> _toggleLanguage() async {
    final next = _language == AppLanguage.fa ? AppLanguage.en : AppLanguage.fa;
    final p = await SharedPreferences.getInstance();
    await p.setString('language', next.name);
    if (mounted) setState(() => _language = next);
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const MaterialApp(
        debugShowCheckedModeBanner: false,
        home: _SplashScreen(),
      );
    }

    final isFa = _language == AppLanguage.fa;
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: isFa ? 'مهندسی حریق رابین' : 'Rabin Fire Engineering',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: kBg,
        useMaterial3: true,
        fontFamily: null,
        colorScheme: ColorScheme.fromSeed(
          seedColor: kRed,
          brightness: Brightness.dark,
          surface: kSurface,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: kSurface2,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: Color(0xFF26303B)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: kBlue, width: 1.2),
          ),
        ),
      ),
      builder: (context, child) => Directionality(
        textDirection: isFa ? TextDirection.rtl : TextDirection.ltr,
        child: child ?? const SizedBox.shrink(),
      ),
      home: HomeScreen(
        language: _language,
        onToggleLanguage: _toggleLanguage,
      ),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: kBg,
      body: Center(
        child: CircularProgressIndicator(color: kRed),
      ),
    );
  }
}

String tr(AppLanguage lang, String fa, String en) =>
    lang == AppLanguage.fa ? fa : en;

String fmt(double value, {int decimals = 2}) {
  if (!value.isFinite) return '-';
  final s = value.toStringAsFixed(decimals);
  return s.replaceFirst(RegExp(r'\.?0+$'), '');
}

class AppCategory {
  const AppCategory({
    required this.id,
    required this.fa,
    required this.en,
    required this.icon,
    required this.color,
  });

  final String id;
  final String fa;
  final String en;
  final IconData icon;
  final Color color;
}

const categories = <AppCategory>[
  AppCategory(id: 'customers', fa: 'مشتریان', en: 'Customers', icon: Icons.people_alt_rounded, color: Color(0xFFE65440)),
  AppCategory(id: 'cfps', fa: 'CFPS', en: 'CFPS', icon: Icons.school_rounded, color: Color(0xFF3F8DE3)),
  AppCategory(id: 'protection', fa: 'اطفای حریق', en: 'Fire Protection', icon: Icons.fire_extinguisher_rounded, color: Color(0xFF53A84E)),
  AppCategory(id: 'alarm', fa: 'اعلام حریق', en: 'Fire Alarm', icon: Icons.notifications_active_rounded, color: Color(0xFFF39A25)),
  AppCategory(id: 'smoke', fa: 'کنترل دود', en: 'Smoke Control', icon: Icons.air_rounded, color: Color(0xFF8E24AA)),
  AppCategory(id: 'life', fa: 'ایمنی خروج', en: 'Life Safety', icon: Icons.stairs_rounded, color: Color(0xFF37988E)),
];

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.language,
    required this.onToggleLanguage,
  });

  final AppLanguage language;
  final VoidCallback onToggleLanguage;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selected = 2;

  AppLanguage get lang => widget.language;

  @override
  Widget build(BuildContext context) {
    final selectedCategory = categories[_selected];
    return Scaffold(
      appBar: AppBar(
        backgroundColor: kBg,
        surfaceTintColor: Colors.transparent,
        centerTitle: true,
        toolbarHeight: 78,
        title: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              tr(lang, 'مهندسی حریق رابین', 'Rabin Fire Engineering'),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20),
            ),
            const SizedBox(height: 3),
            const Text(
              'FIRE • LIFE SAFETY • SMOKE CONTROL',
              textDirection: TextDirection.ltr,
              style: TextStyle(fontSize: 9, color: kTextMuted, letterSpacing: 1.2),
            ),
          ],
        ),
        leading: IconButton(
          tooltip: tr(lang, 'تنظیمات', 'Settings'),
          onPressed: () => _showAbout(context),
          icon: const Icon(Icons.info_outline_rounded),
        ),
        actions: [
          Padding(
            padding: const EdgeInsetsDirectional.only(end: 8),
            child: TextButton.icon(
              onPressed: widget.onToggleLanguage,
              icon: const Icon(Icons.language_rounded, size: 18),
              label: Text(lang == AppLanguage.fa ? 'EN' : 'FA'),
            ),
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            _CategoryStrip(
              language: lang,
              selectedIndex: _selected,
              onSelected: (i) => setState(() => _selected = i),
            ),
            const Divider(height: 1, color: Color(0xFF202832)),
            Expanded(
              child: _buildCategoryBody(selectedCategory),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCategoryBody(AppCategory c) {
    switch (c.id) {
      case 'customers':
        return CustomersLanding(language: lang);
      case 'cfps':
        return ModuleList(
          language: lang,
          category: c,
          items: cfpsItems(lang),
        );
      case 'protection':
        return ModuleList(
          language: lang,
          category: c,
          items: protectionItems(lang),
        );
      case 'alarm':
        return ModuleList(
          language: lang,
          category: c,
          items: alarmItems(lang),
        );
      case 'smoke':
        return ModuleList(
          language: lang,
          category: c,
          items: smokeItems(lang),
        );
      case 'life':
        return ModuleList(
          language: lang,
          category: c,
          items: lifeSafetyItems(lang),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  void _showAbout(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: kSurface,
      showDragHandle: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.local_fire_department_rounded, color: kRed, size: 42),
            const SizedBox(height: 12),
            Text(
              tr(lang, 'مهندسی حریق رابین', 'Rabin Fire Engineering'),
              style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            Text(
              tr(
                lang,
                'ابزار محاسبات مقدماتی مهندسی حریق. نتایج باید با ضوابط مصوب پروژه، استاندارد مرجع و نظر مرجع ذی‌صلاح کنترل شوند.',
                'Preliminary fire-engineering calculation tools. Results must be verified against the adopted code, project criteria, and the authority having jurisdiction.',
              ),
              textAlign: TextAlign.center,
              style: const TextStyle(color: kTextMuted, height: 1.6),
            ),
          ],
        ),
      ),
    );
  }
}

class _CategoryStrip extends StatelessWidget {
  const _CategoryStrip({
    required this.language,
    required this.selectedIndex,
    required this.onSelected,
  });

  final AppLanguage language;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 67,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (_, __) => const SizedBox(width: 9),
        itemBuilder: (context, i) {
          final c = categories[i];
          final selected = selectedIndex == i;
          return InkWell(
            borderRadius: BorderRadius.circular(22),
            onTap: () => onSelected(i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 8),
              decoration: BoxDecoration(
                color: selected ? c.color : c.color.withValues(alpha: .72),
                borderRadius: BorderRadius.circular(22),
                border: selected ? Border.all(color: Colors.white.withValues(alpha: .65), width: 1) : null,
                boxShadow: selected
                    ? [BoxShadow(color: c.color.withValues(alpha: .28), blurRadius: 16, spreadRadius: 1)]
                    : null,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(c.icon, size: 18, color: Colors.white),
                  const SizedBox(width: 7),
                  Text(
                    tr(language, c.fa, c.en),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class ModuleItem {
  const ModuleItem({
    required this.fa,
    required this.en,
    this.icon = Icons.calculate_rounded,
    this.definition,
    this.builder,
  });

  final String fa;
  final String en;
  final IconData icon;
  final CalcDefinition? definition;
  final Widget Function(BuildContext context)? builder;
}

class ModuleList extends StatelessWidget {
  const ModuleList({
    super.key,
    required this.language,
    required this.category,
    required this.items,
  });

  final AppLanguage language;
  final AppCategory category;
  final List<ModuleItem> items;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 32),
      children: [
        Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: category.color.withValues(alpha: .14),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(category.icon, color: category.color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tr(language, category.fa, category.en),
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  Text(
                    tr(language, 'ابزارهای محاسباتی و کنترل طراحی', 'Calculation and design-check tools'),
                    style: const TextStyle(fontSize: 12, color: kTextMuted),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        ...items.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _ModuleButton(
                item: item,
                language: language,
                accent: category.color,
              ),
            )),
      ],
    );
  }
}

class _ModuleButton extends StatelessWidget {
  const _ModuleButton({
    required this.item,
    required this.language,
    required this.accent,
  });

  final ModuleItem item;
  final AppLanguage language;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: kSurface,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          final Widget page;
          if (item.builder != null) {
            page = item.builder!(context);
          } else if (item.definition != null) {
            page = GenericCalculatorPage(language: language, definition: item.definition!);
          } else {
            return;
          }
          Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));
        },
        child: Container(
          minHeight: 72,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF232C36)),
          ),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: .13),
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(item.icon, color: accent, size: 22),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Text(
                  tr(language, item.fa, item.en),
                  style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w700, height: 1.35),
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: kTextMuted),
            ],
          ),
        ),
      ),
    );
  }
}

class CalcField {
  const CalcField({
    required this.keyName,
    required this.fa,
    required this.en,
    required this.unit,
    this.initial,
    this.hintFa,
    this.hintEn,
  });

  final String keyName;
  final String fa;
  final String en;
  final String unit;
  final double? initial;
  final String? hintFa;
  final String? hintEn;
}

class CalcOutput {
  const CalcOutput({required this.fa, required this.en, required this.value, required this.unit});
  final String fa;
  final String en;
  final double value;
  final String unit;
}

typedef CalcFn = List<CalcOutput> Function(Map<String, double> values);

class CalcDefinition {
  const CalcDefinition({
    required this.fa,
    required this.en,
    required this.fields,
    required this.calculate,
    required this.referenceFa,
    required this.referenceEn,
    this.noteFa,
    this.noteEn,
  });

  final String fa;
  final String en;
  final List<CalcField> fields;
  final CalcFn calculate;
  final String referenceFa;
  final String referenceEn;
  final String? noteFa;
  final String? noteEn;
}

class GenericCalculatorPage extends StatefulWidget {
  const GenericCalculatorPage({super.key, required this.language, required this.definition});

  final AppLanguage language;
  final CalcDefinition definition;

  @override
  State<GenericCalculatorPage> createState() => _GenericCalculatorPageState();
}

class _GenericCalculatorPageState extends State<GenericCalculatorPage> {
  late final Map<String, TextEditingController> _controllers;
  List<CalcOutput> _outputs = const [];
  String? _error;

  AppLanguage get lang => widget.language;

  @override
  void initState() {
    super.initState();
    _controllers = {
      for (final f in widget.definition.fields)
        f.keyName: TextEditingController(text: f.initial == null ? '' : fmt(f.initial!, decimals: 3)),
    };
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _calculate() {
    final values = <String, double>{};
    for (final f in widget.definition.fields) {
      final raw = _controllers[f.keyName]!.text.trim().replaceAll(',', '.');
      final v = double.tryParse(raw);
      if (v == null || v < 0) {
        setState(() {
          _error = tr(lang, 'برای همه فیلدها مقدار عددی معتبر وارد کنید.', 'Enter a valid numeric value for every field.');
          _outputs = const [];
        });
        return;
      }
      values[f.keyName] = v;
    }
    try {
      final outputs = widget.definition.calculate(values);
      setState(() {
        _error = null;
        _outputs = outputs;
      });
    } catch (_) {
      setState(() {
        _error = tr(lang, 'محاسبه با این ورودی‌ها امکان‌پذیر نیست.', 'The calculation cannot be completed with these inputs.');
        _outputs = const [];
      });
    }
  }

  String _resultText() {
    final title = tr(lang, widget.definition.fa, widget.definition.en);
    final lines = _outputs.map((o) => '${tr(lang, o.fa, o.en)}: ${fmt(o.value)} ${o.unit}').join('\n');
    return '$title\n$lines';
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.definition;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: kBg,
        surfaceTintColor: Colors.transparent,
        title: Text(tr(lang, d.fa, d.en), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 32),
        children: [
          _InfoCard(
            icon: Icons.rule_folder_rounded,
            title: tr(lang, 'مبنای کنترل', 'Design basis'),
            text: tr(lang, d.referenceFa, d.referenceEn),
          ),
          const SizedBox(height: 16),
          ...d.fields.map((f) => Padding(
                padding: const EdgeInsets.only(bottom: 13),
                child: TextField(
                  controller: _controllers[f.keyName],
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  textDirection: TextDirection.ltr,
                  decoration: InputDecoration(
                    labelText: '${tr(lang, f.fa, f.en)} (${f.unit})',
                    hintText: tr(lang, f.hintFa ?? '', f.hintEn ?? ''),
                    suffixText: f.unit,
                  ),
                ),
              )),
          const SizedBox(height: 4),
          FilledButton.icon(
            onPressed: _calculate,
            style: FilledButton.styleFrom(
              backgroundColor: kRed,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            icon: const Icon(Icons.calculate_rounded),
            label: Text(tr(lang, 'محاسبه', 'Calculate'), style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            Text(_error!, style: const TextStyle(color: Color(0xFFFF8A80))),
          ],
          if (_outputs.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(tr(lang, 'نتایج', 'Results'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            ..._outputs.map((o) => Container(
                  margin: const EdgeInsets.only(bottom: 9),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: kSurface,
                    borderRadius: BorderRadius.circular(17),
                    border: Border.all(color: const Color(0xFF26303B)),
                  ),
                  child: Row(
                    children: [
                      Expanded(child: Text(tr(lang, o.fa, o.en), style: const TextStyle(color: kTextMuted))),
                      Text('${fmt(o.value)} ${o.unit}', textDirection: TextDirection.ltr, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                    ],
                  ),
                )),
            OutlinedButton.icon(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: _resultText()));
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr(lang, 'نتایج کپی شد.', 'Results copied.'))));
                }
              },
              icon: const Icon(Icons.copy_rounded),
              label: Text(tr(lang, 'کپی نتایج', 'Copy results')),
            ),
          ],
          if ((d.noteFa ?? '').isNotEmpty || (d.noteEn ?? '').isNotEmpty) ...[
            const SizedBox(height: 18),
            _InfoCard(
              icon: Icons.warning_amber_rounded,
              title: tr(lang, 'توجه مهندسی', 'Engineering note'),
              text: tr(lang, d.noteFa ?? '', d.noteEn ?? ''),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.icon, required this.title, required this.text});
  final IconData icon;
  final String title;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kSurface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF242D37)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: kOrange, size: 22),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
                const SizedBox(height: 5),
                Text(text, style: const TextStyle(color: kTextMuted, height: 1.55, fontSize: 12.5)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

CalcDefinition volumeDensityCalc({
  required String fa,
  required String en,
  required String densityFa,
  required String densityEn,
  String densityUnit = 'kg/m³',
}) {
  return CalcDefinition(
    fa: fa,
    en: en,
    fields: [
      const CalcField(keyName: 'length', fa: 'طول', en: 'Length', unit: 'm'),
      const CalcField(keyName: 'width', fa: 'عرض', en: 'Width', unit: 'm'),
      const CalcField(keyName: 'height', fa: 'ارتفاع', en: 'Height', unit: 'm'),
      CalcField(keyName: 'density', fa: densityFa, en: densityEn, unit: densityUnit),
    ],
    calculate: (v) {
      final volume = v['length']! * v['width']! * v['height']!;
      final q = volume * v['density']!;
      final unit = densityUnit.startsWith('g/') ? 'kg' : 'kg';
      final converted = densityUnit.startsWith('g/') ? q / 1000 : q;
      return [
        CalcOutput(fa: 'حجم فضا', en: 'Room volume', value: volume, unit: 'm³'),
        CalcOutput(fa: 'مقدار اولیه عامل', en: 'Preliminary agent quantity', value: converted, unit: unit),
      ];
    },
    referenceFa: 'محاسبه مقدماتی بر اساس حجم و چگالی/ضریب طراحی واردشده توسط کاربر.',
    referenceEn: 'Preliminary calculation based on enclosure volume and the user-entered design density/factor.',
    noteFa: 'ضریب طراحی را از استاندارد و دیتاشیت سیستم منتخب استخراج کنید. این ابزار جایگزین نرم‌افزار تأییدشده سازنده نیست.',
    noteEn: 'Obtain the design factor from the adopted standard and the selected system data sheet. This tool does not replace manufacturer-approved design software.',
  );
}

List<ModuleItem> protectionItems(AppLanguage lang) => [
      ModuleItem(
        fa: 'آئروسل',
        en: 'Aerosol',
        icon: Icons.blur_on_rounded,
        definition: volumeDensityCalc(fa: 'محاسبه مقدماتی آئروسل', en: 'Aerosol preliminary calculation', densityFa: 'چگالی کاربرد', densityEn: 'Application density', densityUnit: 'g/m³'),
      ),
      ModuleItem(
        fa: 'CO₂',
        en: 'CO₂',
        icon: Icons.cloud_rounded,
        definition: volumeDensityCalc(fa: 'محاسبه مقدماتی CO₂', en: 'CO₂ preliminary calculation', densityFa: 'ضریب جرمی طراحی', densityEn: 'Design mass factor'),
      ),
      ModuleItem(
        fa: 'FM-200',
        en: 'FM-200',
        icon: Icons.science_rounded,
        definition: volumeDensityCalc(fa: 'محاسبه مقدماتی FM-200', en: 'FM-200 preliminary calculation', densityFa: 'ضریب جرمی طراحی', densityEn: 'Design mass factor'),
      ),
      ModuleItem(
        fa: 'فوم',
        en: 'Foam',
        icon: Icons.bubble_chart_rounded,
        definition: CalcDefinition(
          fa: 'محاسبه فوم',
          en: 'Foam calculation',
          fields: const [
            CalcField(keyName: 'area', fa: 'مساحت سطح', en: 'Hazard area', unit: 'm²'),
            CalcField(keyName: 'rate', fa: 'نرخ کاربرد محلول', en: 'Solution application rate', unit: 'L/min/m²'),
            CalcField(keyName: 'duration', fa: 'زمان تخلیه', en: 'Discharge duration', unit: 'min'),
            CalcField(keyName: 'percent', fa: 'درصد کنسانتره', en: 'Concentrate percentage', unit: '%', initial: 3),
          ],
          calculate: (v) {
            final flow = v['area']! * v['rate']!;
            final solution = flow * v['duration']!;
            final concentrate = solution * v['percent']! / 100;
            return [
              CalcOutput(fa: 'دبی محلول', en: 'Solution flow', value: flow, unit: 'L/min'),
              CalcOutput(fa: 'حجم محلول', en: 'Solution volume', value: solution, unit: 'L'),
              CalcOutput(fa: 'کنسانتره موردنیاز', en: 'Foam concentrate', value: concentrate, unit: 'L'),
            ];
          },
          referenceFa: 'نرخ کاربرد، زمان و درصد کنسانتره باید مطابق نوع خطر و استاندارد پروژه وارد شود.',
          referenceEn: 'Application rate, duration and concentrate percentage must be entered for the actual hazard and adopted standard.',
        ),
      ),
      ModuleItem(
        fa: 'جانمایی تجهیزات اطفای حریق',
        en: 'Fire fighting equipment placements',
        icon: Icons.place_rounded,
        definition: CalcDefinition(
          fa: 'برآورد جانمایی تجهیزات',
          en: 'Equipment placement estimate',
          fields: const [
            CalcField(keyName: 'length', fa: 'طول مسیر پوشش', en: 'Coverage route length', unit: 'm'),
            CalcField(keyName: 'spacing', fa: 'حداکثر فاصله مجاز', en: 'Maximum allowed spacing', unit: 'm'),
          ],
          calculate: (v) => [
            CalcOutput(fa: 'تعداد تقریبی نقاط', en: 'Estimated number of points', value: (v['length']! / math.max(v['spacing']!, .001)).ceilToDouble(), unit: 'pcs'),
          ],
          referenceFa: 'فاصله مجاز را بر اساس نوع تجهیز، خطر، هندسه و ضابطه مصوب پروژه وارد کنید.',
          referenceEn: 'Enter the maximum spacing required for the specific equipment, hazard, geometry and adopted code.',
        ),
      ),
      ModuleItem(
        fa: 'Pipe Schedule برای اسپرینکلر K=5.6',
        en: 'Sprinkler Pipe Schedule for K=5.6',
        icon: Icons.table_chart_rounded,
        builder: (_) => PipeSchedulePage(language: lang, titleFa: 'Pipe Schedule اسپرینکلر K=5.6', titleEn: 'K=5.6 Sprinkler Pipe Schedule'),
      ),
      ModuleItem(
        fa: 'Pipe Schedule عمومی اسپرینکلر',
        en: 'Pipe schedule for any sprinkler',
        icon: Icons.table_rows_rounded,
        builder: (_) => PipeSchedulePage(language: lang, titleFa: 'Pipe Schedule عمومی', titleEn: 'General Sprinkler Pipe Schedule'),
      ),
      ModuleItem(
        fa: 'فاصله‌گذاری اسپرینکلر',
        en: 'Sprinkler spacing',
        icon: Icons.grid_4x4_rounded,
        definition: roomGridDefinition('فاصله‌گذاری اسپرینکلر', 'Sprinkler spacing'),
      ),
      ModuleItem(
        fa: 'تعداد اسپرینکلر اتاق',
        en: 'Room sprinkler quantity',
        icon: Icons.sprinkler_rounded,
        definition: areaCoverageDefinition('تعداد اسپرینکلر اتاق', 'Room sprinkler quantity', 'حداکثر سطح پوشش هر اسپرینکلر', 'Maximum coverage per sprinkler'),
      ),
      ModuleItem(
        fa: 'برآورد اتاق پمپ',
        en: 'Pump room estimation',
        icon: Icons.water_pump_rounded,
        definition: combinedPumpDefinition('برآورد اولیه دبی پمپ', 'Preliminary pump flow estimate'),
      ),
      ModuleItem(
        fa: 'چک‌لیست طراحی و Shop Drawing',
        en: 'Design and shop drawing checklist',
        icon: Icons.fact_check_rounded,
        builder: (_) => ChecklistPage(language: lang),
      ),
      ModuleItem(
        fa: 'محاسبه مخزن آتش‌نشانی',
        en: 'Fire tank calculation',
        icon: Icons.water_rounded,
        definition: tankDefinition,
      ),
      ModuleItem(
        fa: 'دبی پمپ فقط اسپرینکلر',
        en: 'Pump capacity — sprinkler only',
        icon: Icons.opacity_rounded,
        definition: simpleFlowDefinition('دبی پمپ اسپرینکلر', 'Sprinkler pump capacity', 'sprinkler'),
      ),
      ModuleItem(
        fa: 'دبی پمپ فقط هوز/استندپایپ',
        en: 'Pump capacity — hose/standpipe only',
        icon: Icons.fire_hydrant_alt_rounded,
        definition: hosePumpDefinition,
      ),
      ModuleItem(
        fa: 'دبی پمپ سیستم ترکیبی',
        en: 'Pump capacity — combined system',
        icon: Icons.merge_rounded,
        definition: combinedPumpDefinition('دبی پمپ سیستم ترکیبی', 'Combined system pump capacity'),
      ),
      ModuleItem(
        fa: 'بانک قیمت تجهیزات',
        en: 'Equipment pricing',
        icon: Icons.sell_rounded,
        builder: (_) => PricingPage(language: lang),
      ),
    ];

List<ModuleItem> alarmItems(AppLanguage lang) => [
      ModuleItem(
        fa: 'جانمایی تجهیزات اعلام حریق',
        en: 'Fire alarm device placements',
        icon: Icons.sensors_rounded,
        definition: areaCoverageDefinition('برآورد تعداد تجهیزات', 'Device quantity estimate', 'سطح پوشش هر تجهیز', 'Coverage per device'),
      ),
      ModuleItem(
        fa: 'فاصله‌گذاری دتکتور دود',
        en: 'Smoke detector spacing',
        icon: Icons.detector_smoke_rounded,
        definition: roomGridDefinition('فاصله‌گذاری دتکتور دود', 'Smoke detector spacing'),
      ),
      ModuleItem(
        fa: 'فاصله‌گذاری دتکتور حرارتی',
        en: 'Heat detector spacing',
        icon: Icons.device_thermostat_rounded,
        definition: roomGridDefinition('فاصله‌گذاری دتکتور حرارتی', 'Heat detector spacing'),
      ),
      ModuleItem(
        fa: 'محاسبه افت ولتاژ مدار NAC',
        en: 'NAC voltage-drop estimate',
        icon: Icons.electric_bolt_rounded,
        definition: CalcDefinition(
          fa: 'افت ولتاژ NAC',
          en: 'NAC voltage-drop estimate',
          fields: const [
            CalcField(keyName: 'current', fa: 'جریان کل', en: 'Total current', unit: 'A'),
            CalcField(keyName: 'length', fa: 'طول یک‌طرفه مسیر', en: 'One-way circuit length', unit: 'm'),
            CalcField(keyName: 'resistance', fa: 'مقاومت هادی', en: 'Conductor resistance', unit: 'Ω/km'),
          ],
          calculate: (v) {
            final drop = v['current']! * 2 * v['length']! * v['resistance']! / 1000;
            return [CalcOutput(fa: 'افت ولتاژ', en: 'Voltage drop', value: drop, unit: 'V')];
          },
          referenceFa: 'محاسبه DC ساده بر اساس طول رفت‌وبرگشت و مقاومت هادی. محدودیت سازنده و استاندارد سیستم را کنترل کنید.',
          referenceEn: 'Simple DC calculation using round-trip conductor length. Verify manufacturer and code voltage limits.',
        ),
      ),
    ];

List<ModuleItem> smokeItems(AppLanguage lang) => [
      ModuleItem(
        fa: 'محاسبات عمومی تخلیه مکانیکی دود',
        en: 'Mechanical smoke exhaust — general',
        icon: Icons.air_rounded,
        definition: achDefinition('تخلیه مکانیکی دود', 'Mechanical smoke exhaust'),
      ),
      ModuleItem(
        fa: 'محاسبات تخلیه دود راهرو',
        en: 'Corridor smoke exhaust calculations',
        icon: Icons.meeting_room_rounded,
        definition: achDefinition('تخلیه دود راهرو', 'Corridor smoke exhaust'),
      ),
      ModuleItem(
        fa: 'محاسبات کنترل دود پارکینگ',
        en: 'Parking smoke control calculations',
        icon: Icons.local_parking_rounded,
        definition: parkingSmokeDefinition,
      ),
      ModuleItem(
        fa: 'محاسبات تخلیه دود انبار',
        en: 'Warehouse smoke exhaust calculations',
        icon: Icons.warehouse_rounded,
        definition: achDefinition('تخلیه دود انبار', 'Warehouse smoke exhaust'),
      ),
      ModuleItem(
        fa: 'محاسبات راه‌پله / فشار مثبت مقدماتی',
        en: 'Stair / pressurization preliminary calculations',
        icon: Icons.stairs_rounded,
        definition: CalcDefinition(
          fa: 'برآورد هوای فشار مثبت راه‌پله',
          en: 'Stair pressurization airflow estimate',
          fields: const [
            CalcField(keyName: 'openArea', fa: 'مساحت مؤثر بازشو/نشت', en: 'Effective leakage/open area', unit: 'm²'),
            CalcField(keyName: 'velocity', fa: 'سرعت هدف عبور هوا', en: 'Target air velocity', unit: 'm/s'),
            CalcField(keyName: 'margin', fa: 'ضریب اطمینان', en: 'Safety factor', unit: '-', initial: 1.15),
          ],
          calculate: (v) {
            final q = v['openArea']! * v['velocity']! * v['margin']!;
            return [
              CalcOutput(fa: 'دبی هوا', en: 'Airflow', value: q, unit: 'm³/s'),
              CalcOutput(fa: 'دبی هوا', en: 'Airflow', value: q * 3600, unit: 'm³/h'),
              CalcOutput(fa: 'دبی هوا', en: 'Airflow', value: q * 2118.88, unit: 'CFM'),
            ];
          },
          referenceFa: 'برآورد مقدماتی از رابطه Q=A×V. طراحی نهایی باید سناریوی درب‌ها، نشت، فشار مجاز و فن را طبق استاندارد پروژه بررسی کند.',
          referenceEn: 'Preliminary Q=A×V estimate. Final design must evaluate door scenarios, leakage, allowable pressure and fan selection per the adopted standard.',
        ),
      ),
    ];

List<ModuleItem> lifeSafetyItems(AppLanguage lang) => [
      ModuleItem(
        fa: 'محاسبه بار جمعیت',
        en: 'Occupant load calculations',
        icon: Icons.groups_rounded,
        definition: occupantLoadDefinition,
      ),
      ModuleItem(
        fa: 'عرض راه‌پله',
        en: 'Stair size',
        icon: Icons.stairs_rounded,
        definition: egressWidthDefinition('عرض لازم راه‌پله', 'Required stair width'),
      ),
      ModuleItem(
        fa: 'عرض رمپ و اجزای هم‌سطح',
        en: 'Size for ramp and level components',
        icon: Icons.horizontal_rule_rounded,
        definition: egressWidthDefinition('عرض رمپ و اجزای هم‌سطح', 'Ramp and level egress width'),
      ),
      ModuleItem(
        fa: 'ظرفیت نفر راه‌پله',
        en: 'Stair capacity person load',
        icon: Icons.people_outline_rounded,
        definition: egressCapacityDefinition('ظرفیت راه‌پله', 'Stair capacity'),
      ),
      ModuleItem(
        fa: 'ظرفیت نفر رمپ و اجزای هم‌سطح',
        en: 'Ramp and level components capacity',
        icon: Icons.groups_2_rounded,
        definition: egressCapacityDefinition('ظرفیت رمپ و اجزای هم‌سطح', 'Ramp and level component capacity'),
      ),
    ];

List<ModuleItem> cfpsItems(AppLanguage lang) => [
      ModuleItem(
        fa: 'تبدیل واحدهای مهندسی حریق',
        en: 'Fire engineering unit converter',
        icon: Icons.swap_horiz_rounded,
        builder: (_) => UnitConverterPage(language: lang),
      ),
      ModuleItem(
        fa: 'ماشین‌حساب هیدرولیکی پایه',
        en: 'Basic hydraulic calculator',
        icon: Icons.water_drop_rounded,
        definition: CalcDefinition(
          fa: 'رابطه اسپرینکلر Q=K√P',
          en: 'Sprinkler relation Q=K√P',
          fields: const [
            CalcField(keyName: 'k', fa: 'K-Factor', en: 'K-Factor', unit: 'L/min/√bar'),
            CalcField(keyName: 'p', fa: 'فشار', en: 'Pressure', unit: 'bar'),
          ],
          calculate: (v) => [
            CalcOutput(fa: 'دبی', en: 'Flow', value: v['k']! * math.sqrt(v['p']!), unit: 'L/min'),
          ],
          referenceFa: 'فرم عمومی Q=K√P با واحدهای سازگار. واحد K و فشار باید با هم سازگار باشند.',
          referenceEn: 'General Q=K√P relation using compatible units. K-factor and pressure units must be consistent.',
        ),
      ),
      ModuleItem(
        fa: 'راهنمای مباحث CFPS',
        en: 'CFPS topic map',
        icon: Icons.menu_book_rounded,
        builder: (_) => CfpsGuidePage(language: lang),
      ),
    ];

CalcDefinition areaCoverageDefinition(String fa, String en, String factorFa, String factorEn) => CalcDefinition(
      fa: fa,
      en: en,
      fields: [
        const CalcField(keyName: 'area', fa: 'مساحت', en: 'Area', unit: 'm²'),
        CalcField(keyName: 'coverage', fa: factorFa, en: factorEn, unit: 'm²/device'),
      ],
      calculate: (v) {
        final c = math.max(v['coverage']!, .001);
        final count = (v['area']! / c).ceilToDouble();
        return [CalcOutput(fa: 'تعداد تقریبی', en: 'Estimated quantity', value: count, unit: 'pcs')];
      },
      referenceFa: 'سطح پوشش را بر اساس نوع تجهیز، ارتفاع، هندسه، خطر و استاندارد مصوب وارد کنید.',
      referenceEn: 'Enter the coverage area required for the actual device, ceiling height, geometry, hazard and adopted standard.',
    );

CalcDefinition roomGridDefinition(String fa, String en) => CalcDefinition(
      fa: fa,
      en: en,
      fields: const [
        CalcField(keyName: 'length', fa: 'طول فضا', en: 'Room length', unit: 'm'),
        CalcField(keyName: 'width', fa: 'عرض فضا', en: 'Room width', unit: 'm'),
        CalcField(keyName: 'spacing', fa: 'حداکثر فاصله مجاز', en: 'Maximum spacing', unit: 'm'),
      ],
      calculate: (v) {
        final s = math.max(v['spacing']!, .001);
        final nx = math.max(1, (v['length']! / s).ceil());
        final ny = math.max(1, (v['width']! / s).ceil());
        return [
          CalcOutput(fa: 'تعداد در امتداد طول', en: 'Count along length', value: nx.toDouble(), unit: 'pcs'),
          CalcOutput(fa: 'تعداد در امتداد عرض', en: 'Count along width', value: ny.toDouble(), unit: 'pcs'),
          CalcOutput(fa: 'تعداد کل تقریبی', en: 'Estimated total', value: (nx * ny).toDouble(), unit: 'pcs'),
        ];
      },
      referenceFa: 'فاصله مجاز را از استاندارد و ضوابط تجهیز منتخب وارد کنید. موانع، تیرها، شیب سقف و شرایط ویژه باید جداگانه کنترل شوند.',
      referenceEn: 'Use the maximum spacing from the adopted standard and selected device criteria. Obstructions, beams, ceiling slope and special conditions require separate review.',
    );

CalcDefinition achDefinition(String fa, String en) => CalcDefinition(
      fa: fa,
      en: en,
      fields: const [
        CalcField(keyName: 'area', fa: 'مساحت', en: 'Area', unit: 'm²'),
        CalcField(keyName: 'height', fa: 'ارتفاع مؤثر', en: 'Effective height', unit: 'm'),
        CalcField(keyName: 'ach', fa: 'تعداد تعویض هوا', en: 'Air changes', unit: 'ACH'),
      ],
      calculate: (v) {
        final volume = v['area']! * v['height']!;
        final m3h = volume * v['ach']!;
        return [
          CalcOutput(fa: 'حجم فضا', en: 'Volume', value: volume, unit: 'm³'),
          CalcOutput(fa: 'دبی تخلیه', en: 'Exhaust airflow', value: m3h, unit: 'm³/h'),
          CalcOutput(fa: 'دبی تخلیه', en: 'Exhaust airflow', value: m3h * 0.588578, unit: 'CFM'),
        ];
      },
      referenceFa: 'روش ACH فقط برای برآورد اولیه قابل استفاده است؛ معیار طراحی واقعی باید از ضابطه مصوب، سناریوی حریق و اهداف عملکردی پروژه تعیین شود.',
      referenceEn: 'ACH is a preliminary sizing method only. Final design criteria must come from the adopted code, fire scenario and project performance objectives.',
    );

final CalcDefinition parkingSmokeDefinition = CalcDefinition(
  fa: 'کنترل دود پارکینگ',
  en: 'Parking smoke control',
  fields: const [
    CalcField(keyName: 'area', fa: 'مساحت پارکینگ', en: 'Parking area', unit: 'm²'),
    CalcField(keyName: 'height', fa: 'ارتفاع مؤثر', en: 'Effective height', unit: 'm'),
    CalcField(keyName: 'ach', fa: 'تعویض هوا / معیار طراحی', en: 'Air changes / design rate', unit: 'ACH'),
    CalcField(keyName: 'fresh', fa: 'درصد هوای جبرانی', en: 'Make-up air percentage', unit: '%', initial: 60),
  ],
  calculate: (v) {
    final volume = v['area']! * v['height']!;
    final exhaust = volume * v['ach']!;
    final supply = exhaust * v['fresh']! / 100;
    return [
      CalcOutput(fa: 'حجم پارکینگ', en: 'Parking volume', value: volume, unit: 'm³'),
      CalcOutput(fa: 'هوای تخلیه', en: 'Exhaust airflow', value: exhaust, unit: 'm³/h'),
      CalcOutput(fa: 'هوای جبرانی', en: 'Make-up airflow', value: supply, unit: 'm³/h'),
      CalcOutput(fa: 'هوای تخلیه', en: 'Exhaust airflow', value: exhaust * 0.588578, unit: 'CFM'),
      CalcOutput(fa: 'هوای جبرانی', en: 'Make-up airflow', value: supply * 0.588578, unit: 'CFM'),
    ];
  },
  referenceFa: 'برآورد اولیه بر اساس حجم و نرخ تعویض هوا. طراحی نهایی باید هندسه، زون‌بندی، محل دریچه‌ها، سرعت هوا، افت فشار و سناریوی حریق را کنترل کند.',
  referenceEn: 'Preliminary volume/ACH sizing. Final design must check geometry, zoning, grille layout, velocities, pressure loss and the fire scenario.',
);

final CalcDefinition occupantLoadDefinition = CalcDefinition(
  fa: 'محاسبه بار جمعیت',
  en: 'Occupant load',
  fields: const [
    CalcField(keyName: 'area', fa: 'مساحت خالص/ناخالص مبنا', en: 'Applicable floor area', unit: 'm²'),
    CalcField(keyName: 'factor', fa: 'ضریب بار جمعیت', en: 'Occupant load factor', unit: 'm²/person'),
  ],
  calculate: (v) => [
    CalcOutput(fa: 'بار جمعیت', en: 'Occupant load', value: (v['area']! / math.max(v['factor']!, .001)).ceilToDouble(), unit: 'persons'),
  ],
  referenceFa: 'ضریب بار جمعیت را بر اساس کاربری و ویرایش ضابطه مصوب پروژه وارد کنید.',
  referenceEn: 'Enter the occupant-load factor for the actual occupancy and adopted code edition.',
);

CalcDefinition egressWidthDefinition(String fa, String en) => CalcDefinition(
      fa: fa,
      en: en,
      fields: const [
        CalcField(keyName: 'occupants', fa: 'تعداد نفرات مبنا', en: 'Design occupants', unit: 'persons'),
        CalcField(keyName: 'factor', fa: 'ضریب عرض به ازای هر نفر', en: 'Width factor per person', unit: 'mm/person'),
        CalcField(keyName: 'minimum', fa: 'حداقل عرض ضابطه‌ای', en: 'Code minimum width', unit: 'mm'),
      ],
      calculate: (v) {
        final calc = v['occupants']! * v['factor']!;
        final required = math.max(calc, v['minimum']!);
        return [
          CalcOutput(fa: 'عرض محاسباتی', en: 'Calculated width', value: calc, unit: 'mm'),
          CalcOutput(fa: 'عرض موردنیاز', en: 'Required width', value: required, unit: 'mm'),
        ];
      },
      referenceFa: 'ضریب عرض و حداقل عرض باید از ضابطه مصوب و شرایط ساختمان استخراج و وارد شود.',
      referenceEn: 'Width factor and minimum width must be taken from the adopted code and actual building conditions.',
    );

CalcDefinition egressCapacityDefinition(String fa, String en) => CalcDefinition(
      fa: fa,
      en: en,
      fields: const [
        CalcField(keyName: 'width', fa: 'عرض خالص موجود', en: 'Available clear width', unit: 'mm'),
        CalcField(keyName: 'factor', fa: 'ضریب عرض به ازای هر نفر', en: 'Width factor per person', unit: 'mm/person'),
      ],
      calculate: (v) => [
        CalcOutput(fa: 'ظرفیت تقریبی', en: 'Estimated capacity', value: (v['width']! / math.max(v['factor']!, .001)).floorToDouble(), unit: 'persons'),
      ],
      referenceFa: 'ضریب عرض را مطابق ضابطه مصوب، شرایط اسپرینکلر، نوع مسیر خروج و الزامات پروژه وارد کنید.',
      referenceEn: 'Enter the width factor applicable to the adopted code, sprinkler condition, egress component and project requirements.',
    );

final CalcDefinition tankDefinition = CalcDefinition(
  fa: 'محاسبه مخزن آتش‌نشانی',
  en: 'Fire water tank calculation',
  fields: const [
    CalcField(keyName: 'flow', fa: 'دبی طراحی', en: 'Design flow', unit: 'L/min'),
    CalcField(keyName: 'duration', fa: 'مدت تأمین آب', en: 'Required duration', unit: 'min'),
    CalcField(keyName: 'reserve', fa: 'ذخیره/حاشیه اضافه', en: 'Additional reserve', unit: '%', initial: 0),
  ],
  calculate: (v) {
    final base = v['flow']! * v['duration']!;
    final total = base * (1 + v['reserve']! / 100);
    return [
      CalcOutput(fa: 'حجم پایه', en: 'Base volume', value: base, unit: 'L'),
      CalcOutput(fa: 'حجم نهایی', en: 'Final volume', value: total / 1000, unit: 'm³'),
    ];
  },
  referenceFa: 'دبی و زمان موردنیاز را بر اساس سیستم‌های همزمان، خطر و استاندارد مصوب پروژه وارد کنید.',
  referenceEn: 'Enter the required flow and duration for simultaneous systems, hazard and adopted standard.',
);

CalcDefinition simpleFlowDefinition(String fa, String en, String key) => CalcDefinition(
      fa: fa,
      en: en,
      fields: const [
        CalcField(keyName: 'flow', fa: 'دبی طراحی سیستم', en: 'System design flow', unit: 'L/min'),
        CalcField(keyName: 'margin', fa: 'حاشیه ظرفیت', en: 'Capacity margin', unit: '%', initial: 0),
      ],
      calculate: (v) {
        final q = v['flow']! * (1 + v['margin']! / 100);
        return [
          CalcOutput(fa: 'دبی پمپ', en: 'Pump flow', value: q, unit: 'L/min'),
          CalcOutput(fa: 'دبی پمپ', en: 'Pump flow', value: q / 3.78541, unit: 'gpm'),
        ];
      },
      referenceFa: 'دبی طراحی را از محاسبات هیدرولیکی و معیار سیستم استخراج کنید.',
      referenceEn: 'Use the design flow from hydraulic calculations and the applicable system criteria.',
    );

final CalcDefinition hosePumpDefinition = CalcDefinition(
  fa: 'دبی پمپ هوز/استندپایپ',
  en: 'Hose/standpipe pump capacity',
  fields: const [
    CalcField(keyName: 'outlet', fa: 'دبی هر خروجی فعال', en: 'Flow per active outlet', unit: 'L/min'),
    CalcField(keyName: 'count', fa: 'تعداد خروجی همزمان', en: 'Simultaneous outlets', unit: 'pcs'),
    CalcField(keyName: 'margin', fa: 'حاشیه ظرفیت', en: 'Capacity margin', unit: '%', initial: 0),
  ],
  calculate: (v) {
    final q = v['outlet']! * v['count']! * (1 + v['margin']! / 100);
    return [
      CalcOutput(fa: 'دبی پمپ', en: 'Pump flow', value: q, unit: 'L/min'),
      CalcOutput(fa: 'دبی پمپ', en: 'Pump flow', value: q / 3.78541, unit: 'gpm'),
    ];
  },
  referenceFa: 'تعداد خروجی‌های همزمان و دبی هر خروجی را مطابق کلاس سیستم و ضابطه مصوب وارد کنید.',
  referenceEn: 'Enter simultaneous outlet count and required flow per outlet for the actual system class and adopted standard.',
);

CalcDefinition combinedPumpDefinition(String fa, String en) => CalcDefinition(
      fa: fa,
      en: en,
      fields: const [
        CalcField(keyName: 'sprinkler', fa: 'دبی اسپرینکلر', en: 'Sprinkler demand', unit: 'L/min'),
        CalcField(keyName: 'hose', fa: 'دبی هوز/استندپایپ همزمان', en: 'Concurrent hose/standpipe demand', unit: 'L/min'),
        CalcField(keyName: 'margin', fa: 'حاشیه ظرفیت', en: 'Capacity margin', unit: '%', initial: 0),
      ],
      calculate: (v) {
        final q = (v['sprinkler']! + v['hose']!) * (1 + v['margin']! / 100);
        return [
          CalcOutput(fa: 'دبی ترکیبی', en: 'Combined flow', value: q, unit: 'L/min'),
          CalcOutput(fa: 'دبی ترکیبی', en: 'Combined flow', value: q / 3.78541, unit: 'gpm'),
        ];
      },
      referenceFa: 'همزمانی سیستم‌ها باید طبق ضابطه مصوب و سناریوی طراحی پروژه تعیین شود.',
      referenceEn: 'System concurrency must be determined from the adopted code and project design scenario.',
    );

class PipeSchedulePage extends StatelessWidget {
  const PipeSchedulePage({super.key, required this.language, required this.titleFa, required this.titleEn});
  final AppLanguage language;
  final String titleFa;
  final String titleEn;

  @override
  Widget build(BuildContext context) {
    final rows = const [
      ['1"', '1–2', '25 mm'],
      ['1¼"', '2–3', '32 mm'],
      ['1½"', '3–5', '40 mm'],
      ['2"', '5–10', '50 mm'],
      ['2½"', '10–20', '65 mm'],
      ['3"', '20+', '80 mm'],
    ];
    return Scaffold(
      appBar: AppBar(title: Text(tr(language, titleFa, titleEn))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _InfoCard(
            icon: Icons.warning_amber_rounded,
            title: tr(language, 'جدول آموزشی/اولیه', 'Preliminary training table'),
            text: tr(
              language,
              'این جدول جایگزین محاسبات هیدرولیکی یا جدول Pipe Schedule مصوب پروژه نیست. تعداد و قطر نهایی باید بر اساس استاندارد، نوع خطر و شبکه واقعی کنترل شود.',
              'This table does not replace hydraulic calculations or an adopted pipe-schedule table. Final pipe sizes must be verified for the actual hazard, standard and network.',
            ),
          ),
          const SizedBox(height: 16),
          ...rows.map((r) => Container(
                margin: const EdgeInsets.only(bottom: 9),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: kSurface, borderRadius: BorderRadius.circular(16)),
                child: Row(
                  children: [
                    Expanded(child: Text(r[0], textDirection: TextDirection.ltr, style: const TextStyle(fontWeight: FontWeight.w800))),
                    Expanded(child: Text('${tr(language, 'تعداد خروجی تقریبی', 'Approx. outlets')}: ${r[1]}')),
                    Text(r[2], textDirection: TextDirection.ltr, style: const TextStyle(color: kTextMuted)),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}

class ChecklistPage extends StatefulWidget {
  const ChecklistPage({super.key, required this.language});
  final AppLanguage language;

  @override
  State<ChecklistPage> createState() => _ChecklistPageState();
}

class _ChecklistPageState extends State<ChecklistPage> {
  final List<bool> checked = List.filled(10, false);

  @override
  Widget build(BuildContext context) {
    final fa = [
      'کاربری و طبقه‌بندی خطر مشخص است',
      'منبع آب و دبی/فشار مبنا مشخص است',
      'زون‌بندی سیستم مشخص است',
      'جانمایی اسپرینکلرها و موانع کنترل شده',
      'مسیر لوله و رایزرها کنترل شده',
      'هوزریل/هیدرانت و پوشش مسیر کنترل شده',
      'اتاق پمپ و دسترسی تعمیرات کنترل شده',
      'شیرآلات، تست و درین جانمایی شده',
      'هماهنگی معماری/سازه/مکانیک انجام شده',
      'یادداشت‌ها، علائم و مشخصات نقشه تکمیل است',
    ];
    final en = [
      'Occupancy and hazard classification defined',
      'Water supply and design flow/pressure defined',
      'System zoning defined',
      'Sprinkler layout and obstructions reviewed',
      'Pipe routing and risers reviewed',
      'Hose/hydrant coverage reviewed',
      'Pump room and maintenance access reviewed',
      'Valves, test and drain points located',
      'Architectural/structural/MEP coordination completed',
      'Notes, symbols and drawing data completed',
    ];
    return Scaffold(
      appBar: AppBar(title: Text(tr(widget.language, 'چک‌لیست طراحی و Shop Drawing', 'Design & shop drawing checklist'))),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: fa.length,
        itemBuilder: (context, i) => Card(
          color: kSurface,
          child: CheckboxListTile(
            value: checked[i],
            activeColor: kGreen,
            onChanged: (v) => setState(() => checked[i] = v ?? false),
            title: Text(tr(widget.language, fa[i], en[i])),
          ),
        ),
      ),
    );
  }
}

class CustomersLanding extends StatelessWidget {
  const CustomersLanding({super.key, required this.language});
  final AppLanguage language;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 18, 16, 32),
      children: [
        _HomeAction(
          color: const Color(0xFFE65440),
          icon: Icons.sell_rounded,
          title: tr(language, 'قیمت تجهیزات', 'Pricing'),
          subtitle: tr(language, 'بانک قیمت محلی و قابل ویرایش', 'Editable local equipment price book'),
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => PricingPage(language: language))),
        ),
        const SizedBox(height: 12),
        _HomeAction(
          color: const Color(0xFFE65440),
          icon: Icons.person_add_alt_1_rounded,
          title: tr(language, 'مشتریان', 'Customers'),
          subtitle: tr(language, 'ثبت، جستجو و مدیریت اطلاعات مشتری', 'Add, search and manage customer records'),
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => CustomersPage(language: language))),
        ),
      ],
    );
  }
}

class _HomeAction extends StatelessWidget {
  const _HomeAction({required this.color, required this.icon, required this.title, required this.subtitle, required this.onTap});
  final Color color;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: kSurface,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(17),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(color: color.withValues(alpha: .15), borderRadius: BorderRadius.circular(15)),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
                    const SizedBox(height: 3),
                    Text(subtitle, style: const TextStyle(color: kTextMuted, fontSize: 12.5)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded, color: kTextMuted),
            ],
          ),
        ),
      ),
    );
  }
}

class CustomerRecord {
  CustomerRecord({required this.name, required this.phone, required this.company, required this.note});
  String name;
  String phone;
  String company;
  String note;

  Map<String, dynamic> toJson() => {'name': name, 'phone': phone, 'company': company, 'note': note};
  factory CustomerRecord.fromJson(Map<String, dynamic> j) => CustomerRecord(
        name: j['name']?.toString() ?? '',
        phone: j['phone']?.toString() ?? '',
        company: j['company']?.toString() ?? '',
        note: j['note']?.toString() ?? '',
      );
}

class CustomersPage extends StatefulWidget {
  const CustomersPage({super.key, required this.language});
  final AppLanguage language;

  @override
  State<CustomersPage> createState() => _CustomersPageState();
}

class _CustomersPageState extends State<CustomersPage> {
  List<CustomerRecord> _items = [];
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString('customers');
    if (raw != null) {
      try {
        final list = jsonDecode(raw) as List;
        _items = list.map((e) => CustomerRecord.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      } catch (_) {}
    }
    if (mounted) setState(() {});
  }

  Future<void> _save() async {
    final p = await SharedPreferences.getInstance();
    await p.setString('customers', jsonEncode(_items.map((e) => e.toJson()).toList()));
  }

  Future<void> _add() async {
    final result = await showDialog<CustomerRecord>(
      context: context,
      builder: (_) => CustomerEditor(language: widget.language),
    );
    if (result != null) {
      setState(() => _items.add(result));
      await _save();
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = _query.toLowerCase();
    final filtered = _items.where((e) => '${e.name} ${e.phone} ${e.company}'.toLowerCase().contains(q)).toList();
    return Scaffold(
      appBar: AppBar(title: Text(tr(widget.language, 'مشتریان', 'Customers'))),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: kRed,
        onPressed: _add,
        icon: const Icon(Icons.add_rounded),
        label: Text(tr(widget.language, 'مشتری جدید', 'New customer')),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search_rounded), hintText: tr(widget.language, 'جستجو...', 'Search...')),
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? Center(child: Text(tr(widget.language, 'مشتری ثبت نشده است.', 'No customers yet.'), style: const TextStyle(color: kTextMuted)))
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                    itemCount: filtered.length,
                    itemBuilder: (_, i) {
                      final c = filtered[i];
                      return Card(
                        color: kSurface,
                        child: ListTile(
                          leading: CircleAvatar(backgroundColor: kRed.withValues(alpha: .15), child: const Icon(Icons.person_rounded, color: kRed)),
                          title: Text(c.name.isEmpty ? tr(widget.language, 'بدون نام', 'Unnamed') : c.name),
                          subtitle: Text([c.company, c.phone].where((e) => e.isNotEmpty).join(' • '), textDirection: TextDirection.ltr),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_outline_rounded),
                            onPressed: () async {
                              setState(() => _items.remove(c));
                              await _save();
                            },
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

class CustomerEditor extends StatefulWidget {
  const CustomerEditor({super.key, required this.language});
  final AppLanguage language;

  @override
  State<CustomerEditor> createState() => _CustomerEditorState();
}

class _CustomerEditorState extends State<CustomerEditor> {
  final name = TextEditingController();
  final phone = TextEditingController();
  final company = TextEditingController();
  final note = TextEditingController();

  @override
  void dispose() {
    name.dispose();
    phone.dispose();
    company.dispose();
    note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: kSurface,
      title: Text(tr(widget.language, 'مشتری جدید', 'New customer')),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: name, decoration: InputDecoration(labelText: tr(widget.language, 'نام', 'Name'))),
            const SizedBox(height: 10),
            TextField(controller: phone, textDirection: TextDirection.ltr, keyboardType: TextInputType.phone, decoration: InputDecoration(labelText: tr(widget.language, 'تلفن', 'Phone'))),
            const SizedBox(height: 10),
            TextField(controller: company, decoration: InputDecoration(labelText: tr(widget.language, 'شرکت / پروژه', 'Company / project'))),
            const SizedBox(height: 10),
            TextField(controller: note, maxLines: 3, decoration: InputDecoration(labelText: tr(widget.language, 'یادداشت', 'Note'))),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(tr(widget.language, 'انصراف', 'Cancel'))),
        FilledButton(
          onPressed: () => Navigator.pop(context, CustomerRecord(name: name.text.trim(), phone: phone.text.trim(), company: company.text.trim(), note: note.text.trim())),
          child: Text(tr(widget.language, 'ذخیره', 'Save')),
        ),
      ],
    );
  }
}

class PriceRecord {
  PriceRecord({required this.nameFa, required this.nameEn, required this.brand, required this.price, required this.unit});
  String nameFa;
  String nameEn;
  String brand;
  double price;
  String unit;

  Map<String, dynamic> toJson() => {'nameFa': nameFa, 'nameEn': nameEn, 'brand': brand, 'price': price, 'unit': unit};
  factory PriceRecord.fromJson(Map<String, dynamic> j) => PriceRecord(
        nameFa: j['nameFa']?.toString() ?? '',
        nameEn: j['nameEn']?.toString() ?? '',
        brand: j['brand']?.toString() ?? '',
        price: (j['price'] as num?)?.toDouble() ?? 0,
        unit: j['unit']?.toString() ?? 'تومان',
      );
}

class PricingPage extends StatefulWidget {
  const PricingPage({super.key, required this.language});
  final AppLanguage language;

  @override
  State<PricingPage> createState() => _PricingPageState();
}

class _PricingPageState extends State<PricingPage> {
  List<PriceRecord> _items = [];
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString('prices');
    if (raw != null) {
      try {
        final list = jsonDecode(raw) as List;
        _items = list.map((e) => PriceRecord.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      } catch (_) {}
    }
    if (mounted) setState(() {});
  }

  Future<void> _save() async {
    final p = await SharedPreferences.getInstance();
    await p.setString('prices', jsonEncode(_items.map((e) => e.toJson()).toList()));
  }

  Future<void> _add() async {
    final result = await showDialog<PriceRecord>(context: context, builder: (_) => PriceEditor(language: widget.language));
    if (result != null) {
      setState(() => _items.add(result));
      await _save();
    }
  }

  @override
  Widget build(BuildContext context) {
    final q = _query.toLowerCase();
    final filtered = _items.where((e) => '${e.nameFa} ${e.nameEn} ${e.brand}'.toLowerCase().contains(q)).toList();
    return Scaffold(
      appBar: AppBar(title: Text(tr(widget.language, 'قیمت تجهیزات', 'Pricing'))),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: kBlue,
        onPressed: _add,
        icon: const Icon(Icons.add_rounded),
        label: Text(tr(widget.language, 'افزودن کالا', 'Add item')),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search_rounded), hintText: tr(widget.language, 'جستجوی کالا یا برند...', 'Search item or brand...')),
            ),
          ),
          if (_items.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _InfoCard(
                icon: Icons.info_outline_rounded,
                title: tr(widget.language, 'بانک قیمت محلی', 'Local price book'),
                text: tr(widget.language, 'برای جلوگیری از نمایش قیمت قدیمی، بانک قیمت با داده ثابت پر نشده است. کالا و قیمت روز خود را اضافه کنید.', 'To avoid stale pricing, no fixed market prices are preloaded. Add your own current items and prices.'),
              ),
            ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 100),
              itemCount: filtered.length,
              itemBuilder: (_, i) {
                final p = filtered[i];
                return Card(
                  color: kSurface,
                  child: ListTile(
                    title: Text(widget.language == AppLanguage.fa ? p.nameFa : (p.nameEn.isEmpty ? p.nameFa : p.nameEn)),
                    subtitle: Text(p.brand),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(fmt(p.price, decimals: 0), textDirection: TextDirection.ltr, style: const TextStyle(fontWeight: FontWeight.w800)),
                        Text(p.unit, style: const TextStyle(color: kTextMuted, fontSize: 11)),
                      ],
                    ),
                    onLongPress: () async {
                      setState(() => _items.remove(p));
                      await _save();
                    },
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

class PriceEditor extends StatefulWidget {
  const PriceEditor({super.key, required this.language});
  final AppLanguage language;

  @override
  State<PriceEditor> createState() => _PriceEditorState();
}

class _PriceEditorState extends State<PriceEditor> {
  final fa = TextEditingController();
  final en = TextEditingController();
  final brand = TextEditingController();
  final price = TextEditingController();
  final unit = TextEditingController(text: 'تومان');

  @override
  void dispose() {
    fa.dispose();
    en.dispose();
    brand.dispose();
    price.dispose();
    unit.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: kSurface,
      title: Text(tr(widget.language, 'افزودن کالا', 'Add item')),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: fa, decoration: InputDecoration(labelText: tr(widget.language, 'نام فارسی', 'Persian name'))),
            const SizedBox(height: 10),
            TextField(controller: en, textDirection: TextDirection.ltr, decoration: const InputDecoration(labelText: 'English name')),
            const SizedBox(height: 10),
            TextField(controller: brand, decoration: InputDecoration(labelText: tr(widget.language, 'برند', 'Brand'))),
            const SizedBox(height: 10),
            TextField(controller: price, textDirection: TextDirection.ltr, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: tr(widget.language, 'قیمت', 'Price'))),
            const SizedBox(height: 10),
            TextField(controller: unit, decoration: InputDecoration(labelText: tr(widget.language, 'واحد پول', 'Currency'))),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(tr(widget.language, 'انصراف', 'Cancel'))),
        FilledButton(
          onPressed: () {
            final p = double.tryParse(price.text.trim().replaceAll(',', '.'));
            if (p == null) return;
            Navigator.pop(context, PriceRecord(nameFa: fa.text.trim(), nameEn: en.text.trim(), brand: brand.text.trim(), price: p, unit: unit.text.trim().isEmpty ? 'تومان' : unit.text.trim()));
          },
          child: Text(tr(widget.language, 'ذخیره', 'Save')),
        ),
      ],
    );
  }
}

class UnitConverterPage extends StatefulWidget {
  const UnitConverterPage({super.key, required this.language});
  final AppLanguage language;

  @override
  State<UnitConverterPage> createState() => _UnitConverterPageState();
}

class _UnitConverterPageState extends State<UnitConverterPage> {
  final controller = TextEditingController();
  String type = 'flow';
  double? result;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void convert() {
    final v = double.tryParse(controller.text.trim().replaceAll(',', '.'));
    if (v == null) return;
    setState(() {
      if (type == 'flow') result = v * 3.78541;
      if (type == 'pressure') result = v * 0.0689476;
      if (type == 'air') result = v * 1.69901;
    });
  }

  @override
  Widget build(BuildContext context) {
    final label = type == 'flow' ? 'gpm → L/min' : type == 'pressure' ? 'psi → bar' : 'CFM → m³/h';
    final unit = type == 'flow' ? 'L/min' : type == 'pressure' ? 'bar' : 'm³/h';
    return Scaffold(
      appBar: AppBar(title: Text(tr(widget.language, 'تبدیل واحد', 'Unit converter'))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'flow', label: Text('Flow')),
              ButtonSegment(value: 'pressure', label: Text('Pressure')),
              ButtonSegment(value: 'air', label: Text('Airflow')),
            ],
            selected: {type},
            onSelectionChanged: (s) => setState(() { type = s.first; result = null; }),
          ),
          const SizedBox(height: 20),
          Text(label, textDirection: TextDirection.ltr, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 12),
          TextField(controller: controller, textDirection: TextDirection.ltr, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Value')),
          const SizedBox(height: 14),
          FilledButton(onPressed: convert, child: Text(tr(widget.language, 'تبدیل', 'Convert'))),
          if (result != null) ...[
            const SizedBox(height: 22),
            Center(child: Text('${fmt(result!)} $unit', textDirection: TextDirection.ltr, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900))),
          ],
        ],
      ),
    );
  }
}

class CfpsGuidePage extends StatelessWidget {
  const CfpsGuidePage({super.key, required this.language});
  final AppLanguage language;

  @override
  Widget build(BuildContext context) {
    final fa = ['علوم حریق', 'ایمنی حریق ساختمان', 'سیستم‌های اعلام حریق', 'سیستم‌های اطفای آبی', 'سیستم‌های اطفای ویژه', 'کنترل دود', 'مدیریت ریسک و بازرسی'];
    final en = ['Fire science', 'Building fire safety', 'Fire alarm systems', 'Water-based suppression', 'Special suppression systems', 'Smoke control', 'Risk management & inspection'];
    return Scaffold(
      appBar: AppBar(title: Text(tr(language, 'راهنمای مباحث CFPS', 'CFPS topic map'))),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: fa.length,
        itemBuilder: (_, i) => Card(
          color: kSurface,
          child: ListTile(
            leading: CircleAvatar(backgroundColor: kBlue.withValues(alpha: .15), child: Text('${i + 1}', style: const TextStyle(color: kBlue, fontWeight: FontWeight.bold))),
            title: Text(tr(language, fa[i], en[i])),
            subtitle: Text(tr(language, 'برای مطالعه، استانداردها و منابع رسمی روز را مبنا قرار دهید.', 'Use current official standards and references for study.'), style: const TextStyle(color: kTextMuted, fontSize: 12)),
          ),
        ),
      ),
    );
  }
}
