import { network } from "./network.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Json = Record<string, unknown>;
const CFM_PER_M3H = 0.588577779;
const M3S_PER_CFM = 1 / 2118.880003;
const G = 9.80665;

function r(v:number,d=3){const p=10**d;return Math.round((v+Number.EPSILON)*p)/p}
function num(v:unknown,name:string,def?:number){if(v===null||v===undefined){if(def===undefined)throw new Error(`ورودی الزامی: ${name}`);v=def;}if(typeof v!=="number"&&typeof v!=="string"||typeof v==="string"&&!v.trim())throw new Error(`ورودی عددی نامعتبر: ${name}`);const x=Number(v);if(!Number.isFinite(x))throw new Error(`Invalid numeric input: ${name}`);return x}
function nonneg(v:unknown,name:string,def?:number){const x=num(v,name,def);if(x<0)throw new Error(`${name} must be >= 0`);return x}
function bounded(v:unknown,name:string,lo:number,hi:number,def?:number){const x=num(v,name,def);if(x<lo||x>hi)throw new Error(`${name}: ${lo} تا ${hi}`);return x}
function pos(v:unknown,name:string,def?:number){const x=num(v,name,def);if(x<=0)throw new Error(`${name} must be > 0`);return x}
async function digest(x:unknown){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(x)));return [...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,"0")).join("")}

function parkingOne(input:Json){
 const area=pos(input.area_m2,"area_m2"), h=pos(input.height_m,"height_m");
 const normal=pos(input.normal_ach,"normal_ach",6), fire=pos(input.fire_ach,"fire_ach",10), makeup=bounded(input.makeup_percent,"makeup_percent",0,100,60);
 const vshaft=pos(input.shaft_velocity_mps,"shaft_velocity_mps",10), vdamper=pos(input.damper_velocity_mps,"damper_velocity_mps",10), step=pos(input.round_to_cfm,"round_to_cfm",500);
 const volume=area*h, qn=Math.ceil(volume*normal*CFM_PER_M3H/step)*step, qf=Math.ceil(volume*fire*CFM_PER_M3H/step)*step;
 const design=Math.max(qn,qf), supply=design*makeup/100, ex=design*M3S_PER_CFM, su=supply*M3S_PER_CFM;
 const warnings:string[]=[];
 if(makeup<50||makeup>70)warnings.push("نسبت هوای جبرانی خارج از بازه ۵۰ تا ۷۰ درصد مرجع پروژه است؛ مبنای استاندارد/AHJ کنترل شود.");
 if(vshaft>12)warnings.push("سرعت شفت تخلیه از ۱۲ m/s بیشتر است؛ با مرجع پروژه و محدودیت نویز/افت فشار بازبینی شود.");
 if(area>2000)warnings.push("مساحت پارکینگ از ۲۰۰۰ m² بیشتر است؛ بررسی زون‌بندی دود الزامی است.");
 if(area>3000)warnings.push("مساحت زون از ۳۰۰۰ m² بیشتر است؛ این زون باید بازطراحی/تقسیم شود.");
 return {status:warnings.length?"warning":"calculated",inputs:{area_m2:area,height_m:h,normal_ach:normal,fire_ach:fire,makeup_percent:makeup,shaft_velocity_mps:vshaft,damper_velocity_mps:vdamper},results:{volume_m3:r(volume,2),normal_exhaust_cfm:r(qn,0),fire_exhaust_cfm:r(qf,0),design_exhaust_cfm:r(design,0),makeup_air_cfm:r(supply,0),exhaust_shaft_area_m2:r(ex/vshaft,4),makeup_shaft_area_m2:r(su/vshaft,4),exhaust_damper_area_m2:r(ex/vdamper,4),two_fan_50pct_each_cfm:r(design/2,0)},warnings,trace:["V = A × H","Q_normal = V × ACH_normal × 0.588577779 → round up","Q_fire = V × ACH_fire × 0.588577779 → round up","Q_design = max(Q_normal,Q_fire)","Q_makeup = Q_design × makeup%","A = Q(m³/s) / velocity"],source_profile:"USR-PARKING-SMOKE / uploaded project reference; governing edition/AHJ must be verified before approval."}
}

function parkingGroup(input:Json){
 const zones=Array.isArray(input.zones)?input.zones as Json[]:[];
 if(zones.length>200)throw new Error("حداکثر ۲۰۰ زون");
 if(!zones.length) throw new Error("zones is required");
 const makeup=bounded(input.makeup_percent,"makeup_percent",0,100,60), vshaft=pos(input.shaft_velocity_mps,"shaft_velocity_mps",10);
 const computed=zones.map((z,i)=>({zone_index:i+1,...parkingOne({...z,makeup_percent:makeup,shaft_velocity_mps:vshaft,damper_velocity_mps:input.damper_velocity_mps})}));
 const sumNormal=computed.reduce((s:any,z:any)=>s+z.results.normal_exhaust_cfm,0);
 const maxFire=Math.max(...computed.map((z:any)=>z.results.fire_exhaust_cfm));
 const scenario=String(input.fire_scenario??"single_zone");if(!["single_zone","all_zones"].includes(scenario))throw new Error("سناریوی حریق نامعتبر");
 const fireDemand=scenario==="all_zones"?computed.reduce((s,z)=>s+z.results.fire_exhaust_cfm,0):maxFire;
 const design=Math.max(sumNormal,fireDemand), supply=design*makeup/100;
 const warnings=[...new Set(computed.flatMap((z:any)=>z.warnings)),scenario==="single_zone"?"سناریوی یک زون فقط با جداسازی و کنترل دمپر سایر زون‌ها معتبر است.":"سناریوی تخلیه هم‌زمان تمام زون‌ها انتخاب شده است."];
 return {status:warnings.length?"warning":"calculated",results:{zone_count:computed.length,fire_scenario:scenario,design_fire_exhaust_cfm:r(fireDemand,0),makeup_shaft_area_m2:r(supply*M3S_PER_CFM/vshaft,4),sum_normal_exhaust_cfm:r(sumNormal,0),max_single_zone_fire_cfm:r(maxFire,0),design_exhaust_cfm:r(design,0),makeup_air_cfm:r(supply,0),exhaust_shaft_area_m2:r(design*M3S_PER_CFM/vshaft,4),two_fan_50pct_each_cfm:r(design/2,0)},zones:computed,warnings,trace:["For grouped zones: Q_design = max(ΣQ_normal, Q_fire_selected_scenario)","Q_makeup = Q_design × makeup%","A_shaft = Q_design(m³/s)/velocity"],source_profile:"Logic reproduced from uploaded parking workbook/reference for regression; final zoning arrangement remains AHJ-dependent."}
}

function hazen(input:Json){
 const ql=pos(input.flow_lpm,"flow_lpm"),L=pos(input.length_m,"length_m"),dmm=pos(input.diameter_mm,"diameter_mm"),C=pos(input.c_factor,"c_factor");
 const q=ql/60000,d=dmm/1000,hf=10.67*L*(q**1.852)/((C**1.852)*(d**4.87));
 return {status:"calculated",results:{friction_head_m:r(hf,4),pressure_loss_kpa:r(hf*9.80665,3)},warnings:[],trace:["h_f = 10.67 L Q^1.852 / (C^1.852 d^4.87)"],source_profile:"General Hazen-Williams relation. C-factor and applicability must follow the project standard."}
}

function pump(input:Json){
 const ql=pos(input.flow_lpm,"flow_lpm"),elev=num(input.elevation_m,"elevation_m",0),res=nonneg(input.residual_pressure_bar,"residual_pressure_bar",0),fr=nonneg(input.friction_head_m,"friction_head_m",0),sf=nonneg(input.safety_percent,"safety_percent",0),eta=bounded(input.efficiency_percent,"efficiency_percent",0.01,100,70);
 const base=elev+res*10.19716213+fr,head=base*(1+sf/100),q=ql/60000,ph=1000*G*q*head/1000,ps=ph/(eta/100);
 if(head<=0)throw new Error("هد طراحی باید مثبت باشد");
 return {status:"warning",results:{base_head_m:r(base,3),design_head_m:r(head,3),hydraulic_power_kw:r(ph,3),estimated_shaft_power_kw:r(ps,3)},warnings:["انتخاب نهایی پمپ باید با منحنی واقعی/تأییدشده، نقاط churn/rated/150%، NPSH، درایور و ویرایش استاندارد/AHJ کنترل شود."],trace:["H_base = H_elevation + H_residual + H_friction","H_design = H_base × (1+safety%)","P_hyd = ρgQH","P_shaft = P_hyd/η"],source_profile:"USR-PUMP-XLS regression + general fluid mechanics; NFPA/AHJ criteria are separate validation gates."}
}

function sprinkler(input:Json){
 const density=pos(input.density_lpm_m2,"density_lpm_m2"),Ad=pos(input.design_area_m2,"design_area_m2"),cov=pos(input.coverage_per_sprinkler_m2,"coverage_per_sprinkler_m2"),K=pos(input.k_metric,"k_metric");
 const hose=nonneg(input.hose_allowance_lpm,"hose_allowance_lpm",0),dur=nonneg(input.duration_min,"duration_min",0);
 const explicit=input.active_sprinkler_count==null?null:pos(input.active_sprinkler_count,"active_sprinkler_count");if(explicit!==null&&(!Number.isInteger(explicit)||explicit*cov<Ad))throw new Error("تعداد اسپرینکلر باید صحیح و پوشش مجموع آن حداقل برابر مساحت طراحی باشد");const N=explicit&&explicit>0?Math.ceil(explicit):Math.ceil(Ad/cov),q=density*cov,p=(q/K)**2,qs=q*N,total=qs+hose;
 return {status:"warning",results:{active_sprinklers:N,discharge_per_sprinkler_lpm:r(q,2),minimum_pressure_at_k_bar:r(p,4),sprinkler_flow_lpm:r(qs,1),total_with_hose_lpm:r(total,1),theoretical_storage_m3:r(total*dur/1000,3)},warnings:["این خروجی فقط پیش‌محاسبه است؛ تعداد اسپرینکلر فعال از تقسیم ساده مساحت طراحی بر پوشش نهایی نمی‌شود.","هندسه Remote Area، آرایش branch line، spacing، hose allowance، modifiers و الزامات ویرایش جاری NFPA/AHJ باید در حل شبکه نهایی لحاظ شوند."],trace:["N_est = ceil(A_design/A_coverage) unless layout count provided","q = density × coverage","P = (q/K)^2","Q_total = Σq + hose","V = Q_total × duration"],source_profile:"USR-SPRINKLER-XLS used for regression comparison only; workbook fractional-count behavior is intentionally not copied."}
}

function ductVelocity(input:Json){
 const qcfm=pos(input.flow_cfm,"flow_cfm"),w=pos(input.width_mm,"width_mm")/1000,h=pos(input.height_mm,"height_mm")/1000;
 const area=w*h,v=qcfm*M3S_PER_CFM/area;
 const eqD=2*w*h/(w+h);
 return {status:v>12?"warning":"calculated",results:{area_m2:r(area,4),velocity_mps:r(v,3),hydraulic_diameter_m:r(eqD,4)},warnings:v>12?["سرعت کانال از ۱۲ m/s بیشتر است؛ برای مسیر دود/شفت با معیار پروژه کنترل شود."]:[],trace:["A = width × height","v = Q/A","D_h = 2ab/(a+b)"],source_profile:"Geometry/continuity relation; allowable velocity is project/AHJ dependent."}
}

function battery(input:Json){
 const standbyA=pos(input.standby_current_a,"standby_current_a"),standbyH=pos(input.standby_hours,"standby_hours"),alarmA=pos(input.alarm_current_a,"alarm_current_a"),alarmH=pos(input.alarm_hours,"alarm_hours"),margin=nonneg(input.margin_percent,"margin_percent",25);
 const raw=standbyA*standbyH+alarmA*alarmH,design=raw*(1+margin/100);
 return {status:"warning",results:{raw_capacity_ah:r(raw,2),design_capacity_ah:r(design,2)},warnings:["ساعات standby/alarm، derating، ageing، temperature و ضریب ایمنی باید از استاندارد/سازنده/AHJ پروژه انتخاب شوند؛ نرم‌افزار فقط محاسبه ظرفیت بر اساس ورودی را انجام می‌دهد."],trace:["Ah_raw = I_standby×t_standby + I_alarm×t_alarm","Ah_design = Ah_raw×(1+margin%)"],source_profile:"Generic DC battery sizing arithmetic; criteria values are not hard-coded."}
}

function voltageDrop(input:Json){
 const L=pos(input.one_way_length_m,"one_way_length_m"),I=pos(input.current_a,"current_a"),area=pos(input.cable_area_mm2,"cable_area_mm2"),rho=pos(input.resistivity_ohm_mm2_m,"resistivity_ohm_mm2_m",0.0175),V=pos(input.nominal_voltage_v,"nominal_voltage_v",24);
 const drop=2*L*I*rho/area,pct=drop/V*100;
 return {status:pct>10?"warning":"calculated",results:{voltage_drop_v:r(drop,3),voltage_drop_percent:r(pct,2),end_voltage_v:r(V-drop,3)},warnings:pct>10?["افت ولتاژ از ۱۰٪ بیشتر است؛ حد مجاز واقعی باید از دیتاشیت تجهیز و استاندارد پروژه کنترل شود."]:["حد مجاز نهایی افت ولتاژ باید از دیتاشیت تجهیز و استاندارد پروژه کنترل شود."],trace:["ΔV = 2 L I ρ / A","ΔV% = ΔV/V_nom × 100"],source_profile:"Ohmic voltage-drop relation; acceptance limit is device/standard specific."}
}

function npsha(input:Json){
 const patm=pos(input.atmospheric_pressure_kpa,"atmospheric_pressure_kpa",101.325),pv=pos(input.vapor_pressure_kpa,"vapor_pressure_kpa",2.34),rho=pos(input.density_kg_m3,"density_kg_m3",1000),staticHead=num(input.static_suction_head_m,"static_suction_head_m",0),loss=nonneg(input.suction_loss_m,"suction_loss_m",0);
 const n=(patm-pv)*1000/(rho*G)+staticHead-loss;
 return {status:n>0?"calculated":"warning",results:{npsha_m:r(n,3)},warnings:["NPSHa باید با NPSHr سازنده در دبی طراحی و حاشیه موردنیاز استاندارد/سازنده مقایسه شود."],trace:["NPSHa = (P_atm-P_vap)/(ρg) + H_static - H_loss"],source_profile:"General pump suction energy relation."}
}

function alarmCoverage(input:Json){
 const A=pos(input.floor_area_m2,"floor_area_m2"),t=String(input.detector_type??"smoke"),h=pos(input.ceiling_height_m,"ceiling_height_m",3),guide=t==="heat"?56.3:112;
 if(!["smoke","heat"].includes(t))throw new Error("نوع دتکتور نامعتبر است");
 return {status:"warning",results:{estimated_detectors:Math.ceil(A/guide),legacy_guide_area_per_device_m2:guide,ceiling_height_m:h},warnings:["اعداد پوشش این ماژول فقط از راهنمای آموزشی قدیمی آپلودشده استخراج شده‌اند و معیار طراحی جاری محسوب نمی‌شوند.","جانمایی، فاصله، ارتفاع سقف، موانع و نوع دتکتور فقط پس از اعتبارسنجی BS 5839-1 جاری و الزامات ایران/AHJ نهایی شود."],trace:["N_est = ceil(floor area / legacy guide area)"],source_profile:"Legacy uploaded BS 5839 educational guide; preliminary only."}
}

export const handler=async(req:Request, persist?: (data:any,projectId:string)=>Promise<unknown>)=>{
 const headers={"content-type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
 if(req.method==="OPTIONS") return new Response("ok",{headers});
 try{
  if(req.method!=="POST") return new Response(JSON.stringify({ok:false,error:"POST required"}),{status:405,headers});
  const reader=req.body?.getReader();
  if(!reader)throw new Error("JSON body required");
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();return new Response(JSON.stringify({ok:false,error:"Request exceeds 256 KiB"}),{status:413,headers});}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const body=JSON.parse(new TextDecoder().decode(bytes)) as {module?:string,input?:Json,project_id?:string};
  if(!body||typeof body!=="object"||Array.isArray(body))throw new Error("JSON object required");
  const stack:Array<[unknown,number]>=[[body,0]];
  while(stack.length){const [value,depth]=stack.pop()!;if(depth>16)throw new Error("Input nesting exceeds 16 levels");if(value&&typeof value==="object")for(const child of Object.values(value))stack.push([child,depth+1]);}
   const m=body.module??"", input=body.input??{}; let c:any;
  if(body.project_id!==undefined && (typeof body.project_id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.project_id)))throw new Error("Invalid project ID");
  if(!input||typeof input!=="object"||Array.isArray(input))throw new Error("input must be an object");
  switch(m){
   case "hydraulic_network":c=network(input,false);break;
   case "airflow_network":c=network(input,true);break;
   case "atrium_axisymmetric":c=atrium(input);break;
   case "pressurization_single_zone":c=pressure(input);break;
   case "parking_smoke":c=parkingOne(input);break;
   case "parking_smoke_group":c=parkingGroup(input);break;
   case "hazen_williams":c=hazen(input);break;
   case "fire_pump":c=pump(input);break;
   case "sprinkler_preliminary":c=sprinkler(input);break;
   case "duct_velocity":c=ductVelocity(input);break;
   case "fire_alarm_battery":c=battery(input);break;
   case "voltage_drop":c=voltageDrop(input);break;
   case "npsha":c=npsha(input);break;
   case "fire_alarm_preliminary":c=alarmCoverage(input);break;
   default:throw new Error("Unsupported module");
  }
  assertFinite(c);
  const engine_version="0.5.1",input_hash=await digest({m,input,engine_version});
  const data:any={ok:true,module:m,engine_version,input_hash,calculation:{...c,inputs:input}};
  if(body.project_id){
   try{if(!persist)throw new Error("Persistence unavailable");data.persistence=await persist(data,body.project_id);}
   catch{data.persistence={saved:false,message:"محاسبه انجام شد اما ذخیره نشد؛ دسترسی پروژه و اتصال را بررسی و دوباره تلاش کنید."};}
  }
  return new Response(JSON.stringify(data),{headers});
 }catch(e){return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:400,headers})}
};
// Production entrypoint: server.ts authenticates and checks paid/trial entitlement.

function assertFinite(value:unknown):void {
 if(typeof value==='number'&&!Number.isFinite(value))throw new Error('نتیجه خارج از محدوده محاسبات است');
 if(value&&typeof value==='object')Object.values(value).forEach(assertFinite);
}
function atrium(i:Json){
 const q=pos(i.hrr_kw,'hrr_kw'),fraction=bounded(i.convective_fraction,'convective_fraction',0.01,1),z=pos(i.layer_height_m,'layer_height_m'),t=bounded(i.ambient_c,'ambient_c',-50,80),p=pos(i.pressure_pa,'pressure_pa'),ks=bounded(i.heat_fraction,'heat_fraction',0.01,1);
 const qc=q*fraction,zl=0.166*qc**0.4,m=z>zl?0.071*qc**(1/3)*z**(5/3)+0.0018*qc:0.032*qc**0.6*z,ts=t+ks*qc/m,rho=p/(287*(ts+273.15)),v=m/rho;
 return {status:'warning',results:{convective_hrr_kw:qc,limiting_height_m:zl,mass_flow_kg_s:m,smoke_temperature_c:ts,smoke_density_kg_m3:rho,exhaust_m3_s:v,exhaust_cfm:v/M3S_PER_CFM},warnings:['مدل فقط برای ستون دود متقارن محوری و حالت پایا است؛ بالکن، پنجره، دیوار و رشد زمانی حریق را مدل نمی‌کند.','HRR، تراز لایه، هوای جبرانی و plugholing باید جداگانه کنترل شوند؛ این خروجی تأیید نهایی طراحی نیست.'],trace:['Qc = HRR × convective fraction','zl = 0.166 Qc^0.4','z > zl: m = 0.071 Qc^(1/3) z^(5/3) + 0.0018 Qc','z ≤ zl: m = 0.032 Qc^0.6 z','Ts = To + Ks Qc/m; rho = patm/[287(Ts+273.15)]','V = m/rho'],source_profile:'AtriumCalc-Version1-1.xlsm: Atrium-Fire-SI I15:I20; A-Fire-SI C11:C12. Kelvin offset corrected to 273.15. NISTIR 5516 (historical model, not an adopted code).'}
}
function pressure(i:Json){
 const dp=pos(i.pressure_pa,'pressure_pa'),a=nonneg(i.leakage_area_m2,'leakage_area_m2'),cd=bounded(i.discharge_coefficient,'discharge_coefficient',0.01,1),rho=pos(i.density_kg_m3,'density_kg_m3'),open=nonneg(i.open_door_area_m2,'open_door_area_m2'),velocity=nonneg(i.open_door_velocity_mps,'open_door_velocity_mps'),margin=nonneg(i.margin_percent,'margin_percent'),width=pos(i.door_width_m,'door_width_m'),height=pos(i.door_height_m,'door_height_m'),arm=pos(i.handle_arm_m,'handle_arm_m'),closer=nonneg(i.closer_force_n,'closer_force_n');
 if(arm>width)throw new Error('فاصله دستگیره از لولا نمی‌تواند بیشتر از عرض در باشد');
 const closed=cd*a*Math.sqrt(2*dp/rho),opened=closed+open*velocity,design=Math.max(closed,opened)*(1+margin/100),force=closer+dp*height*width**2/(2*arm);
 return {status:'warning',results:{closed_door_flow_m3_s:closed,open_door_flow_m3_s:opened,design_supply_m3_s:design,design_supply_cfm:design/M3S_PER_CFM,door_opening_force_n:force},warnings:['مدل یک ناحیه با مسیر نشت معادل است؛ اثر باد، دودکشی، توزیع فشار طبقات و شبکه آسانسور در آن حل نمی‌شود.','سطح نشت در حالت باز باید فقط مسیرهای باقی‌مانده را شامل شود. نیرو شامل نیروی آرام‌بند ورودی است؛ حدود پذیرش فشار، سرعت و نیرو تابع ضوابط پروژه است.'],trace:['Qleak = Cd A sqrt(2 ΔP/rho)','Qopen = Qleak + Aopen v','Qdesign = max(Qclosed,Qopen) (1+margin/100)','Fhandle = Fcloser + ΔP H W²/(2 handle arm)'],source_profile:'Continuity/orifice equation and door moment balance; single-zone preliminary model.'}
}
