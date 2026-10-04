import type {
  AutoDesignModulePlan,
  AutoDesignPlan,
  AutoDesignTask,
  PreliminaryDesignGeometry,
  Project,
  RequirementStatus,
} from '../types'
import { getProjectDesignInput } from './projectDesign'
import { analyzeProjectRequirements } from './projectRules'

export const AUTO_DESIGN_ENGINE_VERSION = 'auto-design-1.0.0'

const present = (value: unknown): boolean => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.length > 0 && value.every(v => present(v))
  return true
}

function buildTask(
  id: string,
  discipline: AutoDesignTask['discipline'],
  calculator: string,
  label: string,
  input: Record<string, unknown>,
  required: Array<[string, unknown]>,
  note?: string,
): AutoDesignTask {
  const missing = required.filter(([,value]) => !present(value)).map(([label]) => label)
  return { id, discipline, calculator, label, status: missing.length ? 'blocked' : 'ready', input, missing, note }
}

function strongestStatus(statuses: RequirementStatus[]): RequirementStatus {
  const rank: Record<RequirementStatus, number> = { not_indicated: 0, recommended: 1, review: 2, required: 3 }
  return statuses.sort((a,b)=>rank[b]-rank[a])[0] || 'not_indicated'
}

function preliminaryGeometry(project: Project): PreliminaryDesignGeometry {
  const d = getProjectDesignInput(project)
  const baseArea = d.geometry.footprint_area_m2 || d.geometry.largest_floor_area_m2 || d.geometry.parking_area_m2 || project.total_area_m2 || 0
  const ratio = 1.5
  const width = baseArea > 0 ? Math.sqrt(baseArea / ratio) : 0
  const length = baseArea > 0 ? baseArea / width : 0
  const height = d.geometry.typical_floor_height_m || 0
  const levels = Math.max(1,(project.floors_above || 0) + (project.floors_below || 0))
  const zoneAreas = d.smoke.parking_zone_areas_m2?.filter(v=>v>0) || []
  const totalZoneArea = zoneAreas.reduce((sum,v)=>sum+v,0)
  let cursor = 0
  const smokeZones = zoneAreas.map((area,index)=>{
    const zoneWidth = width > 0 && totalZoneArea > 0 ? width * (area / totalZoneArea) : 0
    const zone = { name:`زون ${index+1}`, area_m2:area, x_m:cursor, y_m:0, width_m:zoneWidth, length_m:length }
    cursor += zoneWidth
    return zone
  })

  const cfmToM3s = (cfm:number)=>cfm/2118.880003
  const designFlow = d.smoke.design_exhaust_cfm || 0
  const shaftV = d.smoke.shaft_velocity_mps || 0
  const makeup = d.smoke.makeup_percent || 0
  const exhaustArea = designFlow > 0 && shaftV > 0 ? cfmToM3s(designFlow)/shaftV : 0
  const makeupArea = designFlow > 0 && shaftV > 0 && makeup > 0 ? cfmToM3s(designFlow*makeup/100)/shaftV : 0
  const exhaustSide = exhaustArea > 0 ? Math.sqrt(exhaustArea) : 0
  const makeupSide = makeupArea > 0 ? Math.sqrt(makeupArea) : 0

  return {
    source: d.geometry.footprint_area_m2 ? 'project-inputs' : 'inferred-rectangle',
    width_m:Number(width.toFixed(3)),
    length_m:Number(length.toFixed(3)),
    height_m:Number(height.toFixed(3)),
    levels,
    smoke_zones:smokeZones.map(z=>({...z,x_m:Number(z.x_m.toFixed(3)),width_m:Number(z.width_m.toFixed(3)),length_m:Number(z.length_m.toFixed(3))})),
    ...(exhaustSide>0 && width>0 && length>0 ? {exhaust_shaft:{x_m:Math.max(0,width-exhaustSide),y_m:Math.max(0,length-exhaustSide),width_m:Number(exhaustSide.toFixed(3)),length_m:Number(exhaustSide.toFixed(3))}} : {}),
    ...(makeupSide>0 && width>0 && length>0 ? {makeup_shaft:{x_m:0,y_m:0,width_m:Number(makeupSide.toFixed(3)),length_m:Number(makeupSide.toFixed(3))}} : {}),
  }
}

export function generateAutoDesignPlan(project: Project, generatedAt = new Date().toISOString()): AutoDesignPlan {
  const d = getProjectDesignInput(project)
  const assessment = analyzeProjectRequirements(project,generatedAt)
  if (!assessment) throw new Error('Project requirement assessment unavailable')

  const detector = d.alarm.default_detector_type
  const detectorSupported = detector === 'smoke' || detector === 'heat'
  const alarmCoverageInput = {
    floor_area_m2:d.alarm.design_floor_area_m2 ?? d.geometry.largest_floor_area_m2 ?? project.total_area_m2,
    detector_type:detectorSupported ? detector : null,
    ceiling_height_m:d.alarm.ceiling_height_m ?? d.geometry.typical_floor_height_m,
  }
  const alarmCoverage = buildTask('alarm-coverage','alarm','fire_alarm_preliminary','پوشش مقدماتی آشکارساز',alarmCoverageInput,[
    ['مساحت ناحیه طراحی',alarmCoverageInput.floor_area_m2],
    ['نوع آشکارساز Smoke/Heat',alarmCoverageInput.detector_type],
    ['ارتفاع سقف',alarmCoverageInput.ceiling_height_m],
  ], detector && !detectorSupported ? 'مدل پوشش فعلی موتور فقط برای Smoke/Heat قابل اجرای خودکار است؛ سایر فناوری‌ها باید با مدل اختصاصی بررسی شوند.' : undefined)

  const alarmBatteryInput = {
    standby_current_a:d.alarm.standby_current_a,
    standby_hours:d.alarm.standby_hours,
    alarm_current_a:d.alarm.alarm_current_a,
    alarm_hours:d.alarm.alarm_hours,
    margin_percent:d.alarm.battery_margin_percent,
  }
  const alarmBattery = buildTask('alarm-battery','alarm','fire_alarm_battery','ظرفیت باتری پنل',alarmBatteryInput,[
    ['جریان Standby',d.alarm.standby_current_a],['زمان Standby',d.alarm.standby_hours],['جریان Alarm',d.alarm.alarm_current_a],['زمان Alarm',d.alarm.alarm_hours],['ضریب ذخیره باتری',d.alarm.battery_margin_percent],
  ])

  const voltageDropInput = {
    one_way_length_m:d.alarm.longest_circuit_m,
    current_a:d.alarm.circuit_current_a,
    cable_area_mm2:d.alarm.cable_area_mm2,
    resistivity_ohm_mm2_m:d.alarm.conductor_resistivity_ohm_mm2_m,
    nominal_voltage_v:d.alarm.panel_voltage_v,
  }
  const voltageDrop = buildTask('alarm-voltage-drop','alarm','voltage_drop','افت ولتاژ مدار بحرانی',voltageDropInput,[
    ['طول یک‌طرفه مدار',d.alarm.longest_circuit_m],['جریان مدار',d.alarm.circuit_current_a],['سطح مقطع کابل',d.alarm.cable_area_mm2],['مقاومت ویژه هادی',d.alarm.conductor_resistivity_ohm_mm2_m],['ولتاژ نامی',d.alarm.panel_voltage_v],
  ])

  const sprinklerInput = {
    density_lpm_m2:d.suppression.design_density_lpm_m2,
    design_area_m2:d.suppression.hydraulic_design_area_m2,
    coverage_per_sprinkler_m2:d.suppression.sprinkler_coverage_m2,
    k_metric:d.suppression.k_factor_metric,
    hose_allowance_lpm:d.suppression.hose_allowance_lpm,
    duration_min:d.suppression.duration_min,
    active_sprinkler_count:d.suppression.active_sprinklers ?? null,
  }
  const sprinkler = buildTask('suppression-sprinkler','suppression','sprinkler_preliminary','پیش‌محاسبه اسپرینکلر',sprinklerInput,[
    ['Density',d.suppression.design_density_lpm_m2],['Design Area',d.suppression.hydraulic_design_area_m2],['Coverage/Sprinkler',d.suppression.sprinkler_coverage_m2],['K-Factor',d.suppression.k_factor_metric],['Hose Allowance',d.suppression.hose_allowance_lpm],['Duration',d.suppression.duration_min],
  ])

  const pumpInput = {
    flow_lpm:d.suppression.required_fire_flow_lpm,
    elevation_m:d.suppression.highest_outlet_elevation_m,
    residual_pressure_bar:d.suppression.required_residual_pressure_bar,
    friction_head_m:d.suppression.estimated_friction_head_m,
    safety_percent:d.suppression.pump_safety_percent,
    efficiency_percent:d.suppression.pump_efficiency_percent,
  }
  const pump = buildTask('suppression-pump','suppression','fire_pump','هد و توان مقدماتی پمپ',pumpInput,[
    ['دبی طراحی',d.suppression.required_fire_flow_lpm],['ارتفاع خروجی بحرانی',d.suppression.highest_outlet_elevation_m],['فشار باقیمانده موردنیاز',d.suppression.required_residual_pressure_bar],['افت اصطکاکی برآوردی',d.suppression.estimated_friction_head_m],['حاشیه طراحی',d.suppression.pump_safety_percent],['راندمان برآوردی',d.suppression.pump_efficiency_percent],
  ])

  const npshInput = {
    atmospheric_pressure_kpa:d.water_supply.atmospheric_pressure_kpa,
    vapor_pressure_kpa:d.water_supply.vapor_pressure_kpa,
    density_kg_m3:d.water_supply.water_density_kg_m3,
    static_suction_head_m:d.water_supply.suction_static_head_m,
    suction_loss_m:d.water_supply.suction_loss_m,
  }
  const npsh = buildTask('suppression-npsh','suppression','npsha','NPSH Available',npshInput,[
    ['فشار اتمسفریک',d.water_supply.atmospheric_pressure_kpa],['فشار بخار',d.water_supply.vapor_pressure_kpa],['چگالی آب',d.water_supply.water_density_kg_m3],['هد استاتیک مکش',d.water_supply.suction_static_head_m],['افت مسیر مکش',d.water_supply.suction_loss_m],
  ])

  const zoneAreas = d.smoke.parking_zone_areas_m2?.filter(v=>v>0) || []
  const zoneHeights = d.smoke.parking_clear_heights_m?.filter(v=>v>0) || []
  const fallbackHeight = d.geometry.typical_floor_height_m
  const zones = zoneAreas.map((area,index)=>({
    area_m2:area,
    height_m:zoneHeights[index] ?? (zoneHeights.length===1 ? zoneHeights[0] : fallbackHeight),
    normal_ach:d.smoke.normal_ach,
    fire_ach:d.smoke.fire_ach,
  }))
  const validSmokeScenario = d.smoke.fire_scenario === 'single_zone' || d.smoke.fire_scenario === 'all_zones' ? d.smoke.fire_scenario : null
  const parkingInput = {
    fire_scenario:validSmokeScenario,
    zones,
    makeup_percent:d.smoke.makeup_percent,
    shaft_velocity_mps:d.smoke.shaft_velocity_mps,
    damper_velocity_mps:d.smoke.damper_velocity_mps,
  }
  const parking = buildTask('smoke-parking','smoke','parking_smoke_group','کنترل دود زون‌های پارکینگ',parkingInput,[
    ['حداقل یک زون پارکینگ',zoneAreas],['ارتفاع زون‌ها',zones.length && zones.every(z=>present(z.height_m)) ? true : null],['ACH عادی',d.smoke.normal_ach],['ACH حریق',d.smoke.fire_ach],['هوای جبرانی',d.smoke.makeup_percent],['سرعت شفت',d.smoke.shaft_velocity_mps],['سرعت دمپر',d.smoke.damper_velocity_mps],['سناریوی single_zone یا all_zones',validSmokeScenario],
  ], d.smoke.fire_scenario && !validSmokeScenario ? 'سناریوی مهندسی خاص باید قبل از اجرای خودکار به مدل قابل محاسبه تبدیل و تأیید شود.' : undefined)

  const ductInput = { flow_cfm:d.smoke.design_exhaust_cfm, width_mm:d.smoke.duct_width_mm, height_mm:d.smoke.duct_height_mm }
  const duct = buildTask('smoke-duct','smoke','duct_velocity','کنترل سرعت کانال دود',ductInput,[
    ['دبی طراحی',d.smoke.design_exhaust_cfm],['عرض کانال',d.smoke.duct_width_mm],['ارتفاع کانال',d.smoke.duct_height_mm],
  ])

  const doorCount = d.smoke.stair_doors_open_count
  const doorW = d.smoke.stair_door_width_m
  const doorH = d.smoke.stair_door_height_m
  const openDoorArea = present(doorCount) && present(doorW) && present(doorH) ? Number(doorCount)*Number(doorW)*Number(doorH) : null
  const pressureInput = {
    pressure_pa:d.smoke.stair_design_pressure_pa,
    leakage_area_m2:d.smoke.stair_leakage_area_m2,
    discharge_coefficient:d.smoke.stair_discharge_coefficient,
    density_kg_m3:d.smoke.stair_air_density_kg_m3,
    open_door_area_m2:openDoorArea,
    open_door_velocity_mps:d.smoke.stair_open_door_velocity_mps,
    margin_percent:d.smoke.stair_margin_percent,
    door_width_m:doorW,
    door_height_m:doorH,
    handle_arm_m:d.smoke.stair_handle_arm_m,
    closer_force_n:d.smoke.stair_closer_force_n,
  }
  const pressurization = buildTask('smoke-pressurization','smoke','pressurization_single_zone','فشار مثبت راه‌پله — یک ناحیه',pressureInput,[
    ['فشار هدف',d.smoke.stair_design_pressure_pa],['سطح نشت',d.smoke.stair_leakage_area_m2],['ضریب تخلیه',d.smoke.stair_discharge_coefficient],['چگالی هوا',d.smoke.stair_air_density_kg_m3],['تعداد در باز',doorCount],['عرض در',doorW],['ارتفاع در',doorH],['سرعت هدف در باز',d.smoke.stair_open_door_velocity_mps],['حاشیه دبی',d.smoke.stair_margin_percent],['بازوی دستگیره',d.smoke.stair_handle_arm_m],['نیروی آرام‌بند',d.smoke.stair_closer_force_n],
  ])

  const atriumInput = {
    hrr_kw:d.smoke.atrium_design_fire_kw,
    convective_fraction:d.smoke.atrium_convective_fraction,
    layer_height_m:d.smoke.plume_height_m ?? d.smoke.target_smoke_layer_height_m,
    ambient_c:d.smoke.ambient_temperature_c,
    pressure_pa:d.smoke.ambient_pressure_pa,
    heat_fraction:d.smoke.atrium_heat_fraction,
  }
  const atrium = buildTask('smoke-atrium','smoke','atrium_axisymmetric','آتریوم — ستون دود متقارن',atriumInput,[
    ['توان حریق طراحی',d.smoke.atrium_design_fire_kw],['سهم جابجایی',d.smoke.atrium_convective_fraction],['ارتفاع ستون دود/لایه هدف',atriumInput.layer_height_m],['دمای محیط',d.smoke.ambient_temperature_c],['فشار مطلق محیط',d.smoke.ambient_pressure_pa],['سهم گرمای باقی‌مانده',d.smoke.atrium_heat_fraction],
  ])

  const tasks = [alarmCoverage,alarmBattery,voltageDrop,sprinkler,pump,npsh,parking,duct,pressurization,atrium]
  const statusByKey = Object.fromEntries(assessment.systems.map(s=>[s.key,s.status])) as Record<string,RequirementStatus>
  const modules: AutoDesignModulePlan[] = [
    {
      key:'alarm', label:'اعلام حریق', requirement_status:statusByKey.fire_alarm || 'not_indicated', readiness_score:assessment.modules.alarm.score,
      scope:['جانمایی و پوشش آشکارسازها','زون/لوپ و پنل','توان و باتری','افت ولتاژ مدارها','اینترفیس با فن، آسانسور، درب و BMS'],
      missing_inputs:assessment.modules.alarm.missing,
      tasks:tasks.filter(t=>t.discipline==='alarm'),
    },
    {
      key:'suppression', label:'اطفا و هیدرولیک', requirement_status:strongestStatus([statusByKey.sprinkler,statusByKey.standpipe,statusByKey.fire_pump].filter(Boolean)), readiness_score:assessment.modules.suppression.score,
      scope:['طبقه‌بندی خطر','Remote Area و Density','شبکه هیدرولیکی','رایزر/Standpipe','منبع آب، مخزن و پمپ','NPSH و مسیر مکش'],
      missing_inputs:assessment.modules.suppression.missing,
      tasks:tasks.filter(t=>t.discipline==='suppression'),
    },
    {
      key:'smoke', label:'کنترل دود و فشار مثبت', requirement_status:strongestStatus([statusByKey.smoke_control,statusByKey.stair_pressurization].filter(Boolean)), readiness_score:assessment.modules.smoke.score,
      scope:['زون‌بندی پارکینگ','اگزاست و Makeup','شفت، دمپر و کانال','فشار مثبت راه‌پله','آتریوم و لایه دود','Rating و Redundancy فن‌ها'],
      missing_inputs:assessment.modules.smoke.missing,
      tasks:tasks.filter(t=>t.discipline==='smoke'),
    },
  ]
  const geometry = preliminaryGeometry(project)
  const readyTaskCount = tasks.filter(t=>t.status==='ready').length
  return {
    engine_version:AUTO_DESIGN_ENGINE_VERSION,
    generated_at:generatedAt,
    project_id:project.id,
    project_name:project.name,
    scope_notice:'Auto Design یک خروجی مقدماتی و قابل ردیابی برای شروع طراحی است. نقشه، ابعاد، سیستم‌های انتخابی و محاسبات باید قبل از اجرا توسط مهندس طراح و AHJ کنترل و تأیید شوند.',
    modules,
    tasks,
    ready_task_count:readyTaskCount,
    blocked_task_count:tasks.length-readyTaskCount,
    global_missing:assessment.global_missing,
    standards_in_scope:assessment.standards_in_scope,
    geometry,
    handoff:{
      dxf_available:geometry.width_m>0 && geometry.length_m>0,
      bim_json_available:true,
      native_rvt_available:false,
      note:'خروجی BIM JSON برای انتقال داده/پارامترها آماده است؛ فایل Native RVT در این نسخه تولید نمی‌شود و باید در مرحله Connector/Revit Add-in ساخته شود.',
    },
  }
}

function dxfLine(x1:number,y1:number,x2:number,y2:number,layer:string){
  return `0\nLINE\n8\n${layer}\n10\n${x1}\n20\n${y1}\n30\n0\n11\n${x2}\n21\n${y2}\n31\n0\n`
}

function dxfRect(x:number,y:number,w:number,h:number,layer:string){
  return dxfLine(x,y,x+w,y,layer)+dxfLine(x+w,y,x+w,y+h,layer)+dxfLine(x+w,y+h,x,y+h,layer)+dxfLine(x,y+h,x,y,layer)
}

export function generateAutoDesignDxf(plan: AutoDesignPlan): string {
  const g=plan.geometry
  const s=1000
  let entities=''
  entities+=dxfRect(0,0,g.width_m*s,g.length_m*s,'BUILDING')
  for(const zone of g.smoke_zones) entities+=dxfRect(zone.x_m*s,zone.y_m*s,zone.width_m*s,zone.length_m*s,'SMOKE_ZONE')
  if(g.exhaust_shaft) entities+=dxfRect(g.exhaust_shaft.x_m*s,g.exhaust_shaft.y_m*s,g.exhaust_shaft.width_m*s,g.exhaust_shaft.length_m*s,'EXHAUST_SHAFT')
  if(g.makeup_shaft) entities+=dxfRect(g.makeup_shaft.x_m*s,g.makeup_shaft.y_m*s,g.makeup_shaft.width_m*s,g.makeup_shaft.length_m*s,'MAKEUP_SHAFT')
  return `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`
}

export function generateBimHandoff(plan: AutoDesignPlan, project: Project) {
  const d=getProjectDesignInput(project)
  const floorHeight=d.geometry.typical_floor_height_m || 0
  const below=project.floors_below || 0
  const above=project.floors_above || 0
  const levels=[] as Array<{name:string,elevation_m:number}>
  for(let i=below;i>=1;i--) levels.push({name:`B${i}`,elevation_m:Number((-i*floorHeight).toFixed(3))})
  levels.push({name:'Ground',elevation_m:0})
  for(let i=1;i<=Math.max(0,above-1);i++) levels.push({name:`L${i}`,elevation_m:Number((i*floorHeight).toFixed(3))})
  return {
    format:'RABIN-BIM-HANDOFF-1.0',
    generated_at:plan.generated_at,
    project:{id:project.id,name:project.name,code:project.project_code,building_use:project.building_use,city:project.city},
    units:{length:'m',area:'m2',airflow:'cfm',waterflow:'L/min',pressure:'bar|Pa'},
    levels,
    geometry:plan.geometry,
    systems:plan.modules.map(m=>({discipline:m.key,requirement_status:m.requirement_status,scope:m.scope,readiness_score:m.readiness_score})),
    design_inputs:d,
    standards:plan.standards_in_scope,
    warning:'این فایل Native RVT/IFC نیست؛ یک Manifest ساختاریافته برای Revit Add-in، Dynamo، IFC mapper یا CAD/BIM coordination است.',
  }
}
