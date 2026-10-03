import { useEffect, useState } from 'react'
import { ArrowLeft, Clock3, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import EngineeringLogo from '../components/EngineeringLogo'
import { supabase } from '../lib/supabase'

export default function DemoPage(){
 const {token}=useParams<{token:string}>()
 const navigate=useNavigate()
 const [message,setMessage]=useState(token?'در حال آماده‌سازی فضای دمو اختصاصی…':'برای ورود به دمو، لینک اختصاصی مشتری لازم است.')
 const [error,setError]=useState(false)

 useEffect(()=>{
  const previousTitle=document.title;document.title='نسخه دمو | Rabin Fire Engineering'
  const existing=document.querySelector('meta[name="robots"]') as HTMLMetaElement|null
  const created=!existing;const meta=existing||document.createElement('meta');if(created){meta.name='robots';document.head.appendChild(meta)}
  const previous=meta.content;meta.content='noindex,nofollow,noarchive'
  return()=>{document.title=previousTitle;if(created)meta.remove();else meta.content=previous}
 },[])

 useEffect(()=>{
  if(!token)return
  let cancelled=false
  ;(async()=>{
   try{
    const {data:{session}}=await supabase.auth.getSession()
    const expiry=session?.user?.app_metadata?.demo_expires_at as string|undefined
    if(session?.user?.app_metadata?.demo===true&&expiry&&new Date(expiry).getTime()>Date.now()){
      navigate('/',{replace:true});return
    }
    if(session)await supabase.auth.signOut()
    const {data,error:invokeError}=await supabase.functions.invoke('demo-access',{body:{action:'redeem',token}})
    if(invokeError)throw invokeError
    if(!data?.ok||!data?.session?.access_token||!data?.session?.refresh_token)throw new Error(data?.error||'لینک دمو قابل استفاده نیست.')
    const {error:setError}=await supabase.auth.setSession({access_token:data.session.access_token,refresh_token:data.session.refresh_token})
    if(setError)throw setError
    if(cancelled)return
    sessionStorage.setItem('rabin_demo_context',JSON.stringify(data.demo||{}))
    navigate('/',{replace:true})
   }catch(e){if(cancelled)return;setError(true);setMessage(e instanceof Error?e.message:'ورود به دمو انجام نشد.')}
  })()
  return()=>{cancelled=true}
 },[token,navigate])

 return <div className="demo-access-page" dir="rtl"><div className="demo-access-card">
  <EngineeringLogo/>
  <span className="eyebrow">CUSTOMER DEMO ACCESS</span>
  <h1>{error?'دسترسی دمو فعال نشد':token?'در حال ساخت فضای اختصاصی مشتری':'نسخه دمو اختصاصی'}</h1>
  <p>{message}</p>
  <div className="demo-access-points"><span><ShieldCheck/> Tenant مستقل و بدون دسترسی به داده‌های واقعی</span><span><Clock3/> دسترسی زمان‌دار و قابل لغو توسط مدیر</span><span><LockKeyhole/> محاسبات واقعی با محدودیت سروری پروژه و Run</span></div>
  {error&&<><p className="login-message">اگر لینک منقضی یا لغو شده باشد، مدیر سامانه باید لینک جدید ایجاد کند.</p><Link className="primary-button" to="/login">ورود به نسخه اصلی <ArrowLeft size={17}/></Link></>}
  {!token&&<Link className="secondary-button" to="/login">ورود به سامانه اصلی</Link>}
 </div></div>
}
