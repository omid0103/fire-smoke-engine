import { NavLink, Outlet } from 'react-router-dom'
import { Activity, Bell, BookOpenCheck, Building2, Calculator, Flame, Gauge, LogOut, Menu, PanelLeftClose, Settings, ShieldCheck, Wind } from 'lucide-react'
import { useState } from 'react'
import EngineeringLogo from './EngineeringLogo'
import { supabase } from '../lib/supabase'

const nav = [
  ['/', 'داشبورد', Activity],
  ['/projects', 'پروژه‌ها', Building2],
  ['/suppression', 'اطفاء و هیدرولیک', Flame],
  ['/smoke', 'کنترل دود', Wind],
  ['/alarm', 'اعلام حریق', Bell],
  ['/standards', 'استانداردها و قواعد', BookOpenCheck],
  ['/reports', 'گزارش‌ها', Calculator],
  ['/settings', 'تنظیمات', Settings],
] as const

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobile, setMobile] = useState(false)
  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
        <div className="sidebar__top">
          <EngineeringLogo compact={collapsed}/>
          <button className="icon-button collapse-btn" onClick={() => setCollapsed(v => !v)} title="جمع کردن منو"><PanelLeftClose size={18}/></button>
        </div>
        <div className="sidebar__system-card">
          <div className="pulse-dot" />
          {!collapsed && <><span>ENGINEERING CORE</span><strong>v0.3.0 / ONLINE</strong></>}
        </div>
        <nav className="sidebar__nav">
          {nav.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} className={({isActive}) => isActive ? 'active' : ''} onClick={() => setMobile(false)}>
              <Icon size={19}/><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__bottom">
          <div className="ahj-chip"><ShieldCheck size={17}/>{!collapsed && <span>Design Aid • AHJ Review Required</span>}</div>
          <button className="sidebar-logout" onClick={() => supabase.auth.signOut()}><LogOut size={18}/><span>خروج</span></button>
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
            <span className="topbar-badge"><span className="pulse-dot tiny"/> Supabase Connected</span>
            <span className="topbar-badge amber">Metric SI</span>
          </div>
        </header>
        <div className="page-wrap"><Outlet /></div>
      </main>
    </div>
  )
}
