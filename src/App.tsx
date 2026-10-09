import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import RecordExpense from './pages/RecordExpense'
import History from './pages/History'
import Settings from './pages/Settings'
import { supabase } from './lib/supabase'
import './styles/global.css'

function Protected(){
 const [ready,setReady]=useState(!supabase); const [session,setSession]=useState<boolean>(false)
 useEffect(()=>{if(!supabase)return; supabase.auth.getSession().then(({data})=>{setSession(!!data.session);setReady(true)}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(!!s)); return()=>subscription.unsubscribe()},[])
 if(!ready)return null
 return session?<Outlet/>:<Navigate to="/login" replace/>
}
export default function App(){return <BrowserRouter><Routes><Route path="/login" element={<Login/>}/><Route element={<Protected/>}><Route element={<Layout/>}><Route path="/" element={<Dashboard/>}/><Route path="/record" element={<RecordExpense/>}/><Route path="/history" element={<History/>}/><Route path="/settings" element={<Settings/>}/></Route></Route><Route path="*" element={<Navigate to="/" replace/>}/></Routes></BrowserRouter>}
