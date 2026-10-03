import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function validSession(session:any){
 if(!session)return false
 if(session.user?.app_metadata?.demo===true){
  const expires=Date.parse(String(session.user.app_metadata.demo_expires_at||''))
  if(!Number.isFinite(expires)||expires<=Date.now())return false
 }
 return true
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  useEffect(() => {
    let timer:number|undefined
    async function apply(session:any){
      const ok=validSession(session);setAuthed(ok);setLoading(false)
      if(!ok&&session?.user?.app_metadata?.demo===true)await supabase.auth.signOut()
      if(ok&&session?.user?.app_metadata?.demo===true){
        const ms=Date.parse(String(session.user.app_metadata.demo_expires_at))-Date.now()
        window.clearTimeout(timer);timer=window.setTimeout(()=>{setAuthed(false);supabase.auth.signOut()},Math.max(0,Math.min(ms,2_147_000_000)))
      }
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { void apply(session) })
    return () => {sub.subscription.unsubscribe();window.clearTimeout(timer)}
  }, [])
  if (loading) return <div className="full-loader"><div className="loader-ring"/><span>در حال اتصال به موتور مهندسی…</span></div>
  if (!authed) return <Navigate to="/login" replace />
  return <>{children}</>
}
