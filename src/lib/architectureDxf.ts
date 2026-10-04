export type ArchPoint={x_m:number;y_m:number}
export type ArchSegment={id:string;layer:string;kind:'wall'|'line';a:ArchPoint;b:ArchPoint}
export type ArchPolygon={id:string;layer:string;kind:'room'|'column'|'ramp'|'boundary'|'unknown';points:ArchPoint[];area_m2:number}
export type ArchitectureModel={
  version:'rabin-arch-1.0'
  source_name:string
  source_format:'dxf'
  imported_at:string
  insunits:number
  unit_scale_to_m:number
  bounds:{min_x_m:number;min_y_m:number;max_x_m:number;max_y_m:number;width_m:number;length_m:number}
  walls:ArchSegment[]
  rooms:ArchPolygon[]
  columns:ArchPolygon[]
  ramps:ArchPolygon[]
  boundaries:ArchPolygon[]
  unknown_polygons:ArchPolygon[]
  warnings:string[]
}

type Pair={code:number;value:string}
type RawEntity={type:string;layer:string;pairs:Pair[]}
const MAX_FILE_CHARS=4_000_000
const MAX_ENTITIES=8000
const round=(v:number,d=4)=>Number(v.toFixed(d))
const norm=(s:string)=>s.trim().toUpperCase().replace(/[\s_-]+/g,'')
const layerHas=(layer:string,keys:string[])=>{const n=norm(layer);return keys.some(k=>n.includes(norm(k)))}
const scaleForInsunits=(u:number)=>u===1?0.0254:u===2?0.3048:u===4?0.001:u===5?0.01:u===6?1:u===7?1000:1
function pairsFrom(text:string):Pair[]{
  const lines=text.replace(/\r/g,'').split('\n')
  const out:Pair[]=[]
  for(let i=0;i+1<lines.length;i+=2){const code=Number(lines[i].trim());if(Number.isFinite(code))out.push({code,value:lines[i+1].trim()})}
  return out
}
function readInsunits(pairs:Pair[]){
  for(let i=0;i<pairs.length-1;i++)if(pairs[i].code===9&&pairs[i].value==='$INSUNITS'){const next=pairs.slice(i+1,i+8).find(p=>p.code===70);if(next){const n=Number(next.value);if(Number.isFinite(n))return n}}
  return 6
}
function entitiesFrom(pairs:Pair[]):RawEntity[]{
  const out:RawEntity[]=[];let inEntities=false;let current:RawEntity|null=null
  for(let i=0;i<pairs.length;i++){
    const p=pairs[i]
    if(p.code===0&&p.value==='SECTION'&&pairs[i+1]?.code===2&&pairs[i+1]?.value==='ENTITIES'){inEntities=true;i++;continue}
    if(inEntities&&p.code===0&&p.value==='ENDSEC'){if(current)out.push(current);break}
    if(!inEntities)continue
    if(p.code===0){if(current)out.push(current);if(out.length>=MAX_ENTITIES)break;current={type:p.value,layer:'0',pairs:[]};continue}
    if(current){current.pairs.push(p);if(p.code===8)current.layer=p.value}
  }
  if(current&&out.length<MAX_ENTITIES)out.push(current)
  return out
}
const num=(pairs:Pair[],code:number,from=0)=>{for(let i=from;i<pairs.length;i++)if(pairs[i].code===code){const n=Number(pairs[i].value);return Number.isFinite(n)?{value:n,index:i}:null}return null}
function polygonArea(points:ArchPoint[]){let a=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];a+=p.x_m*q.y_m-q.x_m*p.y_m}return Math.abs(a)/2}
function classifyPolygon(layer:string,area:number):ArchPolygon['kind']{
  if(layerHas(layer,['COLUMN','COL','ستون']))return 'column'
  if(layerHas(layer,['RAMP','رمپ']))return 'ramp'
  if(layerHas(layer,['ROOM','SPACE','UNIT','اتاق','فضا','واحد']))return 'room'
  if(layerHas(layer,['BOUND','SITE','FLOOR','OUTLINE','حد','پلان']))return 'boundary'
  if(area>4&&area<5000)return 'room'
  return 'unknown'
}
function isWallLayer(layer:string){return layerHas(layer,['WALL','A-WALL','ARCHWALL','دیوار'])}
function translatePoint(p:ArchPoint,dx:number,dy:number):ArchPoint{return{x_m:round(p.x_m-dx),y_m:round(p.y_m-dy)}}
export function parseArchitectureDxf(text:string,sourceName='architecture.dxf'):ArchitectureModel{
  if(text.length>MAX_FILE_CHARS)throw new Error('فایل DXF برای پردازش مرورگر بزرگ است؛ فایل را Purge/Simplify کنید یا پلان همان طبقه را جداگانه خروجی بگیرید.')
  if(!/SECTION[\s\S]*ENTITIES/i.test(text))throw new Error('ساختار DXF معتبر یا بخش ENTITIES پیدا نشد.')
  const pairs=pairsFrom(text),insunits=readInsunits(pairs),scale=scaleForInsunits(insunits),entities=entitiesFrom(pairs)
  const walls:ArchSegment[]=[],polys:ArchPolygon[]=[];const all:ArchPoint[]=[];let id=0
  for(const e of entities){
    if(e.type==='LINE'){
      const x1=num(e.pairs,10),y1=num(e.pairs,20),x2=num(e.pairs,11),y2=num(e.pairs,21);if(!x1||!y1||!x2||!y2)continue
      const a={x_m:x1.value*scale,y_m:y1.value*scale},b={x_m:x2.value*scale,y_m:y2.value*scale};all.push(a,b)
      walls.push({id:`L${++id}`,layer:e.layer,kind:isWallLayer(e.layer)?'wall':'line',a,b})
    }else if(e.type==='LWPOLYLINE'){
      const points:ArchPoint[]=[]
      for(let i=0;i<e.pairs.length;i++)if(e.pairs[i].code===10){const x=Number(e.pairs[i].value);const yPair=e.pairs.slice(i+1).find(p=>p.code===20||p.code===10);if(yPair?.code===20){const y=Number(yPair.value);if(Number.isFinite(x)&&Number.isFinite(y))points.push({x_m:x*scale,y_m:y*scale})}}
      if(points.length<2)continue;all.push(...points)
      const flags=Number(e.pairs.find(p=>p.code===70)?.value||0),closed=(flags&1)===1
      if(closed&&points.length>=3){const area=polygonArea(points);polys.push({id:`P${++id}`,layer:e.layer,kind:classifyPolygon(e.layer,area),points,area_m2:round(area)})}
      else for(let i=1;i<points.length;i++)walls.push({id:`S${++id}`,layer:e.layer,kind:isWallLayer(e.layer)?'wall':'line',a:points[i-1],b:points[i]})
    }
  }
  if(!all.length)throw new Error('در DXF هیچ LINE/LWPOLYLINE قابل استفاده پیدا نشد.')
  const minX=Math.min(...all.map(p=>p.x_m)),minY=Math.min(...all.map(p=>p.y_m)),maxX=Math.max(...all.map(p=>p.x_m)),maxY=Math.max(...all.map(p=>p.y_m))
  const shift=(p:ArchPoint)=>translatePoint(p,minX,minY)
  const sw=walls.map(w=>({...w,a:shift(w.a),b:shift(w.b)}))
  const sp=polys.map(p=>({...p,points:p.points.map(shift)}))
  const warnings:string[]=[]
  if(insunits===0)warnings.push('DXF واحد ترسیمی مشخص نکرده است؛ متر فرض شد. مقیاس را با یک بعد معلوم کنترل کنید.')
  if(entities.length>=MAX_ENTITIES)warnings.push(`فقط ${MAX_ENTITIES} Entity اول پردازش شد؛ فایل را ساده‌سازی کنید.`)
  if(!sw.some(w=>w.kind==='wall'))warnings.push('Layer دیوار به‌صورت صریح تشخیص داده نشد؛ LINEها برای نمایش وارد شده‌اند ولی به‌عنوان مانع قطعی استفاده نمی‌شوند.')
  return {version:'rabin-arch-1.0',source_name:sourceName,source_format:'dxf',imported_at:new Date().toISOString(),insunits,unit_scale_to_m:scale,bounds:{min_x_m:0,min_y_m:0,max_x_m:round(maxX-minX),max_y_m:round(maxY-minY),width_m:round(maxX-minX),length_m:round(maxY-minY)},walls:sw,rooms:sp.filter(p=>p.kind==='room'),columns:sp.filter(p=>p.kind==='column'),ramps:sp.filter(p=>p.kind==='ramp'),boundaries:sp.filter(p=>p.kind==='boundary'),unknown_polygons:sp.filter(p=>p.kind==='unknown'),warnings}
}
export function architectureSummary(m:ArchitectureModel){return {source:m.source_name,width_m:m.bounds.width_m,length_m:m.bounds.length_m,walls:m.walls.filter(w=>w.kind==='wall').length,rooms:m.rooms.length,columns:m.columns.length,ramps:m.ramps.length,boundaries:m.boundaries.length,warnings:m.warnings}}
export function pointInPolygon(p:ArchPoint,poly:ArchPoint[]){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];const hit=((a.y_m>p.y_m)!==(b.y_m>p.y_m))&&(p.x_m<(b.x_m-a.x_m)*(p.y_m-a.y_m)/(b.y_m-a.y_m||1e-9)+a.x_m);if(hit)inside=!inside}return inside}
export function distancePointToSegment(p:ArchPoint,a:ArchPoint,b:ArchPoint){const dx=b.x_m-a.x_m,dy=b.y_m-a.y_m;const l2=dx*dx+dy*dy;if(!l2)return Math.hypot(p.x_m-a.x_m,p.y_m-a.y_m);const t=Math.max(0,Math.min(1,((p.x_m-a.x_m)*dx+(p.y_m-a.y_m)*dy)/l2));return Math.hypot(p.x_m-(a.x_m+t*dx),p.y_m-(a.y_m+t*dy))}
export function pointBlocked(m:ArchitectureModel|undefined,p:ArchPoint,clearance=.12){if(!m)return false;if(m.columns.some(x=>pointInPolygon(p,x.points))||m.ramps.some(x=>pointInPolygon(p,x.points)))return true;return m.walls.some(w=>w.kind==='wall'&&distancePointToSegment(p,w.a,w.b)<clearance)}
function orient(a:ArchPoint,b:ArchPoint,c:ArchPoint){return (b.x_m-a.x_m)*(c.y_m-a.y_m)-(b.y_m-a.y_m)*(c.x_m-a.x_m)}
export function segmentsIntersect(a:ArchPoint,b:ArchPoint,c:ArchPoint,d:ArchPoint){const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);return o1*o2<0&&o3*o4<0}
export function segmentBlocked(m:ArchitectureModel|undefined,a:ArchPoint,b:ArchPoint){if(!m)return false;if(m.walls.some(w=>w.kind==='wall'&&segmentsIntersect(a,b,w.a,w.b)))return true;return [...m.columns,...m.ramps].some(poly=>pointInPolygon(a,poly.points)||pointInPolygon(b,poly.points)||poly.points.some((p,i)=>segmentsIntersect(a,b,p,poly.points[(i+1)%poly.points.length])))}