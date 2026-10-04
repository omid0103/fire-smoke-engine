import { DESIGN_GROUPS, type DesignFieldGroup } from './projectDesign'

export const EXTRA_DESIGN_GROUPS: DesignFieldGroup[] = [
  {
    key: 'cad-bim-geometry',
    title: 'هندسه و نقاط مرجع CAD / BIM',
    description: 'در صورت ثبت این مختصات، Auto Design از هندسه واقعی‌تر استفاده می‌کند؛ در غیر این صورت فقط یک مستطیل مفهومی از روی مساحت ساخته می‌شود.',
    fields: [
      { path: 'geometry.design_plan_width_m', label: 'عرض پلان مبنای طراحی', kind: 'number', unit: 'm' },
      { path: 'geometry.design_plan_length_m', label: 'طول پلان مبنای طراحی', kind: 'number', unit: 'm' },
      { path: 'geometry.service_core_x_m', label: 'مختصات X هسته خدمات/رایزر', kind: 'number', unit: 'm' },
      { path: 'geometry.service_core_y_m', label: 'مختصات Y هسته خدمات/رایزر', kind: 'number', unit: 'm' },
      { path: 'alarm.panel_x_m', label: 'مختصات X پنل اعلام حریق', kind: 'number', unit: 'm' },
      { path: 'alarm.panel_y_m', label: 'مختصات Y پنل اعلام حریق', kind: 'number', unit: 'm' },
      { path: 'suppression.riser_x_m', label: 'مختصات X رایزر اطفا', kind: 'number', unit: 'm' },
      { path: 'suppression.riser_y_m', label: 'مختصات Y رایزر اطفا', kind: 'number', unit: 'm' },
      { path: 'smoke.exhaust_shaft_x_m', label: 'مختصات X شفت تخلیه دود', kind: 'number', unit: 'm' },
      { path: 'smoke.exhaust_shaft_y_m', label: 'مختصات Y شفت تخلیه دود', kind: 'number', unit: 'm' },
      { path: 'smoke.makeup_shaft_x_m', label: 'مختصات X شفت هوای جبرانی', kind: 'number', unit: 'm' },
      { path: 'smoke.makeup_shaft_y_m', label: 'مختصات Y شفت هوای جبرانی', kind: 'number', unit: 'm' },
    ],
  },
  {
    key: 'cad-spacing-criteria',
    title: 'معیارهای صریح جانمایی و کنترل فاصله',
    description: 'این مقادیر باید از ضابطه/Edition مبنای همان پروژه وارد شوند. Auto Design از مقدار پنهان یا حد عمومی استفاده نمی‌کند.',
    fields: [
      { path: 'alarm.max_detector_spacing_m', label: 'حداکثر فاصله مجاز دتکتورها', kind: 'number', unit: 'm', hint: 'طبق نوع دتکتور، ارتفاع/شکل سقف، استاندارد و AHJ پروژه.' },
      { path: 'alarm.min_detector_wall_clearance_m', label: 'حداقل فاصله دتکتور از دیوار/مانع', kind: 'number', unit: 'm' },
      { path: 'suppression.max_sprinkler_spacing_m', label: 'حداکثر فاصله مجاز اسپرینکلرها', kind: 'number', unit: 'm', hint: 'طبق Hazard، نوع اسپرینکلر و Edition پروژه.' },
      { path: 'suppression.min_sprinkler_wall_clearance_m', label: 'حداقل فاصله اسپرینکلر از دیوار/مانع', kind: 'number', unit: 'm' },
      { path: 'smoke.min_extract_spacing_m', label: 'حداقل فاصله نقاط تخلیه/گریل‌ها', kind: 'number', unit: 'm', hint: 'فقط در صورت الزام/مبنای طراحی پروژه ثبت شود.' },
      { path: 'smoke.min_route_clearance_m', label: 'حداقل فاصله مسیر کانال از مانع', kind: 'number', unit: 'm' },
    ],
  },
  {
    key: 'alarm-auto-design',
    title: 'ورودی‌های تکمیلی Auto Design — اعلام حریق',
    description: 'پارامترهایی که برای اجرای خودکار افت ولتاژ و تولید خروجی قابل ردیابی لازم‌اند.',
    fields: [
      { path: 'alarm.conductor_material', label: 'جنس هادی کابل', kind: 'select', options: [{value:'Copper',label:'مس / Copper'},{value:'Aluminum',label:'آلومینیوم / Aluminum'},{value:'Other',label:'سایر'}] },
      { path: 'alarm.conductor_resistivity_ohm_mm2_m', label: 'مقاومت ویژه هادی', kind: 'number', unit: 'Ω·mm²/m', hint: 'از دیتاشیت/دمای طراحی پروژه وارد شود؛ نرم‌افزار مقدار را حدس نمی‌زند.' },
    ],
  },
  {
    key: 'suppression-layout',
    title: 'ورودی‌های تکمیلی Auto Design — مسیر و سایز اطفا',
    description: 'برای برچسب‌گذاری مسیرهای مقدماتی در CAD. این اعداد باید از محاسبه هیدرولیکی/طراحی تأییدشده وارد شوند و نرم‌افزار آن‌ها را حدس نمی‌زند.',
    fields: [
      { path: 'suppression.main_pipe_diameter_mm', label: 'قطر لوله اصلی انتخابی', kind: 'number', unit: 'mm' },
      { path: 'suppression.branch_pipe_diameter_mm', label: 'قطر لوله شاخه انتخابی', kind: 'number', unit: 'mm' },
      { path: 'suppression.standpipe_riser_diameter_mm', label: 'قطر رایزر Standpipe انتخابی', kind: 'number', unit: 'mm' },
    ],
  },
  {
    key: 'smoke-auto-design',
    title: 'ورودی‌های تکمیلی Auto Design — فشار مثبت و آتریوم',
    description: 'برای اجرای خودکار مدل فشار مثبت راه‌پله و محاسبات مقدماتی آتریوم.',
    fields: [
      { path: 'smoke.stair_discharge_coefficient', label: 'ضریب تخلیه نشت راه‌پله', kind: 'number' },
      { path: 'smoke.stair_air_density_kg_m3', label: 'چگالی هوای طراحی', kind: 'number', unit: 'kg/m³' },
      { path: 'smoke.stair_open_door_velocity_mps', label: 'سرعت هدف هوا در درِ باز', kind: 'number', unit: 'm/s' },
      { path: 'smoke.stair_margin_percent', label: 'حاشیه دبی فشار مثبت', kind: 'number', unit: '%' },
      { path: 'smoke.stair_handle_arm_m', label: 'فاصله دستگیره تا لولا', kind: 'number', unit: 'm' },
      { path: 'smoke.stair_closer_force_n', label: 'نیروی آرام‌بند در دستگیره', kind: 'number', unit: 'N' },
      { path: 'smoke.atrium_convective_fraction', label: 'سهم جابجایی توان حریق آتریوم', kind: 'number', hint: 'بین 0 و 1، طبق مبنای طراحی.' },
      { path: 'smoke.atrium_heat_fraction', label: 'سهم گرمای باقی‌مانده در ستون دود', kind: 'number', hint: 'بین 0 و 1، طبق مدل انتخابی.' },
      { path: 'smoke.ambient_pressure_pa', label: 'فشار مطلق محیط', kind: 'number', unit: 'Pa' },
    ],
  },
]

const registered = new Set(DESIGN_GROUPS.map(group => group.key))
for (const group of EXTRA_DESIGN_GROUPS) {
  if (!registered.has(group.key)) DESIGN_GROUPS.push(group)
}
