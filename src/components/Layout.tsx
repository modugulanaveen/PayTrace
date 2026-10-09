import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Mic, History, Settings, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Layout(){
  const links=[['/','Dashboard',LayoutDashboard],['/record','Record Expense',Mic],['/history','Expense History',History],['/settings','Settings',Settings]] as const
  return <div className="app-shell"><aside className="sidebar"><div className="brand">ANVION <span>EXPENSE</span></div><nav className="nav">{links.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/' }><Icon size={18}/>{label}</NavLink>)}</nav><div style={{marginTop:'auto'}}><button className="secondary" style={{width:'100%'}} onClick={()=>supabase?.auth.signOut()}><LogOut size={17}/> Logout</button></div></aside><main className="main"><header className="topbar"><div className="topbar-copy"><h1>ANVION INNOVATIONS PRIVATE LIMITED</h1><span className="muted">Director Expense Statements</span></div><button className="mobile-logout" onClick={()=>supabase?.auth.signOut()} aria-label="Logout"><LogOut size={19}/></button></header><Outlet/></main><nav className="mobile-nav" aria-label="Main navigation">{links.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/'}><Icon size={20}/><span>{label === 'Record Expense' ? 'Record' : label === 'Expense History' ? 'History' : label}</span></NavLink>)}</nav></div>
}
