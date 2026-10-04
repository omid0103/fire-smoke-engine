import type { AutoDesignPlan, CalculationResponse, Project } from '../types'
import { getProjectDesignInput } from './projectDesign'
import type { ArchitectureModel, ArchPoint } from './architectureDxf'
import { pointBlocked, segmentBlocked } from './architectureDxf'
import { generateEngineeringLayout, type EngineeringLayout, type LayoutEquipment, type LayoutRoute } from './engineeringLayout'

export type CoordinationIssue={
  id:string
  severity:'error'|'warning'|'info'
  discipline:'alarm'|'suppression'|'smoke'|'coordination'
  kind:'equipment-clash'|'route-clash'|'spacing'|'input'
  message:string
  element_ids:string[]
}
export type CoordinationAudit={generated_at:string;issue_count:number;error_count:number;warning_count:number;issues:CoordinationIssue[]}
type Results=Record<string,CalculationResponse|undefined>
type Criteria={
  alarm:{max_detector_spacing_m?:number|null;min_detector_wall_clearance_m?:number|null}
  suppression:{max_sprinkler_spacing_m?:number|null;min_sprinkler_wall_clearance_m?:number|null}
  smoke:{min_extract_spacing_m?:number|null;min_route_clearance_m?:number|null}
}
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)
const round=(v:number,d=3)=>Number(v.toFixed(d))
const point=(x:number,y:number):ArchPoint=>({x_m:round(x),y_m:round(y)})

function planForArchitecture(plan:AutoDesignPlan,arch:ArchitectureModel):AutoDesignPlan{
  const oldW=plan.geometry.width_m||arch.bounds.width_m,oldL=plan.geometry.length_m||arch.bounds.length_m
  const sx=oldW>0?arch.bounds.width_m/oldW:1,sy=oldL>0?arch.bounds.length_m/oldL:1
  return {...plan,geometry:{...plan.geometry,source:'project-inputs',width_m:arch.bounds.width_m,length_m:arch.bounds.length_m,smoke_zones:plan.geometry.smoke_zones.map(z=>({...z,x_m:round(z.x_m*sx),y_m:round(z.y_m*sy),width_m:round(z.width_m*sx),length_m:round(z.length_m*sy)})),exhaust_shaft:plan.geometry.exhaust_shaft?{x_m:round(plan.geometry.exhaust_shaft.x_m*sx),y_m:round(plan.geometry.exhaust_shaft.y_m*sy),width_m:round(plan.geometry.exhaust_shaft.width_m*sx),length_m:round(plan.geometry.exhaust_shaft.length_m*sy)}:undefined,makeup_shaft:plan.geometry.makeup_shaft?{x_m:round(plan.geometry.makeup_shaft.x_m*sx),y_m:round(plan.geometry.makeup_shaft.y_m*sy),width_m:round(plan.geometry.makeup_shaft.width_m*sx),length_m:round(plan.geometry.makeup_shaft.length_m*sy)}:undefined}}
}
function nearbyFree(arch:ArchitectureModel,p:ArchPoint,clearance:number):ArchPoint{
  if(!pointBlocked(arch,p,clearance))return p
  const steps=[.15,.3,.5,.75,1,1.5,2]
  for(const r of steps)for(let deg=0;deg<360;deg+=30){const a=deg*Math.PI/180,q=point(Math.min(arch.bounds.width_m,Math.max(0,p.x_m+Math.cos(a)*r)),Math.min(arch.bounds.length_m,Math.max(0,p.y_m+Math.sin(a)*r)));if(!pointBlocked(arch,q,clearance))return q}
  return p
}
function relocateEquipment(project:Project,arch:ArchitectureModel,items:LayoutEquipment[]){
  const d=getProjectDesignInput(project) as ReturnType<typeof getProjectDesignInput>&Criteria
  return items.map(item=>{
    const clearance=item.discipline==='alarm'?(d.alarm.max_detector_spacing_m?Math.min(.5,d.alarm.min_detector_wall_clearance_m||.12):d.alarm.min_detector_wall_clearance_m||.12):item.discipline==='suppression'?(d.suppression.min_sprinkler_wall_clearance_m||.12):(d.smoke.min_route_clearance_m||.12)
    const moved=nearbyFree(arch,point(item.x_m,item.y_m),clearance)
    return {...item,x_m:moved.x_m,y_m:moved.y_m,source:moved.x_m!==item.x_m||moved.y_m!==item.y_m?'concept':item.source}
  })
}
function routeEndpointsAware(arch:ArchitectureModel,r:LayoutRoute,eq:LayoutEquipment[]){
  if(r.points.length<2)return r
  const start=r.points[0],end=r.points[r.points.length-1]
  const candidates:ArchPoint[][]=[
    [start,point(end.x_m,start.y_m),end],
    [start,point(start.x_m,end.y_m),end],
    [start,point((start.x_m+end.x_m)/2,start.y_m),point((start.x_m+end.x_m)/2,end.y_m),end],
    [start,point(start.x_m,(start.y_m+end.y_m)/2),point(end.x_m,(start.y_m+end.y_m)/2),end],
  ]
  const score=(pts:ArchPoint[])=>pts.slice(1).reduce((n,p,i)=>n+(segmentBlocked(arch,pts[i],p)?1:0),0)
  const best=candidates.sort((a,b)=>score(a)-score(b))[0]
  if(score(best)===0&&r.kind!=='cable')return {...r,points:best,source:'concept'}
  if(r.kind==='cable'&&r.points.length>3){
    const adjusted=r.points.map((p,i)=>i===0?p:nearbyFree(arch,p,.08))
    return {...r,points:adjusted}
  }
  return {...r,points:best}
}
export function generateArchitectureAwareLayout(project:Project,plan:AutoDesignPlan,results:Results,arch?:ArchitectureModel|null):EngineeringLayout{
  if(!arch)return generateEngineeringLayout(project,plan,results)
  const architecturalPlan=planForArchitecture(plan,arch)
  const base=generateEngineeringLayout(project,architecturalPlan,results)
  const equipment=relocateEquipment(project,arch,base.equipment)
  const routes=base.routes.map(r=>routeEndpointsAware(arch,r,equipment))
  const route_schedule=routes.map(r=>({...base.route_schedule.find(x=>x.label===r.label),kind:r.kind,label:r.label,discipline:r.discipline,length_m:round(r.points.slice(1).reduce((s,p,i)=>s+Math.hypot(p.x_m-r.points[i].x_m,p.y_m-r.points[i].y_m),0),2),size_label:r.size_label}))
  return {...base,engine_version:`${base.engine_version}+arch-1.0`,floor:{...base.floor,width_m:arch.bounds.width_m,length_m:arch.bounds.length_m,source:'project-inputs'},equipment,routes,route_schedule,notes:[...base.notes,`پلان معماری ${arch.source_name} وارد شده و مبنای Bounds/Clash قرار گرفت.`,...arch.warnings]}
}
function nearestDistance(items:LayoutEquipment[],item:LayoutEquipment){let best=Infinity;for(const other of items)if(other.id!==item.id)best=Math.min(best,Math.hypot(item.x_m-other.x_m,item.y_m-other.y_m));return best}
export function auditEngineeringLayout(project:Project,layout:EngineeringLayout,arch?:ArchitectureModel|null):CoordinationAudit{
  const d=getProjectDesignInput(project) as ReturnType<typeof getProjectDesignInput>&Criteria
  const issues:CoordinationIssue[]=[]
  if(arch){
    for(const e of layout.equipment){const clear=e.discipline==='alarm'?(d.alarm.min_detector_wall_clearance_m||.12):e.discipline==='suppression'?(d.suppression.min_sprinkler_wall_clearance_m||.12):(d.smoke.min_route_clearance_m||.12);if(pointBlocked(arch,point(e.x_m,e.y_m),clear))issues.push({id:`EQ-${e.id}`,severity:'error',discipline:e.discipline==='architecture'?'coordination':e.discipline,kind:'equipment-clash',message:`${e.label} با دیوار/ستون/رمپ تداخل دارد یا Clearance ثبت‌شده را رعایت نمی‌کند.`,element_ids:[e.id]})}
    for(const r of layout.routes){for(let i=1;i<r.points.length;i++)if(segmentBlocked(arch,r.points[i-1],r.points[i])){issues.push({id:`RT-${r.id}-${i}`,severity:'warning',discipline:r.discipline==='architecture'?'coordination':r.discipline,kind:'route-clash',message:`مسیر ${r.label} در قطعه ${i} با مانع معماری تقاطع دارد و نیازمند Route Review است.`,element_ids:[r.id]});break}}
  }
  const checks:[string,LayoutEquipment[],number|undefined,'alarm'|'suppression'|'smoke'][]=[
    ['دتکتور',layout.equipment.filter(e=>e.kind==='detector'),finite(d.alarm.max_detector_spacing_m)?d.alarm.max_detector_spacing_m:undefined,'alarm'],
    ['اسپرینکلر',layout.equipment.filter(e=>e.kind==='sprinkler'),finite(d.suppression.max_sprinkler_spacing_m)?d.suppression.max_sprinkler_spacing_m:undefined,'suppression'],
    ['نقطه تخلیه',layout.equipment.filter(e=>e.kind==='extract-point'),finite(d.smoke.min_extract_spacing_m)?d.smoke.min_extract_spacing_m:undefined,'smoke'],
  ]
  for(const [label,items,limit,discipline] of checks){if(items.length<2||!limit)continue;for(const e of items){const dist=nearestDistance(items,e);const violation=discipline==='smoke'?dist<limit:dist>limit;if(violation)issues.push({id:`SP-${e.id}`,severity:'warning',discipline,kind:'spacing',message:discipline==='smoke'?`${label} ${e.id}: فاصله نزدیک‌ترین نقطه ${round(dist,2)} m کمتر از حد ثبت‌شده ${limit} m است.`:`${label} ${e.id}: فاصله نزدیک‌ترین تجهیز ${round(dist,2)} m بیشتر از حد ثبت‌شده ${limit} m است.`,element_ids:[e.id]})}}
  if(!arch)issues.push({id:'NO-ARCH',severity:'info',discipline:'coordination',kind:'input',message:'پلان DXF معماری وارد نشده؛ Clash Check فقط پس از ورود پلان واقعی فعال می‌شود.',element_ids:[]})
  if(!finite(d.alarm.max_detector_spacing_m))issues.push({id:'NO-DET-SPACING',severity:'info',discipline:'alarm',kind:'input',message:'حداکثر فاصله دتکتور برای Edition/AHJ پروژه ثبت نشده؛ Spacing Check دتکتور عدد قطعی صادر نمی‌کند.',element_ids:[]})
  if(!finite(d.suppression.max_sprinkler_spacing_m))issues.push({id:'NO-SP-SPACING',severity:'info',discipline:'suppression',kind:'input',message:'حداکثر فاصله اسپرینکلر برای Hazard/Edition پروژه ثبت نشده؛ Spacing Check اسپرینکلر عدد قطعی صادر نمی‌کند.',element_ids:[]})
  return {generated_at:new Date().toISOString(),issue_count:issues.length,error_count:issues.filter(i=>i.severity==='error').length,warning_count:issues.filter(i=>i.severity==='warning').length,issues}
}

function dxfLine(a:ArchPoint,b:ArchPoint,layer:string){return `0\nLINE\n8\n${layer}\n10\n${a.x_m*1000}\n20\n${a.y_m*1000}\n30\n0\n11\n${b.x_m*1000}\n21\n${b.y_m*1000}\n31\n0\n`}
function dxfCircle(p:ArchPoint,r:number,layer:string){return `0\nCIRCLE\n8\n${layer}\n10\n${p.x_m*1000}\n20\n${p.y_m*1000}\n30\n0\n40\n${r}\n`}
function dxfPolyline(points:ArchPoint[],layer:string,closed=false){let out=`0\nLWPOLYLINE\n8\n${layer}\n90\n${points.length}\n70\n${closed?1:0}\n`;for(const p of points)out+=`10\n${p.x_m*1000}\n20\n${p.y_m*1000}\n`;return out}
export function generateCoordinatedDxf(layout:EngineeringLayout,arch?:ArchitectureModel|null){
  const layers=[...new Set(['A-WALL','A-COLUMN','A-RAMP','A-ROOM','A-BOUNDARY',...layout.layers.map(l=>l.name),...layout.routes.map(r=>r.layer),...layout.equipment.map(e=>e.layer)])]
  const table=layers.map(name=>`0\nLAYER\n2\n${name}\n70\n0\n62\n7\n6\nCONTINUOUS\n`).join('')
  let entities=''
  if(arch){for(const w of arch.walls)entities+=dxfLine(w.a,w.b,w.kind==='wall'?'A-WALL':'A-BOUNDARY');for(const p of arch.columns)entities+=dxfPolyline(p.points,'A-COLUMN',true);for(const p of arch.ramps)entities+=dxfPolyline(p.points,'A-RAMP',true);for(const p of arch.rooms)entities+=dxfPolyline(p.points,'A-ROOM',true);for(const p of arch.boundaries)entities+=dxfPolyline(p.points,'A-BOUNDARY',true)}
  else entities+=dxfPolyline([{x_m:0,y_m:0},{x_m:layout.floor.width_m,y_m:0},{x_m:layout.floor.width_m,y_m:layout.floor.length_m},{x_m:0,y_m:layout.floor.length_m}],'A-BOUNDARY',true)
  for(const r of layout.routes)for(let i=1;i<r.points.length;i++)entities+=dxfLine(r.points[i-1],r.points[i],r.layer)
  for(const e of layout.equipment)entities+=dxfCircle(point(e.x_m,e.y_m),e.kind.includes('shaft')||e.kind==='riser'?260:140,e.layer)
  return `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n${layers.length}\n${table}0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`
}
