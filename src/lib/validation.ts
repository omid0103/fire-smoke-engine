export type ValidationTone = 'ok' | 'info' | 'warn' | 'danger'
export type ValidationLevel =
  | 'validated_kernel'
  | 'validated_limited_model'
  | 'project_basis_required'
  | 'preliminary_only'
  | 'legacy_reference_only'

export type ValidationProfile = {
  level: ValidationLevel
  labelFa: string
  tone: ValidationTone
  summaryFa: string
  basis: string[]
  limitations: string[]
  validatedWithinScope: boolean
}

const validatedKernel = (summaryFa: string, basis: string[], limitations: string[] = []): ValidationProfile => ({
  level: 'validated_kernel',
  labelFa: 'هسته محاسبات اعتبارسنجی‌شده',
  tone: 'ok',
  summaryFa,
  basis,
  limitations,
  validatedWithinScope: true,
})

const limitedModel = (summaryFa: string, basis: string[], limitations: string[]): ValidationProfile => ({
  level: 'validated_limited_model',
  labelFa: 'مدل محدود اعتبارسنجی‌شده',
  tone: 'info',
  summaryFa,
  basis,
  limitations,
  validatedWithinScope: true,
})

const conditional = (summaryFa: string, basis: string[], limitations: string[]): ValidationProfile => ({
  level: 'project_basis_required',
  labelFa: 'مبنای پروژه / AHJ الزامی',
  tone: 'warn',
  summaryFa,
  basis,
  limitations,
  validatedWithinScope: false,
})

const preliminary = (summaryFa: string, basis: string[], limitations: string[]): ValidationProfile => ({
  level: 'preliminary_only',
  labelFa: 'فقط پیش‌محاسبه',
  tone: 'warn',
  summaryFa,
  basis,
  limitations,
  validatedWithinScope: false,
})

const legacy = (summaryFa: string, basis: string[], limitations: string[]): ValidationProfile => ({
  level: 'legacy_reference_only',
  labelFa: 'مرجع قدیمی / غیرقابل استفاده برای طراحی نهایی',
  tone: 'danger',
  summaryFa,
  basis,
  limitations,
  validatedWithinScope: false,
})

const PROFILES: Record<string, ValidationProfile> = {
  hydraulic_network: validatedKernel(
    'حل پایای شبکه آب از نظر موازنه جرم، جهت جریان، افت Hazen–Williams و emitter با آزمون‌های بسته و مستقل کنترل شده است.',
    ['EPA EPANET 2.2 hydraulic modeling reference', 'Independent analytic/bisection regression cases', 'Server-side persisted calculation records'],
    ['انتخاب خودکار Remote Area، منحنی پمپ، شیرهای کنترلی ویژه و سناریوهای گذرا در این حل‌گر پوشش کامل ندارند.']
  ),
  airflow_network: validatedKernel(
    'حل پایای شبکه فشار/جریان بر پایه رابطه power-law و موازنه گره‌ای با حالت‌های تحلیلی مستقل کنترل شده است.',
    ['NIST CONTAM 3.4 airflow-network methodology reference', 'Independent closed-form pressure/flow cases', 'Mass-balance residual and non-convergence rejection'],
    ['این حل‌گر معادل CONTAM نیست و انتقال حرارت، شناوری کامل، بازشوهای بزرگ دوطرفه و منحنی فن را به‌صورت کامل مدل نمی‌کند.']
  ),
  hazen_williams: validatedKernel(
    'رابطه متریک Hazen–Williams و تبدیل افت هد/فشار با محاسبه مستقل آزمون شده است.',
    ['EPA EPANET 2.2 headloss reference', 'Independent arithmetic regression'],
    ['C-factor، قطر داخلی و قابلیت استفاده از Hazen–Williams باید از مبنای پروژه انتخاب شوند.']
  ),
  duct_velocity: validatedKernel(
    'رابطه پیوستگی Q=Av و محاسبه قطر هیدرولیکی مقطع مستطیلی به‌صورت مستقل آزمون شده است.',
    ['Continuity relation Q = A×v', 'Independent unit-conversion regression'],
    ['حد مجاز سرعت یک معیار طراحی پروژه/AHJ است و از خود رابطه پیوستگی نتیجه نمی‌شود.']
  ),
  fire_alarm_battery: validatedKernel(
    'محاسبه بار Ah بر اساس جریان و زمان و اعمال ضریب ورودی، از نظر حسابی اعتبارسنجی شده است.',
    ['DC charge arithmetic', 'Independent regression tests'],
    ['زمان standby/alarm، derating، دما، ageing و margin باید از استاندارد و سازنده پروژه تعیین شوند.']
  ),
  voltage_drop: validatedKernel(
    'افت ولتاژ مدار دو سیمه با مقاومت ویژه، طول رفت و برگشت و سطح مقطع از نظر حسابی اعتبارسنجی شده است.',
    ['Ohmic voltage-drop relation', 'Independent regression tests'],
    ['حد پذیرش افت ولتاژ تابع تجهیز، دیتاشیت و استاندارد پروژه است.']
  ),
  npsha: validatedKernel(
    'رابطه انرژی NPSHa با فشار اتمسفر، فشار بخار، هد استاتیک و افت مکش از نظر حسابی اعتبارسنجی شده است.',
    ['General pump suction energy relation', 'Independent regression tests'],
    ['پذیرش نهایی نیازمند مقایسه با NPSHr سازنده در دبی واقعی و حاشیه موردنیاز است.']
  ),
  atrium_axisymmetric: limitedModel(
    'معادلات ستون دود محورمتقارن و تبدیل دبی جرمی به حجمی با نمونه‌های مستقل کنترل شده‌اند.',
    ['NISTIR 5516 historical atrium-plume model', 'Independent equation regression'],
    ['فقط plume محورمتقارن پایا؛ balcony/window plume، plugholing، رشد زمانی حریق و CFD خارج از دامنه است.']
  ),
  pressurization_single_zone: limitedModel(
    'رابطه نشت اوریفیس، جریان درب باز و موازنه گشتاور درب از نظر معادلات پایه آزمون شده‌اند.',
    ['Orifice flow equation', 'Door pressure-force moment balance', 'Independent regression tests'],
    ['مدل تک‌زون است؛ شبکه چندطبقه، باد، stack effect و الزامات کامل BS EN 12101-13 باید جداگانه بررسی شوند.']
  ),
  parking_smoke: conditional(
    'موتور تبدیل حجم/ACH/دبی و سایزینگ هندسی را درست اجرا می‌کند، اما مقادیر ACH، زون‌بندی و سناریوی حریق باید برای هر پروژه از مرجع حاکم تعیین شوند.',
    ['Project regression workbook', 'Continuity/unit conversion tests'],
    ['ACH، نسبت هوای جبرانی، زون‌بندی، redundancy و حدود سرعت معیار عمومی ثابت محسوب نمی‌شوند.']
  ),
  parking_smoke_group: conditional(
    'منطق جمع تهویه عادی و سناریوی حریق انتخابی از نظر محاسباتی آزمون شده، ولی انتخاب سناریوی حاکم وابسته به طراحی و AHJ است.',
    ['Project regression workbook', 'Independent grouped-zone arithmetic tests'],
    ['اعتبار سناریوی single-zone وابسته به جداسازی واقعی، دمپرها و sequence of operation است.']
  ),
  fire_pump: preliminary(
    'هد پایه، هد طراحی و توان هیدرولیکی/محور از نظر معادلات پایه کنترل شده‌اند؛ این خروجی انتخاب نهایی پمپ نیست.',
    ['General fluid mechanics', 'Independent power regression'],
    ['منحنی واقعی پمپ، churn/rated/150%، NPSH، درایور، suction arrangement و معیارهای NFPA/AHJ باید کنترل شوند.']
  ),
  sprinkler_preliminary: preliminary(
    'رابطه density-area، K-factor و جمع دبی از نظر حسابی کنترل شده است، اما این ابزار Remote Area نهایی را تعیین نمی‌کند.',
    ['K-factor relation', 'Independent arithmetic regression', 'NFPA 13 edition catalogued separately'],
    ['هندسه Remote Area، spacing، modifiers، hose allowance، نوع سیستم و معیارهای NFPA 13/AHJ باید بیرون از این پیش‌محاسبه تعیین شوند.']
  ),
  fire_alarm_preliminary: legacy(
    'مقادیر پوشش این ابزار از مرجع آموزشی قدیمی آمده‌اند و عمداً برای طراحی عمومی نهایی معتبر شناخته نمی‌شوند.',
    ['Legacy uploaded educational guide', 'BS 5839-1:2025 catalogued as current reference'],
    ['برای جانمایی واقعی باید متن جاری BS 5839-1، الزامات ایران/AHJ، ارتفاع، موانع و مشخصات تجهیزات بررسی شوند.']
  ),
}

const MODULE_FALLBACKS: Record<string, ValidationProfile> = {
  sprinkler_hydraulics: conditional(
    'هسته شبکه هیدرولیکی اعتبارسنجی شده، اما انتخاب معیار طراحی و Remote Area همچنان پروژه‌محور است.',
    ['EPA EPANET 2.2 reference', 'Independent hydraulic solver tests'],
    ['برای گزارش‌های قدیمی که calculator_key ندارند، سطح دقیق محاسبه قابل تشخیص نیست.']
  ),
  standpipe_hydraulics: conditional(
    'حل شبکه پایه قابل استفاده است، ولی تقاضای استندپایپ و معیارهای فشار/دبی باید از مرجع حاکم پروژه تعیین شوند.',
    ['Hydraulic network kernel'],
    ['NFPA 14/AHJ design demand and acceptance criteria are project-specific.']
  ),
  stair_pressurization: limitedModel(
    'حل‌گر شبکه فشار اعتبارسنجی شده است؛ مدل‌های تک‌زون و پروژه‌ای محدودیت دامنه دارند.',
    ['NIST CONTAM methodology reference', 'Independent power-law network tests'],
    ['سناریوهای کامل PDS و پذیرش پروژه باید مطابق مرجع حاکم تعریف شوند.']
  ),
  elevator_pressurization: conditional(
    'هسته جریان/فشار قابل استفاده است، اما مدل اختصاصی آسانسور و معیارهای پروژه باید جداگانه تعریف شوند.',
    ['Airflow-network kernel'],
    ['اثر شفت، درها، باد، stack و سناریوهای حریق باید پروژه‌به‌پروژه مدل شوند.']
  ),
  parking_smoke: PROFILES.parking_smoke_group,
  atrium_smoke: PROFILES.atrium_axisymmetric,
  fire_alarm_power: validatedKernel(
    'روابط حسابی توان DC اعتبارسنجی شده‌اند؛ مقادیر پذیرش از پروژه می‌آیند.',
    ['Independent battery and voltage-drop tests'],
    ['Acceptance criteria are not hard-coded.']
  ),
  fire_alarm_detection: PROFILES.fire_alarm_preliminary,
  fire_pump: PROFILES.fire_pump,
  water_storage: preliminary(
    'حجم ذخیره فقط زمانی قابل اتکا است که دبی و مدت زمان حاکم از طراحی تأییدشده پروژه وارد شود.',
    ['Demand × duration arithmetic'],
    ['سناریوی همزمانی، مدت تأمین و ذخیره مؤثر باید از مرجع حاکم تعیین شوند.']
  ),
}

export function validationFor(key?: string | null): ValidationProfile {
  if (!key) return conditional('نوع دقیق محاسبه مشخص نیست؛ مبنای پروژه و گزارش اصلی را بررسی کنید.', [], ['calculator_key در این سابقه موجود نیست.'])
  return PROFILES[key] || MODULE_FALLBACKS[key] || conditional('این ماژول هنوز پروفایل اعتبارسنجی عمومی اختصاصی ندارد.', [], ['قبل از استفاده نهایی باید دامنه و مرجع محاسبه مشخص شود.'])
}
