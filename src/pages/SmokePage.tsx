import NetworkCalculator from '../components/NetworkCalculator'
import SmokeAdvanced from '../components/SmokeAdvanced'
import { FormEvent, useEffect, useState } from 'react'
import { AirVent, Layers3, Plus, Ruler, Trash2, Wind } from 'lucide-react'
import Field from '../components/Field'
import ResultPanel from '../components/ResultPanel'
import { calculate } from '../lib/api'
import { supabase } from '../lib/supabase'
import { smokeDefaultsFromProject } from '../lib/projectDesign'
import type { CalculationResponse, Project } from '../types'

type Zone={name:string,area:string,height:string,normal:string,fire:string}
const z0=():Zone=>({name:'زون ۱',area:'600',height:'2.8',normal:'6',fire:'10'})
export default function SmokePage(){
 const [mode,setMode]=useState<'zones'|'duct'>('zones'),[zones,setZones]=useState<Zone[]>([z0()]),[makeup,setMakeup]=useState('60'),[shaftV,setShaftV]=useState('10'),[damperV,setDamperV]=useState('10'),[result,setResult]=useState<CalculationResponse|null>(null),[busy,setBusy]=useState(false),[projects,setProjects]=useState<Project[]>([]),[projectId,setProjectId]=useState('')
 const [scenario,setScenario]=useState('single_zone')
 const [duct,setDuct]=useState({flow:'12000',width:'1000',height:'500'})
 useEffect(()=>{supabase.from('engineering_projects').select('*').order('updated_at',{ascending:false}).then(({data})=>data&&setProjects(data as Project[]))},[])
 useEffect(()=>{setResult(null)},[scenario,mode,zones,makeup,shaftV,damperV,duct,projectId])
 const project=projects.find(p=>p.id===projectId)||null
 useEffect(()=>{
   if(!project){setZones([z0()]);setMakeup('60');setShaftV('10');setDamperV('10');setScenario('single_zone');setDuct({flow:'12000',width:'1000',height:'500'});return}
   const d=smokeDefaultsFromProject(project)
   setZones(d.zones.length?d.zones:[z0()])
   setMakeup(d.makeup??'60')
   setShaftV(d.shaftV??'10')
   setDamperV(d.damperV??'10')
   setScenario(d.scenario??'single_zone')
   setDuct({flow:d.duct.flow??'12000',width:d.duct.width??'1000',height:d.duct.height??'500'})
 },[projectId,projects])
 function update(i:number,k:keyof Zone,v:string){setZones(zones.map((z,idx)=>idx===i?{...z,[k]:v}:z))}
 async function run(e:FormEvent){e.preventDefault();setBusy(true);setResult(null);try{if(mode==='zones'){setResult(await calculate('parking_smoke_group',{fire_scenario:scenario,zones:zones.map(z=>({area_m2:+z.area,height_m:+z.height,normal_ach:+z.normal,fire_ach:+z.fire})),makeup_percent:+makeup,shaft_velocity_mps:+shaftV,damper_velocity_mps:+damperV},project))}else setResult(await calculate('duct_velocity',{flow_cfm:+duct.flow,width_mm:+duct.width,height_mm:+duct.height},project))}catch(e){alert(e instanceof Error?e.message:'خطا در محاسبه')}finally{setBusy(false)}}
 return <div className="page-stack"><section className="module-hero smoke"><div><span className="eyebrow">SMOKE CONTROL / AIRFLOW</span><h1>کنترل دود و تهویه حریق</h1><p>محاسبات زون پارکینگ، هوای جبرانی، ظرفیت فن، شفت و کنترل سرعت کانال با منطق قابل ردیابی.</p></div><div className="module-hero__symbol"><Wind/><AirVent/></div></section>
 <div className="project-context"><span>پروژه فعال:</span><select disabled={busy} value={projectId} onChange={e=>setProjectId(e.target.value)}><option value="">بدون پروژه / ورود دستی</option>{projects.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></div>
 {project&&<div className="calc-banner info">مساحت و ارتفاع زون‌ها، ACH، هوای جبرانی، حدود سرعت شفت/دمپر و ابعاد کانال از پرونده پروژه بارگذاری شده‌اند. سناریوی حریق و مقادیر طراحی را با ضوابط محلی و استاندارد مبنای پروژه کنترل کنید.</div>}
 <div className="calculator-layout"><section className="calc-card"><div className="segmented-tabs"><button disabled={busy} type="button" className={mode==='zones'?'active':''} onClick={()=>{setMode('zones');setResult(null)}}><Layers3 size={17}/> پارکینگ / زون‌ها</button><button disabled={busy} type="button" className={mode==='duct'?'active':''} onClick={()=>{setMode('duct');setResult(null)}}><Ruler size={17}/> سرعت کانال</button></div><form className="calc-form" onSubmit={run}><fieldset disabled={busy}>
 {mode==='zones'&&<><label className="plain-field"><span>سناریوی طراحی حریق</span><select value={scenario} onChange={e=>setScenario(e.target.value)}><option value="single_zone">یک زون حریق با جداسازی سایر زون‌ها</option><option value="all_zones">تخلیه هم‌زمان تمام زون‌ها</option><option value="engineered">سناریوی مهندسی خاص</option></select></label><div className="calc-banner info">دبی و سناریوی کنترل دود باید بر اساس هندسه، کاربری، زون‌بندی و مبنای طراحی ثبت‌شده پروژه تعیین و توسط طراح/AHJ کنترل شود.</div><div className="zone-stack">{zones.map((z,i)=><div className="zone-card" key={i}><div className="zone-card__head"><strong>{z.name}</strong>{zones.length>1&&<button type="button" className="icon-button danger" onClick={()=>setZones(zones.filter((_,j)=>j!==i))}><Trash2 size={16}/></button>}</div><div className="form-grid two"><Field label="Area" unit="m²" value={z.area} onChange={v=>update(i,'area',v)}/><Field label="Clear Height" unit="m" value={z.height} onChange={v=>update(i,'height',v)}/><Field label="Normal ACH" unit="1/h" value={z.normal} onChange={v=>update(i,'normal',v)}/><Field label="Fire ACH" unit="1/h" value={z.fire} onChange={v=>update(i,'fire',v)}/></div></div>)}</div><button type="button" className="secondary-button add-zone" onClick={()=>setZones([...zones,{...z0(),name:`زون ${zones.length+1}`}])}><Plus size={17}/> افزودن زون</button><div className="form-grid three shared-inputs"><Field label="Make-up Air" unit="%" value={makeup} onChange={setMakeup}/><Field label="Shaft Velocity" unit="m/s" value={shaftV} onChange={setShaftV}/><Field label="Damper Velocity" unit="m/s" value={damperV} onChange={setDamperV}/></div></>}
 {mode==='duct'&&<div className="form-grid two"><Field label="Airflow" unit="CFM" value={duct.flow} onChange={v=>setDuct({...duct,flow:v})}/><Field label="Duct Width" unit="mm" value={duct.width} onChange={v=>setDuct({...duct,width:v})}/><Field label="Duct Height" unit="mm" value={duct.height} onChange={v=>setDuct({...duct,height:v})}/></div>}
 <button className="primary-button calc-submit" disabled={busy}>{busy?'در حال محاسبه…':'اجرای محاسبه کنترل دود'}</button></fieldset></form></section><ResultPanel data={result}/></div>
 <SmokeAdvanced project={project}/>
 <NetworkCalculator key={projectId} air project={project}/>
 </div>
}
