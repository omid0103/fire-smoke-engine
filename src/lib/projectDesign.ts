import type { EngineeringDesignInput, Project } from '../types'

export type DesignFieldKind = 'text' | 'textarea' | 'number' | 'numberList' | 'select' | 'checkbox'
export type DesignField = {
  path: string
  label: string
  kind: DesignFieldKind
  unit?: string
  placeholder?: string
  hint?: string
  options?: { value: string; label: string }[]
}
export type DesignFieldGroup = { key: string; title: string; description: string; fields: DesignField[] }

const yesNo = (labelYes = 'فعال / موردنیاز') => [{ value: 'true', label: labelYes }, { value: 'false', label: 'خیر' }]

export const DESIGN_GROUPS: DesignFieldGroup[] = [
  {
    key: 'general',
    title: 'طبقه‌بندی ساختمان و مبنای طراحی',
    description: 'اطلاعات پایه‌ای که روی الزام سیستم‌ها، سطح خطر، ارتفاع و الزامات کد اثر می‌گذارد.',
    fields: [
      { path: 'general.occupancy_classification', label: 'طبقه‌بندی کاربری / Occupancy', kind: 'text', placeholder: 'مثلاً R-2 / مسکونی، B / اداری یا طبقه‌بندی مرجع پروژه' },
      { path: 'general.mixed_occupancy', label: 'ساختمان دارای کاربری مختلط است', kind: 'checkbox' },
      { path: 'general.construction_type', label: 'نوع ساخت / Construction Type', kind: 'text', placeholder: 'مثلاً Type IIA یا طبقه‌بندی مصوب پروژه' },
      { path: 'general.structural_system', label: 'سیستم سازه‌ای', kind: 'select', options: ['بتنی','فلزی','مختلط','بنایی','سایر'].map(v=>({value:v,label:v})) },
      { path: 'general.high_rise', label: 'ساختمان بلندمرتبه محسوب می‌شود', kind: 'checkbox' },
      { path: 'general.fire_department_ahj', label: 'مرجع تأیید / AHJ', kind: 'text', placeholder: 'مثلاً سازمان آتش‌نشانی و خدمات ایمنی شهر مربوطه' },
      { path: 'general.special_use_notes', label: 'کاربری‌ها و شرایط خاص', kind: 'textarea', placeholder: 'انباری پرخطر، بیمارستان، دیتاسنتر، آشپزخانه صنعتی، مواد قابل اشتعال و ...' },
    ],
  },
  {
    key: 'systems',
    title: 'سیستم‌های مورد طراحی',
    description: 'مشخص می‌کند کدام ماژول‌ها باید از اطلاعات پروژه استفاده کنند.',
    fields: [
      { path: 'systems.fire_alarm_required', label: 'اعلام حریق', kind: 'checkbox' },
      { path: 'systems.sprinkler_required', label: 'اسپرینکلر', kind: 'checkbox' },
      { path: 'systems.standpipe_required', label: 'رایزر / جعبه آتش‌نشانی', kind: 'checkbox' },
      { path: 'systems.fire_pump_required', label: 'پمپ و مخزن آتش‌نشانی', kind: 'checkbox' },
      { path: 'systems.smoke_control_required', label: 'کنترل دود / تهویه حریق', kind: 'checkbox' },
      { path: 'systems.stair_pressurization_required', label: 'فشار مثبت راه‌پله', kind: 'checkbox' },
      { path: 'systems.clean_agent_required', label: 'اطفای گازی / Clean Agent', kind: 'checkbox' },
      { path: 'systems.kitchen_hood_required', label: 'اطفای هود آشپزخانه', kind: 'checkbox' },
    ],
  },
  {
    key: 'geometry',
    title: 'هندسه، طبقات، واحدها و فضاها',
    description: 'هندسه ساختمان برای تشخیص سطح حفاظت، بار طراحی، زون‌بندی و ارتفاع‌های هیدرولیکی.',
    fields: [
      { path: 'geometry.unit_count', label: 'تعداد کل واحدها', kind: 'number' },
      { path: 'geometry.bedroom_count', label: 'تعداد کل اتاق‌خواب', kind: 'number' },
      { path: 'geometry.storage_count', label: 'تعداد انباری', kind: 'number' },
      { path: 'geometry.stair_count', label: 'تعداد راه‌پله', kind: 'number' },
      { path: 'geometry.elevator_count', label: 'تعداد آسانسور', kind: 'number' },
      { path: 'geometry.building_height_m', label: 'ارتفاع ساختمان', kind: 'number', unit: 'm' },
      { path: 'geometry.typical_floor_height_m', label: 'ارتفاع معمول طبقه', kind: 'number', unit: 'm' },
      { path: 'geometry.gross_built_area_m2', label: 'مساحت کل زیربنا', kind: 'number', unit: 'm²' },
      { path: 'geometry.footprint_area_m2', label: 'مساحت سطح اشغال', kind: 'number', unit: 'm²' },
      { path: 'geometry.largest_floor_area_m2', label: 'بیشترین مساحت یک طبقه', kind: 'number', unit: 'm²' },
      { path: 'geometry.floor_areas_m2', label: 'مساحت طبقات به ترتیب', kind: 'numberList', unit: 'm²', placeholder: 'مثال: 820, 820, 760, 740' },
      { path: 'geometry.unit_areas_m2', label: 'مساحت واحدها', kind: 'numberList', unit: 'm²', placeholder: 'مثال: 95, 110, 125' },
      { path: 'geometry.parking_levels', label: 'تعداد طبقات پارکینگ', kind: 'number' },
      { path: 'geometry.parking_area_m2', label: 'مساحت کل پارکینگ', kind: 'number', unit: 'm²' },
      { path: 'geometry.parking_spaces', label: 'تعداد جای پارک', kind: 'number' },
      { path: 'geometry.basement_use', label: 'کاربری زیرزمین‌ها', kind: 'text', placeholder: 'پارکینگ، انباری، موتورخانه، تجاری و ...' },
      { path: 'geometry.atrium_area_m2', label: 'مساحت آتریوم', kind: 'number', unit: 'm²' },
      { path: 'geometry.atrium_height_m', label: 'ارتفاع آتریوم', kind: 'number', unit: 'm' },
      { path: 'geometry.occupied_roof', label: 'بام قابل بهره‌برداری / اشغال است', kind: 'checkbox' },
    ],
  },
  {
    key: 'life_safety',
    title: 'خروج، بار جمعیت و جداسازی حریق',
    description: 'برای کنترل تعداد خروج، راه‌پله، فشار مثبت، زون‌بندی و هماهنگی طراحی حریق.',
    fields: [
      { path: 'life_safety.occupant_load_total', label: 'بار جمعیت کل', kind: 'number', unit: 'نفر' },
      { path: 'life_safety.max_floor_occupant_load', label: 'بیشترین بار جمعیت یک طبقه', kind: 'number', unit: 'نفر' },
      { path: 'life_safety.exit_count', label: 'تعداد خروج‌های مستقل', kind: 'number' },
      { path: 'life_safety.stair_clear_width_m', label: 'عرض مفید راه‌پله', kind: 'number', unit: 'm' },
      { path: 'life_safety.max_travel_distance_m', label: 'حداکثر طول مسیر خروج', kind: 'number', unit: 'm' },
      { path: 'life_safety.common_path_m', label: 'Common Path', kind: 'number', unit: 'm' },
      { path: 'life_safety.dead_end_m', label: 'Dead End', kind: 'number', unit: 'm' },
      { path: 'life_safety.fire_compartment_count', label: 'تعداد بخش‌های حریق / Fire Compartments', kind: 'number' },
      { path: 'life_safety.fire_barrier_rating_min', label: 'مقاومت حریق جداسازی‌ها', kind: 'number', unit: 'min' },
      { path: 'life_safety.stair_enclosure_rating_min', label: 'مقاومت حریق محفظه راه‌پله', kind: 'number', unit: 'min' },
      { path: 'life_safety.refuge_area_m2', label: 'مساحت فضای امن/پناه', kind: 'number', unit: 'm²' },
    ],
  },
  {
    key: 'alarm',
    title: 'ورودی‌های طراحی اعلام حریق',
    description: 'پوشش آشکارسازی، نوع سیستم، توان، باتری، افت ولتاژ و اینترفیس‌ها.',
    fields: [
      { path: 'alarm.system_type', label: 'نوع سیستم اعلام حریق', kind: 'select', options: ['متعارف','آدرس‌پذیر','بی‌سیم','ترکیبی'].map(v=>({value:v,label:v})) },
      { path: 'alarm.design_floor_area_m2', label: 'مساحت طبقه/ناحیه مبنای طراحی', kind: 'number', unit: 'm²' },
      { path: 'alarm.ceiling_height_m', label: 'ارتفاع سقف ناحیه طراحی', kind: 'number', unit: 'm' },
      { path: 'alarm.ceiling_type', label: 'نوع سقف', kind: 'select', options: ['صاف','شیبدار','تیرچه/Beam','کاذب','مشبک/Open Grid','سایر'].map(v=>({value:v,label:v})) },
      { path: 'alarm.ceiling_slope_deg', label: 'شیب سقف', kind: 'number', unit: 'deg' },
      { path: 'alarm.environmental_condition', label: 'شرایط محیطی', kind: 'text', placeholder: 'گردوغبار، بخار، رطوبت، دمای بالا، آشپزخانه و ...' },
      { path: 'alarm.default_detector_type', label: 'نوع دتکتور غالب', kind: 'select', options: [{value:'smoke',label:'دودی'},{value:'heat',label:'حرارتی'},{value:'multi',label:'مولتی/ترکیبی'},{value:'beam',label:'بیم'},{value:'aspirating',label:'مکشی'}] },
      { path: 'alarm.alarm_zones_count', label: 'تعداد زون اعلام', kind: 'number' },
      { path: 'alarm.loops_count', label: 'تعداد لوپ', kind: 'number' },
      { path: 'alarm.panel_voltage_v', label: 'ولتاژ نامی پنل/مدار', kind: 'number', unit: 'V' },
      { path: 'alarm.standby_current_a', label: 'جریان Standby', kind: 'number', unit: 'A' },
      { path: 'alarm.standby_hours', label: 'زمان Standby', kind: 'number', unit: 'h' },
      { path: 'alarm.alarm_current_a', label: 'جریان Alarm', kind: 'number', unit: 'A' },
      { path: 'alarm.alarm_hours', label: 'زمان Alarm', kind: 'number', unit: 'h' },
      { path: 'alarm.battery_margin_percent', label: 'ضریب ذخیره باتری', kind: 'number', unit: '%' },
      { path: 'alarm.longest_circuit_m', label: 'طول یک‌طرفه طولانی‌ترین مدار', kind: 'number', unit: 'm' },
      { path: 'alarm.circuit_current_a', label: 'جریان مدار بحرانی', kind: 'number', unit: 'A' },
      { path: 'alarm.cable_area_mm2', label: 'سطح مقطع کابل مدار', kind: 'number', unit: 'mm²' },
      { path: 'alarm.ambient_noise_db', label: 'سطح صدای محیط', kind: 'number', unit: 'dB' },
      { path: 'alarm.interfaces', label: 'اینترفیس‌ها و فرمان‌ها', kind: 'textarea', placeholder: 'آسانسور، فن، دمپر، پمپ، گاز، درب‌ها، BMS و ...' },
    ],
  },
  {
    key: 'suppression',
    title: 'ورودی‌های اطفا، اسپرینکلر، رایزر و پمپ',
    description: 'پارامترهای هیدرولیکی باید بر اساس طبقه خطر، کاربری و نسخه استاندارد/AHJ پروژه تأیید شوند.',
    fields: [
      { path: 'suppression.sprinkler_system_type', label: 'نوع سیستم اسپرینکلر', kind: 'select', options: ['Wet','Dry','Preaction','Deluge','Residential','سایر'].map(v=>({value:v,label:v})) },
      { path: 'suppression.hazard_class', label: 'طبقه خطر', kind: 'text', placeholder: 'LH / OH1 / OH2 / EH یا طبقه‌بندی مصوب پروژه' },
      { path: 'suppression.hazard_description', label: 'شرح خطر و کاربری مؤثر', kind: 'textarea' },
      { path: 'suppression.design_density_lpm_m2', label: 'Density طراحی', kind: 'number', unit: 'L/min·m²' },
      { path: 'suppression.hydraulic_design_area_m2', label: 'مساحت ناحیه طراحی هیدرولیکی', kind: 'number', unit: 'm²' },
      { path: 'suppression.sprinkler_coverage_m2', label: 'مساحت پوشش هر اسپرینکلر', kind: 'number', unit: 'm²' },
      { path: 'suppression.k_factor_metric', label: 'K-Factor متریک', kind: 'number' },
      { path: 'suppression.hose_allowance_lpm', label: 'Hose Allowance', kind: 'number', unit: 'L/min' },
      { path: 'suppression.duration_min', label: 'مدت تأمین آب', kind: 'number', unit: 'min' },
      { path: 'suppression.active_sprinklers', label: 'تعداد اسپرینکلرهای فعال طراحی', kind: 'number' },
      { path: 'suppression.design_temperature_c', label: 'دمای طراحی محیط', kind: 'number', unit: '°C' },
      { path: 'suppression.storage_commodity', label: 'نوع کالای انبارشده / Commodity', kind: 'text' },
      { path: 'suppression.storage_height_m', label: 'ارتفاع انبارش', kind: 'number', unit: 'm' },
      { path: 'suppression.ceiling_clearance_m', label: 'فاصله بالای انبارش تا سقف', kind: 'number', unit: 'm' },
      { path: 'suppression.standpipe_class', label: 'کلاس/نوع Standpipe', kind: 'text' },
      { path: 'suppression.hose_valves_count', label: 'تعداد شیر/خروجی رایزر', kind: 'number' },
      { path: 'suppression.highest_outlet_elevation_m', label: 'ارتفاع بالاترین مصرف‌کننده از پمپ', kind: 'number', unit: 'm' },
      { path: 'suppression.required_fire_flow_lpm', label: 'دبی طراحی کل', kind: 'number', unit: 'L/min' },
      { path: 'suppression.required_residual_pressure_bar', label: 'فشار باقیمانده موردنیاز', kind: 'number', unit: 'bar' },
      { path: 'suppression.estimated_friction_head_m', label: 'افت هد تخمینی شبکه', kind: 'number', unit: 'm' },
      { path: 'suppression.pump_safety_percent', label: 'حاشیه طراحی پمپ', kind: 'number', unit: '%' },
      { path: 'suppression.pump_efficiency_percent', label: 'راندمان تخمینی پمپ', kind: 'number', unit: '%' },
      { path: 'suppression.pipe_material', label: 'جنس لوله', kind: 'text' },
      { path: 'suppression.hazen_c', label: 'Hazen-Williams C', kind: 'number' },
    ],
  },
  {
    key: 'water_supply',
    title: 'منبع آب، تست شبکه و مکش پمپ',
    description: 'اطلاعات لازم برای کنترل دبی/فشار، حجم مخزن، هد پمپ و NPSH.',
    fields: [
      { path: 'water_supply.source_type', label: 'نوع منبع آب', kind: 'select', options: ['مخزن اختصاصی','شبکه شهری','مخزن + شبکه شهری','منبع اختصاصی دیگر'].map(v=>({value:v,label:v})) },
      { path: 'water_supply.static_pressure_bar', label: 'فشار Static', kind: 'number', unit: 'bar' },
      { path: 'water_supply.residual_pressure_bar', label: 'فشار Residual تست', kind: 'number', unit: 'bar' },
      { path: 'water_supply.test_flow_lpm', label: 'دبی Flow Test', kind: 'number', unit: 'L/min' },
      { path: 'water_supply.tank_usable_volume_m3', label: 'حجم مفید مخزن آتش‌نشانی', kind: 'number', unit: 'm³' },
      { path: 'water_supply.tank_elevation_m', label: 'تراز آب مخزن نسبت به پمپ', kind: 'number', unit: 'm' },
      { path: 'water_supply.atmospheric_pressure_kpa', label: 'فشار اتمسفر محل', kind: 'number', unit: 'kPa' },
      { path: 'water_supply.vapor_pressure_kpa', label: 'فشار بخار آب در دمای طراحی', kind: 'number', unit: 'kPa' },
      { path: 'water_supply.water_density_kg_m3', label: 'چگالی آب', kind: 'number', unit: 'kg/m³' },
      { path: 'water_supply.suction_static_head_m', label: 'هد استاتیک مکش', kind: 'number', unit: 'm' },
      { path: 'water_supply.suction_loss_m', label: 'افت خط مکش', kind: 'number', unit: 'm' },
    ],
  },
  {
    key: 'smoke',
    title: 'کنترل دود، پارکینگ، فشار مثبت و آتریوم',
    description: 'اطلاعات هندسی و سناریوی حریق برای محاسبه تخلیه دود، هوای جبرانی، کانال و فشار مثبت.',
    fields: [
      { path: 'smoke.systems_basis', label: 'سیستم‌ها/فضاهای کنترل دود', kind: 'text', placeholder: 'پارکینگ، راه‌پله، لابی آسانسور، آتریوم، راهرو و ...' },
      { path: 'smoke.fire_scenario', label: 'سناریوی حریق', kind: 'select', options: [{value:'single_zone',label:'یک زون حریق'},{value:'all_zones',label:'همه زون‌ها'},{value:'engineered',label:'سناریوی مهندسی خاص'}] },
      { path: 'smoke.parking_zone_areas_m2', label: 'مساحت زون‌های پارکینگ', kind: 'numberList', unit: 'm²', placeholder: 'مثال: 820, 850' },
      { path: 'smoke.parking_clear_heights_m', label: 'ارتفاع مفید زون‌های پارکینگ', kind: 'numberList', unit: 'm', placeholder: 'مثال: 2.8, 2.8' },
      { path: 'smoke.normal_ach', label: 'ACH تهویه عادی', kind: 'number', unit: '1/h' },
      { path: 'smoke.fire_ach', label: 'ACH سناریوی حریق', kind: 'number', unit: '1/h' },
      { path: 'smoke.makeup_percent', label: 'درصد هوای جبرانی', kind: 'number', unit: '%' },
      { path: 'smoke.shaft_velocity_mps', label: 'حد سرعت شفت', kind: 'number', unit: 'm/s' },
      { path: 'smoke.damper_velocity_mps', label: 'حد سرعت دمپر/گِریل', kind: 'number', unit: 'm/s' },
      { path: 'smoke.design_exhaust_cfm', label: 'دبی تخلیه طراحی در صورت معلوم بودن', kind: 'number', unit: 'CFM' },
      { path: 'smoke.duct_width_mm', label: 'عرض کانال مبنا', kind: 'number', unit: 'mm' },
      { path: 'smoke.duct_height_mm', label: 'ارتفاع کانال مبنا', kind: 'number', unit: 'mm' },
      { path: 'smoke.fan_temperature_rating_c', label: 'رده دمایی فن حریق', kind: 'number', unit: '°C' },
      { path: 'smoke.fan_rating_min', label: 'مدت کارکرد در دمای حریق', kind: 'number', unit: 'min' },
      { path: 'smoke.redundancy_required', label: 'رزرو/Redundancy برای فن یا منبع تغذیه لازم است', kind: 'checkbox' },
      { path: 'smoke.stair_design_pressure_pa', label: 'فشار طراحی راه‌پله', kind: 'number', unit: 'Pa' },
      { path: 'smoke.stair_doors_open_count', label: 'تعداد در باز در سناریوی فشار مثبت', kind: 'number' },
      { path: 'smoke.stair_door_width_m', label: 'عرض مفید در راه‌پله', kind: 'number', unit: 'm' },
      { path: 'smoke.stair_door_height_m', label: 'ارتفاع در راه‌پله', kind: 'number', unit: 'm' },
      { path: 'smoke.stair_leakage_area_m2', label: 'سطح نشتی مؤثر', kind: 'number', unit: 'm²' },
      { path: 'smoke.stair_shaft_height_m', label: 'ارتفاع شفت راه‌پله', kind: 'number', unit: 'm' },
      { path: 'smoke.atrium_design_fire_kw', label: 'توان حریق طراحی آتریوم', kind: 'number', unit: 'kW' },
      { path: 'smoke.target_smoke_layer_height_m', label: 'ارتفاع هدف لایه دود', kind: 'number', unit: 'm' },
      { path: 'smoke.plume_height_m', label: 'ارتفاع Plume تا لایه دود', kind: 'number', unit: 'm' },
      { path: 'smoke.exhaust_temperature_c', label: 'دمای دود/اگزاست طراحی', kind: 'number', unit: '°C' },
      { path: 'smoke.ambient_temperature_c', label: 'دمای محیط', kind: 'number', unit: '°C' },
    ],
  },
  {
    key: 'special_hazards',
    title: 'خطرات ویژه و اطفای خاص',
    description: 'برای دیتاسنتر، اتاق برق، ژنراتور، آشپزخانه صنعتی، پارکینگ EV و فضاهای خاص.',
    fields: [
      { path: 'special_hazards.clean_agent_room_volume_m3', label: 'حجم فضای Clean Agent', kind: 'number', unit: 'm³' },
      { path: 'special_hazards.clean_agent_type', label: 'نوع عامل اطفا', kind: 'text', placeholder: 'FK-5-1-12, HFC-227ea, IG-541 و ...' },
      { path: 'special_hazards.clean_agent_design_concentration_percent', label: 'غلظت طراحی', kind: 'number', unit: '%' },
      { path: 'special_hazards.clean_agent_hold_time_min', label: 'Hold Time', kind: 'number', unit: 'min' },
      { path: 'special_hazards.kitchen_hood_count', label: 'تعداد هود صنعتی', kind: 'number' },
      { path: 'special_hazards.generator_room_area_m2', label: 'مساحت اتاق ژنراتور', kind: 'number', unit: 'm²' },
      { path: 'special_hazards.electrical_room_area_m2', label: 'مساحت اتاق برق/UPS', kind: 'number', unit: 'm²' },
      { path: 'special_hazards.ev_charging_spaces', label: 'تعداد جایگاه شارژ خودرو برقی', kind: 'number' },
      { path: 'special_hazards.special_hazard_notes', label: 'سایر خطرات ویژه', kind: 'textarea' },
    ],
  },
  {
    key: 'standards',
    title: 'استانداردها، ضوابط و نسخه مبنا',
    description: 'نسخه‌ای که AHJ/قرارداد برای پروژه الزام کرده ثبت شود؛ موتور محاسبات نباید نسخه را حدس بزند.',
    fields: [
      { path: 'standards.iran_mabhas3_edition', label: 'مبحث سوم مقررات ملی ساختمان', kind: 'text', placeholder: 'ویرایش/سال مبنای پروژه' },
      { path: 'standards.local_fire_department_basis', label: 'ضوابط آتش‌نشانی محلی', kind: 'text', placeholder: 'نام دستورالعمل، شهر و ویرایش' },
      { path: 'standards.nfpa13_edition', label: 'NFPA 13', kind: 'text', placeholder: 'Edition' },
      { path: 'standards.nfpa14_edition', label: 'NFPA 14', kind: 'text', placeholder: 'Edition' },
      { path: 'standards.nfpa20_edition', label: 'NFPA 20', kind: 'text', placeholder: 'Edition' },
      { path: 'standards.nfpa72_edition', label: 'NFPA 72', kind: 'text', placeholder: 'Edition' },
      { path: 'standards.nfpa92_edition', label: 'NFPA 92', kind: 'text', placeholder: 'Edition' },
      { path: 'standards.ibc_ifc_edition', label: 'IBC / IFC', kind: 'text', placeholder: 'Edition' },
      { path: 'standards.en12101_basis', label: 'BS/EN 12101 / Smoke Control', kind: 'text', placeholder: 'بخش‌ها و ویرایش مبنا' },
      { path: 'standards.design_notes', label: 'یادداشت مبنای طراحی / AHJ Notes', kind: 'textarea' },
    ],
  },
]

export function emptyEngineeringDesignInput(): EngineeringDesignInput {
  return {
    schema_version: 1,
    general: {}, systems: {}, geometry: {}, life_safety: {}, alarm: {}, suppression: {}, water_supply: {}, smoke: {}, special_hazards: {}, standards: {},
  }
}

function mergeDesign(base: EngineeringDesignInput, raw?: Partial<EngineeringDesignInput> | null): EngineeringDesignInput {
  if (!raw) return base
  return {
    ...base,
    ...raw,
    schema_version: 1,
    general: { ...base.general, ...(raw.general || {}) },
    systems: { ...base.systems, ...(raw.systems || {}) },
    geometry: { ...base.geometry, ...(raw.geometry || {}) },
    life_safety: { ...base.life_safety, ...(raw.life_safety || {}) },
    alarm: { ...base.alarm, ...(raw.alarm || {}) },
    suppression: { ...base.suppression, ...(raw.suppression || {}) },
    water_supply: { ...base.water_supply, ...(raw.water_supply || {}) },
    smoke: { ...base.smoke, ...(raw.smoke || {}) },
    special_hazards: { ...base.special_hazards, ...(raw.special_hazards || {}) },
    standards: { ...base.standards, ...(raw.standards || {}) },
  }
}

export function getProjectDesignInput(project?: Project | null): EngineeringDesignInput {
  const raw = project?.project_data?.design_input_v1
  const design = mergeDesign(emptyEngineeringDesignInput(), raw)
  if (project) {
    if (design.geometry.gross_built_area_m2 == null && project.total_area_m2 != null) design.geometry.gross_built_area_m2 = project.total_area_m2
  }
  return design
}

export function getDesignValue(design: EngineeringDesignInput, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, design)
}

export function setDesignValue(design: EngineeringDesignInput, path: string, value: unknown): EngineeringDesignInput {
  const next = JSON.parse(JSON.stringify(design)) as EngineeringDesignInput
  const keys = path.split('.')
  let cursor = next as unknown as Record<string, unknown>
  keys.slice(0, -1).forEach(key => {
    const child = cursor[key]
    if (!child || typeof child !== 'object') cursor[key] = {}
    cursor = cursor[key] as Record<string, unknown>
  })
  cursor[keys[keys.length - 1]] = value
  return next
}

export function parseDesignValue(field: DesignField, raw: string | boolean): unknown {
  if (field.kind === 'checkbox') return Boolean(raw)
  if (typeof raw !== 'string' || raw.trim() === '') return null
  if (field.kind === 'number') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  }
  if (field.kind === 'numberList') {
    return raw.split(/[،,;\s]+/).map(v=>Number(v.trim())).filter(Number.isFinite)
  }
  return raw.trim()
}

export function formatDesignValue(value: unknown, field: DesignField): string | boolean {
  if (field.kind === 'checkbox') return Boolean(value)
  if (Array.isArray(value)) return value.join(', ')
  return value == null ? '' : String(value)
}

export function projectEngineeringCompleteness(project: Project): number {
  const d = getProjectDesignInput(project)
  const importantPaths = [
    'geometry.unit_count','geometry.stair_count','geometry.elevator_count','geometry.building_height_m','geometry.gross_built_area_m2',
    'life_safety.occupant_load_total','alarm.design_floor_area_m2','alarm.ceiling_height_m','suppression.hazard_class',
    'suppression.hydraulic_design_area_m2','water_supply.source_type','smoke.systems_basis','standards.iran_mabhas3_edition','standards.local_fire_department_basis',
  ]
  const available = importantPaths.filter(path => {
    const value = getDesignValue(d, path)
    return Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined && value !== ''
  }).length
  return Math.round((available / importantPaths.length) * 100)
}

const textNumber = (value: number | null | undefined) => value == null ? undefined : String(value)

export function alarmDefaultsFromProject(project: Project) {
  const d = getProjectDesignInput(project)
  const area = d.alarm.design_floor_area_m2 ?? d.geometry.largest_floor_area_m2 ?? project.total_area_m2
  const height = d.alarm.ceiling_height_m ?? d.geometry.typical_floor_height_m
  return {
    coverage: { area: textNumber(area), height: textNumber(height), type: d.alarm.default_detector_type || undefined },
    battery: {
      standbyA: textNumber(d.alarm.standby_current_a), standbyH: textNumber(d.alarm.standby_hours), alarmA: textNumber(d.alarm.alarm_current_a),
      alarmH: textNumber(d.alarm.alarm_hours), margin: textNumber(d.alarm.battery_margin_percent),
    },
    drop: {
      length: textNumber(d.alarm.longest_circuit_m), current: textNumber(d.alarm.circuit_current_a), area: textNumber(d.alarm.cable_area_mm2), voltage: textNumber(d.alarm.panel_voltage_v),
    },
  }
}

export function suppressionDefaultsFromProject(project: Project) {
  const d = getProjectDesignInput(project)
  return {
    sprinkler: {
      density: textNumber(d.suppression.design_density_lpm_m2), design_area: textNumber(d.suppression.hydraulic_design_area_m2), coverage: textNumber(d.suppression.sprinkler_coverage_m2),
      k: textNumber(d.suppression.k_factor_metric), hose: textNumber(d.suppression.hose_allowance_lpm), duration: textNumber(d.suppression.duration_min), count: textNumber(d.suppression.active_sprinklers),
    },
    hazen: { c: textNumber(d.suppression.hazen_c), flow: textNumber(d.suppression.required_fire_flow_lpm) },
    pump: {
      flow: textNumber(d.suppression.required_fire_flow_lpm), elevation: textNumber(d.suppression.highest_outlet_elevation_m ?? d.geometry.building_height_m),
      residual: textNumber(d.suppression.required_residual_pressure_bar), friction: textNumber(d.suppression.estimated_friction_head_m), safety: textNumber(d.suppression.pump_safety_percent), efficiency: textNumber(d.suppression.pump_efficiency_percent),
    },
    npsh: {
      patm: textNumber(d.water_supply.atmospheric_pressure_kpa), pvap: textNumber(d.water_supply.vapor_pressure_kpa), density: textNumber(d.water_supply.water_density_kg_m3),
      static: textNumber(d.water_supply.suction_static_head_m), loss: textNumber(d.water_supply.suction_loss_m),
    },
  }
}

export function smokeDefaultsFromProject(project: Project) {
  const d = getProjectDesignInput(project)
  const areas = d.smoke.parking_zone_areas_m2?.length ? d.smoke.parking_zone_areas_m2 : (d.geometry.parking_area_m2 ? [d.geometry.parking_area_m2] : [])
  const heights = d.smoke.parking_clear_heights_m?.length ? d.smoke.parking_clear_heights_m : (d.geometry.typical_floor_height_m ? [d.geometry.typical_floor_height_m] : [])
  const zones = areas.map((area, index) => ({
    name: `زون ${index + 1}`,
    area: String(area),
    height: String(heights[index] ?? heights[0] ?? 2.8),
    normal: String(d.smoke.normal_ach ?? 6),
    fire: String(d.smoke.fire_ach ?? 10),
  }))
  return {
    zones,
    scenario: d.smoke.fire_scenario || undefined,
    makeup: textNumber(d.smoke.makeup_percent), shaftV: textNumber(d.smoke.shaft_velocity_mps), damperV: textNumber(d.smoke.damper_velocity_mps),
    duct: { flow: textNumber(d.smoke.design_exhaust_cfm), width: textNumber(d.smoke.duct_width_mm), height: textNumber(d.smoke.duct_height_mm) },
  }
}
