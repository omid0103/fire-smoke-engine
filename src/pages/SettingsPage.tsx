import { useEffect, useState } from 'react'
import { Database, Link2, Server, Settings2, ShieldCheck, UserCircle } from 'lucide-react'
import { supabase, SUPABASE_URL } from '../lib/supabase'

export default function SettingsPage(){
 const [email,setEmail]=useState(''),[members,setMembers]=useState<any[]>([])
 useEffect(()=>{supabase.auth.getUser().then(({data})=>setEmail(data.user?.email||''));supabase.from('organization_members').select('role,user_id,created_at').then(({data})=>setMembers(data||[]))},[])
 return <div className="page-stack"><div className="page-title-row"><div><span className="eyebrow">SYSTEM CONFIGURATION</span><h1>تنظیمات سامانه</h1><p>تنظیمات هویت، زیرساخت و مسیر اتصال به ERP.</p></div></div>
 <div className="settings-grid"><section className="settings-card"><div className="settings-card__icon"><UserCircle/></div><div><span className="eyebrow">ACCOUNT</span><h3>حساب کاربری</h3><p dir="ltr">{email}</p></div></section><section className="settings-card"><div className="settings-card__icon"><Database/></div><div><span className="eyebrow">DATABASE</span><h3>Supabase</h3><p dir="ltr">{SUPABASE_URL.replace('https://','')}</p><span className="settings-ok"><ShieldCheck/> RLS Enabled</span></div></section><section className="settings-card"><div className="settings-card__icon"><Server/></div><div><span className="eyebrow">CALC ENGINE</span><h3>Edge Function</h3><p>calculate / v0.3.0</p><span className="settings-ok"><ShieldCheck/> JWT Required</span></div></section><section className="settings-card"><div className="settings-card__icon"><Link2/></div><div><span className="eyebrow">ERP INTEGRATION</span><h3>رابین ERP</h3><p dir="ltr">https://erp.rabinazar.ir</p><span className="settings-warn">API contract pending</span></div></section></div>
 <section className="panel"><div className="panel-head"><div><span className="eyebrow">ACCESS CONTROL</span><h2>اعضای سازمان</h2></div><Settings2/></div><div className="member-list">{members.map((m,i)=><div key={i}><code>{m.user_id.slice(0,8)}…</code><strong>{m.role}</strong><span>{new Date(m.created_at).toLocaleDateString('fa-IR')}</span></div>)}{members.length===0&&<div className="empty-inline">عضوی ثبت نشده است؛ مالک اولیه را از داشبورد فعال کنید.</div>}</div></section>
 </div>
}
