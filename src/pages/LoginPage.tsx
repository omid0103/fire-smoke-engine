import { FormEvent, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Activity, ArrowLeft, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import EngineeringLogo from '../components/EngineeringLogo'
import { latinDigits, normalizeMobile, authMessage } from '../lib/phone'
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../lib/supabase'

export default function LoginPage() {
  const [phoneEnabled,setPhoneEnabled]=useState<boolean|null>(null)
  useEffect(()=>{const controller=new AbortController();fetch(`${SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY},signal:controller.signal}).then(r=>r.ok?r.json():Promise.reject()).then(s=>setPhoneEnabled(s.external?.phone===true)).catch(()=>{});return()=>controller.abort()},[])
  const [method,setMethod]=useState<'phone'|'email'>('phone')
  const [phone,setPhone]=useState(''),[sentPhone,setSentPhone]=useState(''),[otp,setOtp]=useState(''),[retryAt,setRetryAt]=useState(0),[now,setNow]=useState(Date.now())
  useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t)},[])
  const remaining=Math.max(0,Math.ceil((retryAt-now)/1000))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [authed, setAuthed] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    try {
      if(method==='phone'){
        if(sentPhone){
          const token=latinDigits(otp).trim();if(!/^\d{6,10}$/.test(token))throw new Error('کد پیامک‌شده را کامل وارد کنید.');
          const {data,error}=await supabase.auth.verifyOtp({phone:sentPhone,token,type:'sms'});if(error)throw error;if(!data.session)throw new Error('نشست ورود ایجاد نشد؛ دوباره تلاش کنید.');setOtp('');setAuthed(true);return;
        }
        await sendCode();return;
      }
      const res = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
      if (res.error) throw res.error
      if (res.data.session) setAuthed(true)
      else setMessage('حساب ایجاد شد. در صورت فعال بودن تأیید ایمیل، لینک ارسال‌شده را بررسی کنید.')
    } catch (e) {
      setMessage(authMessage(e))
    } finally { setBusy(false) }
  }

  async function sendCode(){if(Date.now()<retryAt)throw new Error('برای ارسال مجدد صبر کنید.');const normalized=normalizeMobile(phone);const {error}=await supabase.auth.signInWithOtp({phone:normalized,options:{shouldCreateUser:true}});if(error)throw error;setSentPhone(normalized);setOtp('');setRetryAt(Date.now()+60000);setMessage('درخواست ارسال کد پذیرفته شد؛ کد پیامک‌شده را وارد کنید.')}
  async function resend(){setBusy(true);setMessage('');try{await sendCode()}catch(e){setMessage(authMessage(e))}finally{setBusy(false)}}
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
            <h2>{method==='phone'?'ورود / ساخت حساب با موبایل':mode === 'login' ? 'ورود به سامانه' : 'ایجاد حساب'}</h2>
            <p>دسترسی به محیط محاسبات مهندسی رابین آذر</p>
          </div>
          <div className="segmented-tabs"><button type="button" disabled={busy} className={method==='phone'?'active':''} onClick={()=>{setMethod('phone');setMessage('')}}>شماره موبایل</button><button type="button" disabled={busy} className={method==='email'?'active':''} onClick={()=>{setMethod('email');setMessage('')}}>ایمیل و رمز عبور</button></div>
          {method==='phone'?<>
          {phoneEnabled===false&&<div role="status" className="login-message">ورود پیامکی در انتظار فعال‌سازی سرویس ارسال است. فعلاً از ورود ایمیلی استفاده کنید.</div>}
          <label className="login-input"><span>شماره موبایل</span><div><input type="tel" autoComplete="tel" inputMode="tel" placeholder="09121234567" value={phone} disabled={busy||!!sentPhone} onChange={e=>setPhone(e.target.value)} required dir="ltr"/></div></label>
          {sentPhone&&<><label className="login-input"><span>کد یک‌بارمصرف</span><div><input type="text" autoComplete="one-time-code" inputMode="numeric" value={otp} onChange={e=>setOtp(latinDigits(e.target.value).replace(/[^0-9]/g,''))} maxLength={10} required disabled={busy} dir="ltr"/></div></label><div className="report-actions"><button type="button" className="text-button" disabled={busy||remaining>0} onClick={resend}>{remaining>0?`ارسال مجدد در ${remaining} ثانیه`:'ارسال مجدد کد'}</button><button type="button" className="text-button" disabled={busy} onClick={()=>{setSentPhone('');setOtp('');setMessage('')}}>ویرایش شماره</button></div></>}
          <p className="login-disclaimer">اگر حسابی با این شماره ندارید، پس از تأیید کد ساخته می‌شود. حساب موبایلی به‌صورت خودکار با حساب ایمیلی قبلی ادغام نمی‌شود.</p>
          </>:<>
          <label className="login-input"><span>ایمیل</span><div><Mail size={18}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required dir="ltr"/></div></label>
          <label className="login-input"><span>رمز عبور</span><div><LockKeyhole size={18}/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} dir="ltr"/></div></label>
          </>}
          {message && <div role="status" aria-live="polite" className="login-message">{message}</div>}
          <button className="primary-button large" disabled={busy||(method==='phone'&&phoneEnabled===false)}>{busy ? 'در حال پردازش…' : <>{method==='phone'?(sentPhone?'تأیید کد و ورود':'دریافت کد یک‌بارمصرف'):mode === 'login' ? 'ورود به سامانه' : 'ثبت حساب'}<ArrowLeft size={18}/></>}</button>
          {method==='email'&&<button type="button" className="text-button" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'حساب ندارید؟ ایجاد حساب':'حساب دارید؟ ورود'}</button>}
          <Link to="/forgot-password" className="text-button">رمز عبور ایمیلی را فراموش کرده‌اید؟</Link><div className="login-disclaimer">این سامانه ابزار کمک‌مهندسی است. تأیید نهایی طراحی وابسته به استاندارد جاری، ضوابط مرجع ذی‌صلاح و بازبینی متخصص است.</div>
        </form>
      </section>
    </div>
  )
}


export function PasswordRecoveryPage({recovery=false}:{recovery?:boolean}) {
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState('')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[done,setDone]=useState(false)
 const [retryAt,setRetryAt]=useState(0),[now,setNow]=useState(Date.now())
 useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id)},[])
 const remaining=Math.max(0,Math.ceil((retryAt-now)/1000))
 async function submit(e:FormEvent){
  e.preventDefault();if(busy||done||(!recovery&&remaining>0))return
  setBusy(true);setMessage('')
  try {
   if(recovery){
    if(password.length<12)throw new Error('رمز جدید باید حداقل ۱۲ نویسه باشد.')
    if(password!==repeat)throw new Error('رمز جدید و تکرار آن یکسان نیستند.')
    const {error}=await supabase.auth.updateUser({password});if(error)throw error
    setPassword('');setRepeat('');setDone(true)
    const result=await supabase.auth.signOut({scope:'global'})
    setMessage(result.error?'رمز تغییر کرد؛ خروج از همه نشست‌ها تأیید نشد. از حساب خارج شوید و دوباره وارد شوید.':'رمز تغییر کرد. اکنون با رمز جدید وارد شوید.')
   }else{
    const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:window.location.origin+'/login'})
    if(error)throw error
    setRetryAt(Date.now()+60000)
    setMessage('اگر حساب ایمیلی قابل بازیابی باشد، لینک بازیابی برای آن ارسال می‌شود. پوشه هرزنامه را هم بررسی کنید و لینک را در همین مرورگر باز کنید.')
   }
  }catch(e){setMessage(authMessage(e))}finally{setBusy(false)}
 }
 return <div className="login-page"><section className="login-form-area"><form className="login-card" onSubmit={submit}>
 <h1>{recovery?'تعیین رمز جدید':'بازیابی رمز عبور'}</h1>
 <p>{recovery?'رمز جدید را فقط در این فرم وارد کنید.':'ایمیل همان حسابی را وارد کنید که رمز آن را فراموش کرده‌اید.'}</p>
 {!done&&(recovery?<><label className="login-input"><span>رمز جدید</span><input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy} dir="ltr"/></label><label className="login-input"><span>تکرار رمز جدید</span><input type="password" autoComplete="new-password" minLength={12} required value={repeat} onChange={e=>setRepeat(e.target.value)} disabled={busy} dir="ltr"/></label></>:<label className="login-input"><span>ایمیل حساب</span><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy} dir="ltr"/></label>)}
 {message&&<p className="login-message" role="status">{message}</p>}
 {!done&&<button className="primary-button" disabled={busy||(!recovery&&remaining>0)}>{busy?'در حال پردازش…':recovery?'ذخیره رمز جدید':remaining>0?`ارسال مجدد در ${remaining} ثانیه`:'ارسال لینک بازیابی'}</button>}
 <a className="text-button" href="/login">بازگشت به ورود</a>
 </form></section></div>
}
