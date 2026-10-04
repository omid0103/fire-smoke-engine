import type { DesignFieldGroup } from './projectDesign'

export const EXTRA_DESIGN_GROUPS: DesignFieldGroup[] = [
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
