import type {
  EngineeringDesignInput,
  ModuleReadiness,
  Project,
  ProjectRequirementAssessment,
  ProjectSystemKey,
  RequirementDecision,
} from '../types'
import { getProjectDesignInput } from './projectDesign'

export const PROJECT_RULE_ENGINE_VERSION = 'project-rules-1.0.0'

type ProjectFacts = {
  building_use?: string | null
  floors_above?: number | null
  floors_below?: number | null
}

type Check = { label: string; value: unknown }

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0 && value.some(v => hasValue(v))
  return true
}

const unique = <T,>(items: T[]) => [...new Set(items)]

function readiness(module: ModuleReadiness['module'], label: string, checks: Check[], notes: string[]): ModuleReadiness {
  const available = checks.filter(c => hasValue(c.value)).map(c => c.label)
  const missing = checks.filter(c => !hasValue(c.value)).map(c => c.label)
  const score = Math.round((available.length / Math.max(checks.length, 1)) * 100)
  return {
    module,
    label,
    score,
    status: score >= 90 ? 'ready' : score >= 40 ? 'partial' : 'blocked',
    missing,
    available,
    notes,
  }
}

function decision(
  key: ProjectSystemKey,
  label: string,
  explicit: boolean | undefined,
  reviewReasons: string[],
  recommendedReasons: string[],
  standards: string[],
): RequirementDecision {
  if (explicit === true) {
    return {
      key,
      label,
      status: 'required',
      confidence: 'explicit',
      reasons: ['این سیستم در پرونده پروژه توسط طراح/کاربر به‌عنوان موردنیاز ثبت شده است.', ...reviewReasons],
      standards,
    }
  }

  if (reviewReasons.length) {
    return {
      key,
      label,
      status: 'review',
      confidence: 'screening',
      reasons: [
        ...(explicit === false ? ['سیستم در ورودی پروژه غیرفعال شده، اما شرایط ثبت‌شده نیازمند بازبینی ضابطه‌ای است.'] : []),
        ...reviewReasons,
      ],
      standards,
    }
  }

  if (recommendedReasons.length) {
    return {
      key,
      label,
      status: 'recommended',
      confidence: 'screening',
      reasons: recommendedReasons,
      standards,
    }
  }

  return {
    key,
    label,
    status: 'not_indicated',
    confidence: explicit === false ? 'explicit' : 'screening',
    reasons: explicit === false ? ['در پرونده پروژه به‌عنوان موردنیاز علامت نخورده است.'] : ['از اطلاعات فعلی پروژه شرط مشخصی برای فعال‌سازی این سیستم استخراج نشد.'],
    standards,
  }
}

const std = (name: string, edition?: string | null) => edition?.trim() ? `${name} (${edition.trim()})` : name

export function analyzeDesignRequirements(
  facts: ProjectFacts,
  d: EngineeringDesignInput,
  generatedAt = new Date().toISOString(),
): ProjectRequirementAssessment {
  const use = facts.building_use || ''
  const floorsAbove = facts.floors_above || 0
  const floorsBelow = facts.floors_below || 0
  const multiStorey = floorsAbove + floorsBelow > 1
  const highRise = d.general.high_rise === true
  const parkingPresent = (d.geometry.parking_area_m2 || 0) > 0 || (d.geometry.parking_spaces || 0) > 0 || (d.geometry.parking_levels || 0) > 0 || /پارکینگ/.test(d.geometry.basement_use || '')
  const atriumPresent = (d.geometry.atrium_area_m2 || 0) > 0 || (d.geometry.atrium_height_m || 0) > 0
  const storagePresent = (d.geometry.storage_count || 0) > 0 || (d.suppression.storage_height_m || 0) > 0 || Boolean(d.suppression.storage_commodity)
  const nonResidentialCritical = ['تجاری','صنعتی','درمانی','آموزشی','هتل/اقامتی','انبار','تجمعی/فرهنگی/ورزشی','دیتاسنتر/فناوری','مختلط'].includes(use)
  const cleanAgentContext = use === 'دیتاسنتر/فناوری' || (d.special_hazards.clean_agent_room_volume_m3 || 0) > 0 || (d.special_hazards.electrical_room_area_m2 || 0) > 0 || (d.special_hazards.generator_room_area_m2 || 0) > 0
  const kitchenContext = (d.special_hazards.kitchen_hood_count || 0) > 0 || /آشپزخانه/.test(`${d.general.special_use_notes || ''} ${d.special_hazards.special_hazard_notes || ''}`)

  const fireAlarmReview = [
    ...(multiStorey ? ['ساختمان بیش از یک تراز دارد؛ سطح پوشش و نوع سیستم اعلام حریق باید با ضوابط پروژه کنترل شود.'] : []),
    ...(nonResidentialCritical ? [`کاربری «${use}» برای تعیین سطح پوشش، زون‌بندی و نوع سیستم نیازمند کنترل ضابطه‌ای است.`] : []),
    ...((d.geometry.unit_count || 0) > 0 ? ['وجود واحدهای مستقل ثبت شده و نیاز به بررسی پوشش فضاهای مشترک/اختصاصی وجود دارد.'] : []),
    ...(highRise ? ['ساختمان به‌عنوان بلندمرتبه علامت‌گذاری شده است.'] : []),
  ]

  const sprinklerReview = [
    ...(highRise ? ['ساختمان بلندمرتبه است و الزام/دامنه اسپرینکلر باید با مرجع حاکم کنترل شود.'] : []),
    ...(nonResidentialCritical ? [`کاربری «${use}» نیازمند تعیین Hazard Classification و کنترل الزام اسپرینکلر است.`] : []),
    ...(floorsBelow > 0 ? ['ساختمان دارای طبقه زیرزمین است؛ حفاظت اطفایی زیرزمین باید بررسی شود.'] : []),
    ...(parkingPresent ? ['پارکینگ در پروژه ثبت شده و الزامات حفاظت خودکار آن باید بررسی شود.'] : []),
    ...(storagePresent ? ['فضا/فعالیت انبارش ثبت شده و طبقه خطر و شرایط انبارش بر طراحی اسپرینکلر اثر دارد.'] : []),
    ...(d.suppression.hazard_class ? ['طبقه خطر برای پروژه وارد شده و ماژول هیدرولیک باید با همان طبقه خطر کنترل شود.'] : []),
  ]

  const standpipeReview = [
    ...(multiStorey ? ['ساختمان چندترازی است؛ نیاز به رایزر/جعبه آتش‌نشانی باید با ارتفاع و دسترسی آتش‌نشانی بررسی شود.'] : []),
    ...(highRise ? ['بلندمرتبه بودن ساختمان، بررسی رایزر و کلاس Standpipe را الزامی به بازبینی می‌کند.'] : []),
    ...(floorsBelow > 0 ? ['وجود طبقات منفی، دسترسی عملیات و جانمایی رایزر را نیازمند بررسی می‌کند.'] : []),
  ]

  const pumpReview = [
    ...(d.systems.sprinkler_required || d.systems.standpipe_required ? ['حداقل یکی از سیستم‌های مصرف‌کننده آب آتش‌نشانی در پروژه فعال است؛ کفایت منبع آب و نیاز به پمپ باید بررسی شود.'] : []),
    ...((d.suppression.required_fire_flow_lpm || 0) > 0 ? ['دبی حریق موردنیاز ثبت شده است و باید با منبع آب/پمپ تطبیق داده شود.'] : []),
    ...(!hasValue(d.water_supply.test_flow_lpm) || !hasValue(d.water_supply.residual_pressure_bar) ? ['اطلاعات کامل تست منبع آب ثبت نشده؛ تصمیم نهایی پمپ بدون منحنی/تست منبع آب قابل اتکا نیست.'] : []),
  ]

  const smokeReview = [
    ...(parkingPresent ? ['پارکینگ در پروژه وجود دارد؛ تهویه عادی/حریق، زون‌بندی و هوای جبرانی باید بررسی شود.'] : []),
    ...(atriumPresent ? ['آتریوم ثبت شده و سناریوی دود/لایه دود باید بررسی شود.'] : []),
    ...(floorsBelow > 0 ? ['طبقات منفی ثبت شده‌اند؛ نیاز به کنترل دود زیرزمین باید با ضابطه محلی/AHJ بررسی شود.'] : []),
    ...(highRise ? ['ساختمان بلندمرتبه است و راهبرد کنترل دود باید در طرح ایمنی حریق بررسی شود.'] : []),
  ]

  const stairReview = [
    ...(highRise ? ['بلندمرتبه بودن ساختمان، راهبرد حفاظت راه‌پله و فشار مثبت را نیازمند بررسی می‌کند.'] : []),
    ...(multiStorey && (d.geometry.stair_count || 0) > 0 ? ['ساختمان چندترازی با راه‌پله ثبت شده است؛ معیارهای فشار، درهای باز و نشت باید کنترل شوند.'] : []),
    ...(floorsBelow > 0 ? ['راه‌پله متصل به طبقات منفی ممکن است نیازمند راهبرد فشار/جداسازی ویژه باشد؛ AHJ کنترل شود.'] : []),
  ]

  const cleanAgentReview = cleanAgentContext ? ['فضای ویژه الکتریکی/دیتاسنتر/ژنراتور یا حجم حفاظت گازی ثبت شده است؛ انتخاب عامل و غلظت طراحی نیازمند بررسی تخصصی است.'] : []
  const kitchenReview = kitchenContext ? ['وجود هود/آشپزخانه صنعتی یا یادداشت مرتبط ثبت شده است؛ سیستم اطفای هود باید بررسی شود.'] : []

  const systems: RequirementDecision[] = [
    decision('fire_alarm','اعلام حریق',d.systems.fire_alarm_required,fireAlarmReview,[],[std('ضوابط آتش‌نشانی محلی'),std('NFPA 72',d.standards.nfpa72_edition)]),
    decision('sprinkler','اسپرینکلر',d.systems.sprinkler_required,sprinklerReview,[],[std('مبحث ۳ / ضوابط محلی'),std('NFPA 13',d.standards.nfpa13_edition)]),
    decision('standpipe','رایزر / Standpipe',d.systems.standpipe_required,standpipeReview,[],[std('ضوابط آتش‌نشانی محلی'),std('NFPA 14',d.standards.nfpa14_edition)]),
    decision('fire_pump','پمپ و منبع آب آتش‌نشانی',d.systems.fire_pump_required,pumpReview,[],[std('ضوابط آتش‌نشانی محلی'),std('NFPA 20',d.standards.nfpa20_edition)]),
    decision('smoke_control','کنترل دود',d.systems.smoke_control_required,smokeReview,[],[std('ضوابط آتش‌نشانی محلی'),std('NFPA 92',d.standards.nfpa92_edition),std('EN 12101',d.standards.en12101_basis)]),
    decision('stair_pressurization','فشار مثبت راه‌پله',d.systems.stair_pressurization_required,stairReview,[],[std('ضوابط آتش‌نشانی محلی'),std('NFPA 92',d.standards.nfpa92_edition),std('IBC/IFC',d.standards.ibc_ifc_edition)]),
    decision('clean_agent','اطفای گازی / Clean Agent',d.systems.clean_agent_required,cleanAgentReview,cleanAgentContext ? ['فضای ویژه ثبت شده است؛ حتی در صورت عدم الزام، تحلیل ریسک و تداوم کسب‌وکار توصیه می‌شود.'] : [],['ضوابط محلی/AHJ','NFPA 2001 یا استاندارد عامل انتخابی']),
    decision('kitchen_hood','اطفای هود آشپزخانه',d.systems.kitchen_hood_required,kitchenReview,[],['ضوابط محلی/AHJ','NFPA 96 / NFPA 17A یا مرجع مصوب']),
  ]

  const alarmChecks: Check[] = [
    {label:'نوع سیستم اعلام حریق',value:d.alarm.system_type},
    {label:'مساحت ناحیه/طبقه طراحی',value:d.alarm.design_floor_area_m2 ?? d.geometry.largest_floor_area_m2 ?? d.geometry.gross_built_area_m2},
    {label:'ارتفاع سقف ناحیه طراحی',value:d.alarm.ceiling_height_m ?? d.geometry.typical_floor_height_m},
    {label:'نوع سقف',value:d.alarm.ceiling_type},
    {label:'نوع آشکارساز غالب',value:d.alarm.default_detector_type},
    {label:'ولتاژ نامی مدار',value:d.alarm.panel_voltage_v},
    {label:'جریان Standby',value:d.alarm.standby_current_a},
    {label:'مدت Standby',value:d.alarm.standby_hours},
    {label:'جریان Alarm',value:d.alarm.alarm_current_a},
    {label:'مدت Alarm',value:d.alarm.alarm_hours},
    {label:'طول مدار بحرانی',value:d.alarm.longest_circuit_m},
    {label:'جریان مدار بحرانی',value:d.alarm.circuit_current_a},
    {label:'سطح مقطع کابل',value:d.alarm.cable_area_mm2},
    {label:'مبنای استاندارد اعلام حریق',value:d.standards.nfpa72_edition || d.standards.local_fire_department_basis},
  ]

  const suppressionChecks: Check[] = [
    {label:'طبقه خطر / Hazard Classification',value:d.suppression.hazard_class},
    {label:'Density طراحی',value:d.suppression.design_density_lpm_m2},
    {label:'مساحت ناحیه طراحی هیدرولیکی',value:d.suppression.hydraulic_design_area_m2},
    {label:'پوشش هر اسپرینکلر',value:d.suppression.sprinkler_coverage_m2},
    {label:'K-Factor',value:d.suppression.k_factor_metric},
    {label:'Hose Allowance',value:d.suppression.hose_allowance_lpm},
    {label:'مدت تأمین آب',value:d.suppression.duration_min},
    {label:'منبع آب',value:d.water_supply.source_type},
    {label:'فشار استاتیک منبع آب',value:d.water_supply.static_pressure_bar},
    {label:'فشار باقیمانده تست آب',value:d.water_supply.residual_pressure_bar},
    {label:'دبی تست آب',value:d.water_supply.test_flow_lpm},
    {label:'دبی حریق موردنیاز',value:d.suppression.required_fire_flow_lpm},
    {label:'فشار باقیمانده موردنیاز',value:d.suppression.required_residual_pressure_bar},
    {label:'مبنای استاندارد اطفا',value:d.standards.nfpa13_edition || d.standards.local_fire_department_basis},
  ]

  const smokeChecks: Check[] = [
    {label:'مبنای سیستم کنترل دود',value:d.smoke.systems_basis},
    {label:'سناریوی حریق',value:d.smoke.fire_scenario},
    {label:'مساحت زون‌های پارکینگ/دود',value:d.smoke.parking_zone_areas_m2?.length ? d.smoke.parking_zone_areas_m2 : d.geometry.parking_area_m2},
    {label:'ارتفاع خالص زون‌ها',value:d.smoke.parking_clear_heights_m?.length ? d.smoke.parking_clear_heights_m : d.geometry.typical_floor_height_m},
    {label:'ACH عادی',value:d.smoke.normal_ach},
    {label:'ACH حریق',value:d.smoke.fire_ach},
    {label:'درصد هوای جبرانی',value:d.smoke.makeup_percent},
    {label:'سرعت طراحی شفت',value:d.smoke.shaft_velocity_mps},
    {label:'سرعت طراحی دمپر',value:d.smoke.damper_velocity_mps},
    {label:'درجه حرارتی فن',value:d.smoke.fan_temperature_rating_c},
    {label:'مدت Rating فن',value:d.smoke.fan_rating_min},
    {label:'مبنای استاندارد کنترل دود',value:d.standards.nfpa92_edition || d.standards.en12101_basis || d.standards.local_fire_department_basis},
  ]

  const modules = {
    alarm: readiness('alarm','اعلام حریق',alarmChecks,['پوشش نهایی تجهیزات، نوع آشکارساز، جریان واقعی تجهیزات و حدود افت ولتاژ باید با نقشه، دیتاشیت و ویرایش استاندارد کنترل شوند.']),
    suppression: readiness('suppression','اطفا و هیدرولیک',suppressionChecks,['Density/Design Area/Hose Allowance و معیارهای شبکه نباید بدون طبقه خطر و نسخه استاندارد قطعی شوند.']),
    smoke: readiness('smoke','کنترل دود',smokeChecks,['ACH، زون‌بندی، فشار، دما/زمان فن و سناریوی حریق باید با ضابطه محلی، AHJ و مرجع طراحی پروژه اعتبارسنجی شوند.']),
  }

  const globalMissing: string[] = []
  if (!hasValue(d.general.occupancy_classification)) globalMissing.push('طبقه‌بندی Occupancy/کاربری بر مبنای مرجع طراحی')
  if (!hasValue(d.general.fire_department_ahj) && !hasValue(d.standards.local_fire_department_basis)) globalMissing.push('مرجع تأیید آتش‌نشانی / AHJ و ضابطه محلی')
  if (!hasValue(d.geometry.gross_built_area_m2)) globalMissing.push('مساحت کل زیربنا')
  if (multiStorey && !hasValue(d.geometry.building_height_m)) globalMissing.push('ارتفاع ساختمان')
  if (multiStorey && !hasValue(d.geometry.floor_areas_m2)) globalMissing.push('مساحت تفکیکی طبقات')
  if (!hasValue(d.life_safety.occupant_load_total)) globalMissing.push('بار جمعیت کل')
  if (!hasValue(d.life_safety.exit_count)) globalMissing.push('تعداد خروج‌های مستقل')
  if (multiStorey && !hasValue(d.geometry.stair_count)) globalMissing.push('تعداد راه‌پله')
  if (parkingPresent && !hasValue(d.smoke.parking_zone_areas_m2)) globalMissing.push('تفکیک مساحت زون‌های پارکینگ/کنترل دود')

  const standardsInScope = unique([
    std('مبحث ۳ مقررات ملی ساختمان',d.standards.iran_mabhas3_edition),
    d.standards.local_fire_department_basis ? `ضابطه محلی/AHJ: ${d.standards.local_fire_department_basis}` : 'ضوابط آتش‌نشانی محلی / AHJ',
    ...systems.filter(s=>s.status!=='not_indicated').flatMap(s=>s.standards),
    ...(d.standards.ibc_ifc_edition ? [std('IBC/IFC',d.standards.ibc_ifc_edition)] : []),
  ])

  const trace = systems.flatMap(s => s.reasons.map(reason => `${s.label}: ${reason}`))

  return {
    engine_version: PROJECT_RULE_ENGINE_VERSION,
    generated_at: generatedAt,
    scope_notice: 'این تحلیل یک غربالگری مهندسی و کنترل آمادگی ورودی‌هاست؛ الزام قطعی سیستم، حدود عددی طراحی و تأیید نهایی باید بر اساس ویرایش مصوب ضوابط ایران، استانداردهای پروژه و نظر AHJ انجام شود.',
    systems,
    modules,
    global_missing: unique(globalMissing),
    standards_in_scope: standardsInScope,
    trace,
  }
}

export function analyzeProjectRequirements(project?: Project | null, generatedAt?: string): ProjectRequirementAssessment | null {
  if (!project) return null
  return analyzeDesignRequirements(
    { building_use: project.building_use, floors_above: project.floors_above, floors_below: project.floors_below },
    getProjectDesignInput(project),
    generatedAt,
  )
}

export function requirementStatusLabel(status: RequirementDecision['status']) {
  if (status === 'required') return 'الزام ثبت‌شده'
  if (status === 'review') return 'نیازمند بررسی ضابطه'
  if (status === 'recommended') return 'پیشنهادی'
  return 'فعلاً بدون نشانه الزام'
}

export function readinessLabel(status: ModuleReadiness['status']) {
  if (status === 'ready') return 'آماده محاسبه با کنترل نهایی'
  if (status === 'partial') return 'ورودی‌ها ناقص'
  return 'برای طراحی کافی نیست'
}
