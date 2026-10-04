import type { AutoDesignPlan, CalculationResponse, Project } from '../types'
import { getProjectDesignInput } from './projectDesign'

export const ENGINEERING_LAYOUT_VERSION = 'engineering-layout-1.0.0'

export type LayoutDiscipline = 'architecture' | 'alarm' | 'suppression' | 'smoke'
export type LayoutPoint = { x_m:number; y_m:number }
export type LayoutEquipment = {
  id:string
  discipline:LayoutDiscipline
  kind:string
  label:string
  layer:string
  x_m:number
  y_m:number
  level:string
  size_label?:string
  source:'project-input'|'calculation'|'concept'
}
export type LayoutRoute = {
  id:string
  discipline:LayoutDiscipline
  kind:string
  label:string
  layer:string
  points:LayoutPoint[]
  size_label?:string
  source:'project-input'|'calculation'|'concept'
}
export type RiserSystem = {
  id:string
  discipline:Exclude<LayoutDiscipline,'architecture'>
  label:string
  layer:string
  size_label?:string
  levels:Array<{name:string;elevation_m:number}>
}
export type EngineeringLayout = {
  engine_version:string
  generated_at:string
  project_id:string
  floor:{width_m:number;length_m:number;height_m:number;source:'project-inputs'|'inferred-rectangle'}
  layers:Array<{name:string;discipline:LayoutDiscipline;description:string}>
  equipment:LayoutEquipment[]
  routes:LayoutRoute[]
  risers:RiserSystem[]
  equipment_schedule:Array<{kind:string;label:string;discipline:LayoutDiscipline;count:number;size_label?:string}>
  route_schedule:Array<{kind:string;label:string;discipline:LayoutDiscipline;length_m:number;size_label?:string}>
  notes:string[]
}

type ResultMap = Record<string,CalculationResponse|undefined>
type ExtendedGeometry = ReturnType<typeof getProjectDesignInput>['geometry'] & {
  design_plan_width_m?:number|null
  design_plan_length_m?:number|null
  service_core_x_m?:number|null
  service_core_y_m?:number|null
}
type ExtendedAlarm = ReturnType<typeof getProjectDesignInput>['alarm'] & {panel_x_m?:number|null;panel_y_m?:number|null}
type ExtendedSuppression = ReturnType<typeof getProjectDesignInput>['suppression'] & {
  riser_x_m?:number|null
  riser_y_m?:number|null
  main_pipe_diameter_mm?:number|null
  branch_pipe_diameter_mm?:number|null
  standpipe_riser_diameter_mm?:number|null
}
type ExtendedSmoke = ReturnType<typeof getProjectDesignInput>['smoke'] & {
  exhaust_shaft_x_m?:number|null
  exhaust_shaft_y_m?:number|null
  makeup_shaft_x_m?:number|null
  makeup_shaft_y_m?:number|null
}

type LayoutLayer = {name:string;discipline:LayoutDiscipline;description:string}

const finite=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)
const clamp=(value:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,value))
const round=(value:number,digits=3)=>Number(value.toFixed(digits))
const point=(x:number,y:number):LayoutPoint=>({x_m:round(x),y_m:round(y)})

function resultNumber(results:ResultMap,id:string,key:string):number|undefined{
  const value=results[id]?.calculation.results?.[key]
  return finite(value)?value:undefined
}

function grid(count:number,width:number,length:number,margin:number):LayoutPoint[]{
  if(count<=0||width<=0||length<=0)return []
  const safeMargin=Math.min(margin,width*.2,length*.2)
  const usableW=Math.max(width-2*safeMargin,.1)
  const usableL=Math.max(length-2*safeMargin,.1)
  const cols=Math.max(1,Math.ceil(Math.sqrt(count*(usableW/usableL))))
  const rows=Math.max(1,Math.ceil(count/cols))
  const points:LayoutPoint[]=[]
  for(let r=0;r<rows&&points.length<count;r++){
    for(let c=0;c<cols&&points.length<count;c++){
      const x=safeMargin+(c+.5)*usableW/cols
      const y=safeMargin+(r+.5)*usableL/rows
      points.push(point(x,y))
    }
  }
  return points
}

function serpentine(points:LayoutPoint[],start:LayoutPoint):LayoutPoint[]{
  if(!points.length)return [start]
  const ys=[...new Set(points.map(p=>p.y_m))].sort((a,b)=>a-b)
  const ordered:LayoutPoint[]=[]
  ys.forEach((y,index)=>{
    const row=points.filter(p=>p.y_m===y).sort((a,b)=>a.x_m-b.x_m)
    if(index%2)row.reverse()
    ordered.push(...row)
  })
  return [start,...ordered]
}

function orthogonal(from:LayoutPoint,to:LayoutPoint):LayoutPoint[]{
  return [from,point(to.x_m,from.y_m),to]
}

function routeLength(points:LayoutPoint[]):number{
  let length=0
  for(let i=1;i<points.length;i++)length+=Math.hypot(points[i].x_m-points[i-1].x_m,points[i].y_m-points[i-1].y_m)
  return round(length,2)
}

function levels(project:Project,floorHeight:number){
  const below=project.floors_below||0
  const above=project.floors_above||0
  const list:Array<{name:string;elevation_m:number}>=[]
  for(let i=below;i>=1;i--)list.push({name:`B${i}`,elevation_m:round(-i*floorHeight)})
  list.push({name:'Ground',elevation_m:0})
  for(let i=1;i<=Math.max(0,above-1);i++)list.push({name:`L${i}`,elevation_m:round(i*floorHeight)})
  return list
}

export function generateEngineeringLayout(project:Project,plan:AutoDesignPlan,results:ResultMap={}):EngineeringLayout{
  const d=getProjectDesignInput(project)
  const geometry=d.geometry as ExtendedGeometry
  const alarm=d.alarm as ExtendedAlarm
  const suppression=d.suppression as ExtendedSuppression
  const smoke=d.smoke as ExtendedSmoke
  const explicitW=finite(geometry.design_plan_width_m)&&geometry.design_plan_width_m>0?geometry.design_plan_width_m:undefined
  const explicitL=finite(geometry.design_plan_length_m)&&geometry.design_plan_length_m>0?geometry.design_plan_length_m:undefined
  const width=explicitW&&explicitL?explicitW:plan.geometry.width_m
  const length=explicitW&&explicitL?explicitL:plan.geometry.length_m
  const floorHeight=d.geometry.typical_floor_height_m||plan.geometry.height_m||0
  const source=explicitW&&explicitL?'project-inputs':plan.geometry.source
  const equipment:LayoutEquipment[]=[]
  const routes:LayoutRoute[]=[]
  const notes:string[]=[
    'جانمایی و مسیرها Concept Design هستند و بدون پلان معماری/موانع/سقف کاذب/سازه، نقشه اجرایی محسوب نمی‌شوند.',
    'هیچ فاصله، قطر لوله، سطح مقطع کابل یا ابعاد کانال استانداردی در این موتور پنهانی فرض نمی‌شود؛ برچسب سایز فقط از ورودی پروژه یا نتیجه محاسبه ثبت‌شده می‌آید.',
  ]
  if(width<=0||length<=0){
    return {engine_version:ENGINEERING_LAYOUT_VERSION,generated_at:new Date().toISOString(),project_id:project.id,floor:{width_m:0,length_m:0,height_m:floorHeight,source},layers:[],equipment,routes,risers:[],equipment_schedule:[],route_schedule:[],notes:[...notes,'هندسه پلان برای تولید Layout کافی نیست.']}
  }

  const core=point(
    finite(geometry.service_core_x_m)?clamp(geometry.service_core_x_m,0,width):width*.12,
    finite(geometry.service_core_y_m)?clamp(geometry.service_core_y_m,0,length):length*.5,
  )
  const alarmPanel=point(
    finite(alarm.panel_x_m)?clamp(alarm.panel_x_m,0,width):Math.min(1,width*.08),
    finite(alarm.panel_y_m)?clamp(alarm.panel_y_m,0,length):Math.min(1,length*.08),
  )
  const suppressionRiser=point(
    finite(suppression.riser_x_m)?clamp(suppression.riser_x_m,0,width):core.x_m,
    finite(suppression.riser_y_m)?clamp(suppression.riser_y_m,0,length):core.y_m,
  )
  const exDefault=plan.geometry.exhaust_shaft?point(plan.geometry.exhaust_shaft.x_m+plan.geometry.exhaust_shaft.width_m/2,plan.geometry.exhaust_shaft.y_m+plan.geometry.exhaust_shaft.length_m/2):point(width*.9,length*.9)
  const muDefault=plan.geometry.makeup_shaft?point(plan.geometry.makeup_shaft.x_m+plan.geometry.makeup_shaft.width_m/2,plan.geometry.makeup_shaft.y_m+plan.geometry.makeup_shaft.length_m/2):point(width*.1,length*.1)
  const exhaustShaft=point(finite(smoke.exhaust_shaft_x_m)?clamp(smoke.exhaust_shaft_x_m,0,width):exDefault.x_m,finite(smoke.exhaust_shaft_y_m)?clamp(smoke.exhaust_shaft_y_m,0,length):exDefault.y_m)
  const makeupShaft=point(finite(smoke.makeup_shaft_x_m)?clamp(smoke.makeup_shaft_x_m,0,width):muDefault.x_m,finite(smoke.makeup_shaft_y_m)?clamp(smoke.makeup_shaft_y_m,0,length):muDefault.y_m)

  const alarmModule=plan.modules.find(m=>m.key==='alarm')
  if(alarmModule?.requirement_status!=='not_indicated'){
    equipment.push({id:'FACP-01',discipline:'alarm',kind:'facp',label:'FACP',layer:'FA-PANEL',x_m:alarmPanel.x_m,y_m:alarmPanel.y_m,level:'Ground',size_label:alarm.system_type||undefined,source:finite(alarm.panel_x_m)&&finite(alarm.panel_y_m)?'project-input':'concept'})
    const detectorCount=Math.max(0,Math.round(resultNumber(results,'alarm-coverage','estimated_detectors')||0))
    if(detectorCount>0){
      const detectorPoints=grid(detectorCount,width,length,Math.min(1.2,Math.min(width,length)*.08))
      detectorPoints.forEach((p,index)=>equipment.push({id:`DET-${String(index+1).padStart(3,'0')}`,discipline:'alarm',kind:'detector',label:(alarm.default_detector_type||'Detector').toUpperCase(),layer:'FA-DETECTOR',x_m:p.x_m,y_m:p.y_m,level:'Typical',source:'calculation'}))
      routes.push({id:'FA-LOOP-01',discipline:'alarm',kind:'cable',label:'Fire Alarm Loop',layer:'FA-CABLE',points:serpentine(detectorPoints,alarmPanel),size_label:finite(alarm.cable_area_mm2)?`${alarm.cable_area_mm2} mm²`:undefined,source:finite(alarm.cable_area_mm2)?'project-input':'concept'})
    }else notes.push('جانمایی دتکتورها پس از اجرای محاسبه پوشش اعلام حریق روی نقشه ظاهر می‌شود.')
  }

  const suppressionModule=plan.modules.find(m=>m.key==='suppression')
  if(suppressionModule?.requirement_status!=='not_indicated'){
    equipment.push({id:'RISER-SP-01',discipline:'suppression',kind:'riser',label:'FIRE RISER',layer:'FF-RISER',x_m:suppressionRiser.x_m,y_m:suppressionRiser.y_m,level:'All',size_label:finite(suppression.standpipe_riser_diameter_mm)?`Ø${suppression.standpipe_riser_diameter_mm} mm`:undefined,source:finite(suppression.riser_x_m)&&finite(suppression.riser_y_m)?'project-input':'concept'})
    const coverage=finite(d.suppression.sprinkler_coverage_m2)&&d.suppression.sprinkler_coverage_m2>0?d.suppression.sprinkler_coverage_m2:undefined
    const floorArea=width*length
    const sprinklerCount=coverage?Math.ceil(floorArea/coverage):0
    if(sprinklerCount>0){
      const sprinklerPoints=grid(sprinklerCount,width,length,Math.min(.8,Math.min(width,length)*.06))
      sprinklerPoints.forEach((p,index)=>equipment.push({id:`SP-${String(index+1).padStart(3,'0')}`,discipline:'suppression',kind:'sprinkler',label:'SPR',layer:'FF-SPRINKLER',x_m:p.x_m,y_m:p.y_m,level:'Typical',size_label:finite(d.suppression.k_factor_metric)?`K=${d.suppression.k_factor_metric}`:undefined,source:'concept'}))
      const rows=[...new Set(sprinklerPoints.map(p=>p.y_m))].sort((a,b)=>a-b)
      const branchSize=finite(suppression.branch_pipe_diameter_mm)?`Ø${suppression.branch_pipe_diameter_mm} mm`:undefined
      const mainSize=finite(suppression.main_pipe_diameter_mm)?`Ø${suppression.main_pipe_diameter_mm} mm`:undefined
      rows.forEach((y,index)=>{
        const row=sprinklerPoints.filter(p=>p.y_m===y).sort((a,b)=>a.x_m-b.x_m)
        if(!row.length)return
        const near=row.reduce((best,p)=>Math.abs(p.x_m-suppressionRiser.x_m)<Math.abs(best.x_m-suppressionRiser.x_m)?p:best,row[0])
        routes.push({id:`FF-BR-${index+1}`,discipline:'suppression',kind:'branch-pipe',label:`Sprinkler Branch ${index+1}`,layer:'FF-BRANCH',points:[row[0],row[row.length-1]],size_label:branchSize,source:branchSize?'project-input':'concept'})
        routes.push({id:`FF-FEED-${index+1}`,discipline:'suppression',kind:'feed-pipe',label:`Branch Feed ${index+1}`,layer:'FF-MAIN',points:orthogonal(suppressionRiser,near),size_label:mainSize,source:mainSize?'project-input':'concept'})
      })
    }else notes.push('برای تولید شبکه مفهومی اسپرینکلر، Coverage هر اسپرینکلر در پرونده پروژه ثبت شود.')
  }

  const smokeModule=plan.modules.find(m=>m.key==='smoke')
  if(smokeModule?.requirement_status!=='not_indicated'){
    const ductSize=finite(d.smoke.duct_width_mm)&&finite(d.smoke.duct_height_mm)?`${d.smoke.duct_width_mm}×${d.smoke.duct_height_mm} mm`:undefined
    equipment.push({id:'SHAFT-EX-01',discipline:'smoke',kind:'exhaust-shaft',label:'EX SHAFT',layer:'SC-EXHAUST-SHAFT',x_m:exhaustShaft.x_m,y_m:exhaustShaft.y_m,level:'All',size_label:ductSize,source:finite(smoke.exhaust_shaft_x_m)&&finite(smoke.exhaust_shaft_y_m)?'project-input':'concept'})
    equipment.push({id:'SHAFT-MU-01',discipline:'smoke',kind:'makeup-shaft',label:'MU SHAFT',layer:'SC-MAKEUP-SHAFT',x_m:makeupShaft.x_m,y_m:makeupShaft.y_m,level:'All',source:finite(smoke.makeup_shaft_x_m)&&finite(smoke.makeup_shaft_y_m)?'project-input':'concept'})
    const zones=plan.geometry.smoke_zones.length?plan.geometry.smoke_zones:[{name:'Design Zone',area_m2:width*length,x_m:0,y_m:0,width_m:width,length_m:length}]
    zones.forEach((z,index)=>{
      const c=point(clamp(z.x_m+z.width_m/2,0,width),clamp(z.y_m+z.length_m/2,0,length))
      equipment.push({id:`EXTRACT-${index+1}`,discipline:'smoke',kind:'extract-point',label:`EX ${index+1}`,layer:'SC-EXTRACT',x_m:c.x_m,y_m:c.y_m,level:'Parking',source:'concept'})
      routes.push({id:`SC-EX-${index+1}`,discipline:'smoke',kind:'exhaust-duct',label:`Exhaust Duct ${index+1}`,layer:'SC-EXHAUST-DUCT',points:orthogonal(c,exhaustShaft),size_label:ductSize,source:ductSize?'project-input':'concept'})
      routes.push({id:`SC-MU-${index+1}`,discipline:'smoke',kind:'makeup-duct',label:`Make-up Route ${index+1}`,layer:'SC-MAKEUP-DUCT',points:orthogonal(makeupShaft,c),source:'concept'})
    })
  }

  const lvls=levels(project,floorHeight)
  const risers:RiserSystem[]=[]
  if(alarmModule?.requirement_status!=='not_indicated')risers.push({id:'R-FA',discipline:'alarm',label:'Fire Alarm Loop / Riser',layer:'FA-RISER',size_label:finite(alarm.cable_area_mm2)?`${alarm.cable_area_mm2} mm²`:undefined,levels:lvls})
  if(suppressionModule?.requirement_status!=='not_indicated'){
    if(d.systems.sprinkler_required!==false)risers.push({id:'R-SP',discipline:'suppression',label:'Sprinkler Riser',layer:'FF-SPRINKLER-RISER',size_label:finite(suppression.main_pipe_diameter_mm)?`Ø${suppression.main_pipe_diameter_mm} mm`:undefined,levels:lvls})
    if(d.systems.standpipe_required!==false)risers.push({id:'R-ST',discipline:'suppression',label:'Standpipe Riser',layer:'FF-STANDPIPE',size_label:finite(suppression.standpipe_riser_diameter_mm)?`Ø${suppression.standpipe_riser_diameter_mm} mm`:undefined,levels:lvls})
  }
  if(smokeModule?.requirement_status!=='not_indicated'){
    if(d.systems.smoke_control_required!==false)risers.push({id:'R-EX',discipline:'smoke',label:'Smoke Exhaust Shaft',layer:'SC-EXHAUST-RISER',size_label:ductSizeLabel(d.smoke.duct_width_mm,d.smoke.duct_height_mm),levels:lvls})
    if(d.systems.stair_pressurization_required===true)risers.push({id:'R-PP',discipline:'smoke',label:'Stair Pressurization',layer:'SC-PRESS-RISER',size_label:resultNumber(results,'smoke-pressurization','design_supply_cfm')?`${Math.round(resultNumber(results,'smoke-pressurization','design_supply_cfm')!)} CFM`:undefined,levels:lvls})
  }

  const equipmentMap=new Map<string,{kind:string;label:string;discipline:LayoutDiscipline;count:number;size_label?:string}>()
  for(const item of equipment){
    const key=`${item.discipline}:${item.kind}:${item.size_label||''}`
    const existing=equipmentMap.get(key)
    if(existing)existing.count+=1
    else equipmentMap.set(key,{kind:item.kind,label:item.label,discipline:item.discipline,count:1,size_label:item.size_label})
  }
  const route_schedule=routes.map(r=>({kind:r.kind,label:r.label,discipline:r.discipline,length_m:routeLength(r.points),size_label:r.size_label}))
  const layerMap=new Map<string,LayoutLayer>()
  layerMap.set('A-BUILDING',{name:'A-BUILDING',discipline:'architecture',description:'پوسته مفهومی پلان'})
  for(const item of equipment)layerMap.set(item.layer,{name:item.layer,discipline:item.discipline,description:`Equipment: ${item.kind}`})
  for(const route of routes)layerMap.set(route.layer,{name:route.layer,discipline:route.discipline,description:`Route: ${route.kind}`})
  const layers=[...layerMap.values()]
  return {
    engine_version:ENGINEERING_LAYOUT_VERSION,
    generated_at:new Date().toISOString(),
    project_id:project.id,
    floor:{width_m:round(width),length_m:round(length),height_m:round(floorHeight),source},
    layers,
    equipment,
    routes,
    risers,
    equipment_schedule:[...equipmentMap.values()],
    route_schedule,
    notes,
  }
}

function ductSizeLabel(width:unknown,height:unknown){return finite(width)&&finite(height)?`${width}×${height} mm`:undefined}

function dxfLine(a:LayoutPoint,b:LayoutPoint,layer:string){return `0\nLINE\n8\n${layer}\n10\n${a.x_m*1000}\n20\n${a.y_m*1000}\n30\n0\n11\n${b.x_m*1000}\n21\n${b.y_m*1000}\n31\n0\n`}
function dxfCircle(p:LayoutPoint,r:number,layer:string){return `0\nCIRCLE\n8\n${layer}\n10\n${p.x_m*1000}\n20\n${p.y_m*1000}\n30\n0\n40\n${r}\n`}
function dxfText(p:LayoutPoint,text:string,layer:string,height=180){const safe=text.replace(/\n/g,' ').slice(0,80);return `0\nTEXT\n8\n${layer}\n10\n${p.x_m*1000}\n20\n${p.y_m*1000}\n30\n0\n40\n${height}\n1\n${safe}\n`}
function dxfRect(x:number,y:number,w:number,h:number,layer:string){const p1=point(x,y),p2=point(x+w,y),p3=point(x+w,y+h),p4=point(x,y+h);return dxfLine(p1,p2,layer)+dxfLine(p2,p3,layer)+dxfLine(p3,p4,layer)+dxfLine(p4,p1,layer)}

export function generateLayeredEngineeringDxf(layout:EngineeringLayout,plan:AutoDesignPlan):string{
  let entities=dxfRect(0,0,layout.floor.width_m,layout.floor.length_m,'A-BUILDING')
  for(const zone of plan.geometry.smoke_zones)entities+=dxfRect(zone.x_m,zone.y_m,zone.width_m,zone.length_m,'SC-ZONE')
  for(const route of layout.routes){for(let i=1;i<route.points.length;i++)entities+=dxfLine(route.points[i-1],route.points[i],route.layer);if(route.size_label&&route.points.length)entities+=dxfText(route.points[Math.floor(route.points.length/2)],route.size_label,`${route.layer}-TEXT`,150)}
  for(const item of layout.equipment){entities+=dxfCircle(point(item.x_m,item.y_m),item.kind.includes('shaft')||item.kind==='riser'?260:140,item.layer);entities+=dxfText(point(item.x_m+.22,item.y_m+.22),item.label,item.layer,130)}
  const layerNames=[...new Set(['A-BUILDING','SC-ZONE',...layout.layers.map(l=>l.name),...layout.routes.filter(r=>r.size_label).map(r=>`${r.layer}-TEXT`)])]
  const table=layerNames.map(name=>`0\nLAYER\n2\n${name}\n70\n0\n62\n7\n6\nCONTINUOUS\n`).join('')
  return `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n${layerNames.length}\n${table}0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`
}

export function generateConnectorPackage(layout:EngineeringLayout,plan:AutoDesignPlan,project:Project){
  const category=(item:LayoutEquipment)=>item.discipline==='alarm'?'OST_FireAlarmDevices':item.kind==='sprinkler'?'OST_Sprinklers':item.discipline==='smoke'?'OST_MechanicalEquipment':'OST_GenericModel'
  const ifcClass=(item:LayoutEquipment)=>item.kind==='sprinkler'?'IfcFireSuppressionTerminal':item.discipline==='alarm'?'IfcAlarm':item.kind.includes('shaft')?'IfcDistributionChamberElement':item.discipline==='smoke'?'IfcFlowTerminal':'IfcDistributionElement'
  return {
    format:'RABIN-CAD-BIM-CONNECTOR-1.0',
    generated_at:layout.generated_at,
    project:{id:project.id,name:project.name,code:project.project_code},
    coordinate_system:{origin:'project local 0,0,0',length_unit:'m'},
    revit:{native_rvt:false,note:'Payload آماده مصرف توسط Revit Add-in/Dynamo است؛ ایجاد Element واقعی در Revit نیازمند Connector سمت Revit است.',elements:layout.equipment.map(e=>({...e,revit_category:category(e),family_type_hint:e.kind})),routes:layout.routes.map(r=>({...r,revit_category:r.discipline==='alarm'?'OST_Wire':r.discipline==='smoke'?'OST_DuctCurves':'OST_PipeCurves'}))},
    ifc:{native_ifc:false,note:'IFC class mapping آماده است ولی فایل STEP/IFC نهایی در این نسخه تولید و validate نمی‌شود.',elements:layout.equipment.map(e=>({id:e.id,ifc_class:ifcClass(e),placement:{x_m:e.x_m,y_m:e.y_m,level:e.level},properties:{label:e.label,size:e.size_label||null,discipline:e.discipline}}))},
    risers:layout.risers,
    layers:layout.layers,
    standards:plan.standards_in_scope,
    warnings:layout.notes,
  }
}

export function generateEquipmentScheduleCsv(layout:EngineeringLayout):string{
  const esc=(v:unknown)=>`"${String(v??'').replace(/"/g,'""')}"`
  const header=['Discipline','Kind','Label','Count','Size / Parameter']
  const rows=layout.equipment_schedule.map(r=>[r.discipline,r.kind,r.label,r.count,r.size_label||''])
  return [header,...rows].map(row=>row.map(esc).join(',')).join('\n')
}
