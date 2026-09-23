import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setAuthed(!!data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setAuthed(!!session))
    return () => sub.subscription.unsubscribe()
  }, [])
  if (loading) return <div className="full-loader"><div className="loader-ring"/><span>در حال اتصال به موتور مهندسی…</span></div>
  if (!authed) return <Navigate to="/login" replace />
  return <>{children}</>
}
