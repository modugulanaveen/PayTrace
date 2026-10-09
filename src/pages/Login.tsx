import { FormEvent, useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { signInWithName } from '../lib/auth'

export default function Login(){
 const navigate=useNavigate(); const [name,setName]=useState(''); const [password,setPassword]=useState(''); const [message,setMessage]=useState(''); const [loading,setLoading]=useState(false); const [checking,setChecking]=useState(true); const [session,setSession]=useState(false)
 useEffect(()=>{let active=true; supabase?.auth.getSession().then(({data})=>{if(active){setSession(!!data.session);setChecking(false)}}); if(!supabase)setChecking(false); return()=>{active=false}},[])
 if(checking)return null
 if(session)return <Navigate to="/" replace/>
 const submit=async(e:FormEvent)=>{e.preventDefault();setMessage('');setLoading(true);try{await signInWithName(name,password);navigate('/',{replace:true})}catch(error){setMessage(error instanceof Error?error.message:'Unable to login.')}finally{setLoading(false)}}
 return <div className="login-page"><form className="login-card" onSubmit={submit}><div className="brand" style={{padding:'0 0 20px'}}>ANVION <span>EXPENSE</span></div><h1>Welcome back</h1><p className="muted">Sign in to manage director expense statements.</p><div className="field"><label>Name</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your name" autoComplete="username" required/></div><div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password" required/></div><button className="primary full" disabled={loading}>{loading?'Signing in…':'Login'}</button>{message&&<p style={{color:'#dc2626',fontSize:13}}>{message}</p>}<p className="hint">Your name is used as the login ID. Authentication is handled securely by Supabase.</p></form></div>
}
