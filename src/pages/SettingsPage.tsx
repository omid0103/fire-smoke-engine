import { FormEvent, useEffect, useState } from 'react'
import { Ban, Copy, Database, Link2, Plus, RefreshCw, Server, Settings2, ShieldCheck, UserCircle } from 'lucide-react'
import { supabase, SUPABASE_URL } from '../lib/supabase'

type DemoLink={id:string;client_name:string;expires_at:string;max_redemptions:number;redemption_count:number;max_projects:number;max_runs:number;revoked_at:string|null;created_at:string}

export default function SettingsPage(){
 const [email,setEmail]=useState(''),[members,setMembers]=useState<any[]>([])
 const [demoLinks,setDemoLinks]=useState<DemoLink[]>([]),[demoAdmin,setDemoAdmin]=useState<boolean|null>(null)
 const [clientName,setClientName]=useState(''),[validHours,setValidHours]=useState(48),[maxRedemptions,setMaxRedemptions]=useState(3),[maxProjects,setMaxProjects]=useState(10),[maxRuns,setMaxRuns]=useState(60)
 const [demoBusy,setDemoBusy]=useState(false),[demoMessage,setDemoMessage]=useState(''),[generatedUrl,setGeneratedUrl]=useState('')

 async function demoApi(action:string,payload:Record<string,unknown>={}){
  const {data,error}=await supabase.functions.invoke('demo-access',{body:{action,...payload}})
  if(error)throw error;if(!data?.ok)throw new Error(data?.error||'خطای مدیریت دمو');return data
 }
 async function loadDemo(){try{const d=await demoApi('list');setDemoLinks(d.links||[]);setDemoAdmin(true)}catch{setDemoAdmin(false)}}
 useEffect(()=>{supabase.auth.getUser().then(({data})=>setEmail(data.user?.email||''));supabase.from('organization_members').select('role,user_id,created_at').then(({data})=>setMembers(data||[]));loadDemo()},[])
 async function createDemo(e:FormEvent){e.preventDefault();setDemoBusy(true);setDemoMessage('');setGeneratedUrl('');try{const d=await demoApi('create',{client_name:clientName,valid_hours:validHours,max_redemptions:maxRedemptions,max_projects:maxProjects,max_runs:maxRuns});setGeneratedUrl(d.link.url);setDemoMessage('لینک اختصاصی ساخته شد. لینک کامل فقط همین بار نمایش داده می‌شود؛ آن را برای مشتری ارسال کنید.');setClientName('');await loadDemo()}catch(e){setDemoMessage(e instanceof Error?e.message:'ساخت لینک انجام نشد.')}finally{setDemoBusy(false)}}
 async function revoke(id:string){if(!confirm('این لینک دمو لغو شود؟ نشست‌های دمو پس از انقضای دسترسی سروری دیگر قابل استفاده نخواهند بود.'))return;setDemoBusy(true);try{await demoApi('revoke',{id});await loadDemo()}catch(e){setDemoMessage(e instanceof Error?e.message:'لغو لینک انجام نشد.')}finally{setDemoBusy(false)}}
 async function copyUrl(){if(generatedUrl){await navigator.clipboard.writeText(generatedUrl);setDemoMessage('لینک در کلیپ‌بورد کپی شد.')}}

 return <div className="page-stack"><div className="page-title-row"><div><span className="eyebrow">SYSTEM CONFIGURATION</span><h1>تنظیمات سامانه</h1><p>تنظیمات هویت، زیرساخت، مسیر اتصال به ERP و دسترسی دمو مشتریان.</p></div></div>
 <div className="settings-grid"><section className="settings-card"><div className="settings-card__icon"><UserCircle/></div><div><span className="eyebrow">ACCOUNT</span><h3>حساب کاربری</h3><p dir="ltr">{email}</p></div></section><section className="settings-card"><div className="settings-card__icon"><Database/></div><div><span className="eyebrow">DATABASE</span><h3>Supabase</h3><p dir="ltr">{SUPABASE_URL.replace('https://','')}</p><span className="settings-ok"><ShieldCheck/> RLS Enabled</span></div></section><section className="settings-card"><div className="settings-card__icon"><Server/></div><div><span className="eyebrow">CALC ENGINE</span><h3>Edge Function</h3><p>calculate / v0.5.1</p><span className="settings-ok"><ShieldCheck/> JWT Required</span></div></section><section className="settings-card"><div className="settings-card__icon"><Link2/></div><div><span className="eyebrow">ERP INTEGRATION</span><h3>رابین ERP</h3><p dir="ltr">https://erp.rabinazar.ir</p><span className="settings-warn">API contract pending</span></div></section></div>

 {demoAdmin&&<section className="panel demo-manager"><div className="panel-head"><div><span className="eyebrow">CUSTOMER DEMO ACCESS</span><h2>لینک دمو اختصاصی مشتری</h2><p>دموی واقعی در Tenant مستقل با انقضای سروری؛ Billing و تنظیمات حساس در دسترس مشتری نیست.</p></div><button className="icon-button" onClick={loadDemo} disabled={demoBusy} title="بازخوانی"><RefreshCw size={18}/></button></div>
  <form className="demo-manager-form" onSubmit={createDemo}>
   <label><span>نام مشتری / شرکت</span><input value={clientName} onChange={e=>setClientName(e.target.value)} required maxLength={120} placeholder="مثلاً شرکت نمونه"/></label>
   <label><span>اعتبار لینک</span><div><input type="number" min={1} max={168} value={validHours} onChange={e=>setValidHours(Number(e.target.value))}/><em>ساعت</em></div></label>
   <label><span>حداکثر ورود</span><input type="number" min={1} max={20} value={maxRedemptions} onChange={e=>setMaxRedemptions(Number(e.target.value))}/></label>
   <label><span>سقف پروژه</span><input type="number" min={1} max={50} value={maxProjects} onChange={e=>setMaxProjects(Number(e.target.value))}/></label>
   <label><span>سقف محاسبات ذخیره‌شده</span><input type="number" min={1} max={500} value={maxRuns} onChange={e=>setMaxRuns(Number(e.target.value))}/></label>
   <button className="primary-button" disabled={demoBusy}>{demoBusy?'در حال ساخت…':<><Plus size={17}/>ساخت لینک اختصاصی</>}</button>
  </form>
  {demoMessage&&<div className="login-message">{demoMessage}</div>}
  {generatedUrl&&<div className="demo-generated-link"><code dir="ltr">{generatedUrl}</code><button className="secondary-button" onClick={copyUrl}><Copy size={16}/>کپی لینک</button></div>}
  <div className="demo-link-list">{demoLinks.map(x=>{const active=!x.revoked_at&&new Date(x.expires_at).getTime()>Date.now();return <div key={x.id} className={!active?'expired':''}><div><strong>{x.client_name}</strong><span>اعتبار تا {new Date(x.expires_at).toLocaleString('fa-IR')}</span></div><div><span>{x.redemption_count}/{x.max_redemptions} ورود</span><span>{x.max_projects} پروژه</span><span>{x.max_runs} Run</span></div><div><b>{x.revoked_at?'لغوشده':active?'فعال':'منقضی'}</b>{active&&<button className="icon-button danger" onClick={()=>revoke(x.id)} title="لغو"><Ban size={17}/></button>}</div></div>})}{demoLinks.length===0&&<div className="empty-inline">هنوز لینک دمو اختصاصی ساخته نشده است.</div>}</div>
 </section>}

 <section className="panel"><div className="panel-head"><div><span className="eyebrow">ACCESS CONTROL</span><h2>اعضای سازمان</h2></div><Settings2/></div><div className="member-list">{members.map((m,i)=><div key={i}><code>{m.user_id.slice(0,8)}…</code><strong>{m.role}</strong><span>{new Date(m.created_at).toLocaleDateString('fa-IR')}</span></div>)}{members.length===0&&<div className="empty-inline">عضوی ثبت نشده است؛ مالک اولیه را از داشبورد فعال کنید.</div>}</div></section>
 </div>
}
