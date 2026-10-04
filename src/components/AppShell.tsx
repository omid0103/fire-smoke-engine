import { NavLink, Outlet } from 'react-router-dom'
import { Activity, Bell, BookOpenCheck, Building2, Calculator, Flame, Gauge, Layers3, LogOut, Menu, PanelLeftClose, Settings, ShieldCheck, Wind } from 'lucide-react'
import { useEffect, useState } from 'react'
import EngineeringLogo from './EngineeringLogo'
import { supabase } from '../lib/supabase'

const nav = [
  ['/', 'داشبورد', Activity],
  ['/projects', 'پروژه‌ها', Building2],
  ['/auto-design', 'طراحی خودکار', Layers3],
  ['/suppression', 'اطفاء و هیدرولیک', Flame],
  ['/smoke', 'کنترل دود', Wind],
  ['/alarm', 'اعلام حریق', Bell],
  ['/standards', 'استانداردها و قواعد', BookOpenCheck],
  ['/reports', 'گزارش‌ها', Calculator],
  ['/subscription', 'اشتراک و تمدید', ShieldCheck],
  ['/settings', 'تنظیمات', Settings],
] as const

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [demo,setDemo]=useState<{client?:string;expires?:string}|null>(null)
  useEffect(()=>{supabase.auth.getUser().then(({data})=>{const m=data.user?.app_metadata;if(m?.demo===true)setDemo({client:String(m.demo_client||'مشتری'),expires:String(m.demo_expires_at||'')})})},[])
  const visibleNav=demo?nav.filter(([to])=>to!=='/subscription'&&to!=='/settings'):nav
  async function logout(){sessionStorage.removeItem('rabin_demo_context');await supabase.auth.signOut()}
  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
        <div className="sidebar__top">
          <EngineeringLogo compact={collapsed}/>
          <button className="icon-button collapse-btn" onClick={() => setCollapsed(v => !v)} title="جمع کردن منو"><PanelLeftClose size={18}/></button>
        </div>
        <div className="sidebar__system-card">
          <div className="pulse-dot" />
          {!collapsed && <><span>{demo?'CUSTOMER DEMO':'ENGINEERING CORE'}</span><strong>{demo?'TEMPORARY / ACTIVE':'v0.6.0 / AUTO DESIGN'}</strong></>}
        </div>
        <nav className="sidebar__nav">
          {visibleNav.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({isActive}) => isActive ? 'active' : ''} onClick={() => setMobile(false)}>
              <Icon size={19}/><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__bottom">
          <div className="ahj-chip"><ShieldCheck size={17}/>{!collapsed && <span>{demo?'Demo Workspace • Isolated Tenant':'Design Aid • AHJ Review Required'}</span>}</div>
          <button className="sidebar-logout" onClick={logout}><LogOut size={18}/><span>{demo?'خروج از دمو':'خروج'}</span></button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobile(v => !v)}><Menu size={20}/></button>
          <div className="topbar__title">
            <Gauge size={18}/>
            <span>مرکز محاسبات مهندسی حریق</span>
          </div>
          <div className="topbar__status">
            {demo&&<span className="topbar-badge demo">DEMO • {demo.client}</span>}
            <span className="topbar-badge"><span className="pulse-dot tiny"/> Supabase Connected</span>
            <span className="topbar-badge amber">Metric SI</span>
          </div>
        </header>
        {demo&&<div className="demo-live-banner"><ShieldCheck size={18}/><div><strong>نسخه دمو کامل — {demo.client}</strong><span>فضای کاری مستقل؛ داده‌های واقعی قابل مشاهده نیستند. اعتبار تا {demo.expires?new Date(demo.expires).toLocaleString('fa-IR'):'زمان تعیین‌شده مدیر'}.</span></div></div>}
        <div className="page-wrap"><Outlet /></div>
      </main>
    </div>
  )
}
