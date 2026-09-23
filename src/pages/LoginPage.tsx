import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Activity, ArrowLeft, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import EngineeringLogo from '../components/EngineeringLogo'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [authed, setAuthed] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    try {
      const res = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
      if (res.error) throw res.error
      if (res.data.session) setAuthed(true)
      else setMessage('حساب ایجاد شد. در صورت فعال بودن تأیید ایمیل، لینک ارسال‌شده را بررسی کنید.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'خطای ورود')
    } finally { setBusy(false) }
  }

  if (authed) return <Navigate to="/" replace />
  return (
    <div className="login-page">
      <div className="login-grid-bg" />
      <section className="login-visual">
        <div className="login-visual__content">
          <EngineeringLogo />
          <div className="login-kicker"><Activity size={16}/> FIRE ENGINEERING COMPUTATION PLATFORM</div>
          <h1>محاسبات حریق،<br/><em>قابل ردیابی و مهندسی‌شده.</em></h1>
          <p>یک محیط تخصصی برای محاسبات هیدرولیک اطفاء، کنترل دود و اعلام حریق با ثبت ورودی، نسخه موتور، هشدارها و ردیابی فرمول.</p>
          <div className="schematic-board" aria-hidden="true">
            <svg viewBox="0 0 760 300">
              <defs><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="currentColor" strokeWidth=".5" opacity=".25"/></pattern></defs>
              <rect width="760" height="300" fill="url(#grid)"/>
              <path d="M40 220H210V92H348V154H500V64H712" fill="none" stroke="currentColor" strokeWidth="3" opacity=".65"/>
              <circle cx="210" cy="220" r="8" fill="currentColor"/><circle cx="348" cy="154" r="8" fill="currentColor"/><circle cx="500" cy="154" r="8" fill="currentColor"/>
              <path d="M125 220v-32m-20 0h40M430 154v42m-18 0h36M612 64v60m-22 0h44" stroke="currentColor" strokeWidth="2"/>
              <text x="55" y="260" fill="currentColor">FLOW / PRESSURE NETWORK</text>
              <text x="560" y="280" fill="currentColor">RABIN ENGINE CORE</text>
            </svg>
          </div>
          <div className="login-trust-row">
            <span><ShieldCheck size={16}/> Rule Registry</span><span><LockKeyhole size={16}/> RLS Security</span><span><Activity size={16}/> Calculation Hash</span>
          </div>
        </div>
      </section>
      <section className="login-form-area">
        <form className="login-card" onSubmit={submit}>
          <div className="login-card__head">
            <span className="eyebrow">SECURE ACCESS</span>
            <h2>{mode === 'login' ? 'ورود به سامانه' : 'ایجاد حساب'}</h2>
            <p>دسترسی به محیط محاسبات مهندسی رابین آذر</p>
          </div>
          <label className="login-input"><span>ایمیل</span><div><Mail size={18}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required dir="ltr"/></div></label>
          <label className="login-input"><span>رمز عبور</span><div><LockKeyhole size={18}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} dir="ltr"/></div></label>
          {message && <div className="login-message">{message}</div>}
          <button className="primary-button large" disabled={busy}>{busy ? 'در حال پردازش…' : <>{mode === 'login' ? 'ورود به سامانه' : 'ثبت حساب'}<ArrowLeft size={18}/></>}</button>
          <button type="button" className="text-button" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'حساب ندارید؟ ایجاد حساب':'حساب دارید؟ ورود'}</button>
          <div className="login-disclaimer">این سامانه ابزار کمک‌مهندسی است. تأیید نهایی طراحی وابسته به استاندارد جاری، ضوابط مرجع ذی‌صلاح و بازبینی متخصص است.</div>
        </form>
      </section>
    </div>
  )
}
