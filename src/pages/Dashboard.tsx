import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Clock3, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getExpenses, type ExpenseRecord } from '../lib/expenses'

const money = (n:number) => `₹${n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const dateText = (v:string) => new Date(v).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})
export default function Dashboard(){
 const [records,setRecords]=useState<ExpenseRecord[]>([]); const [loading,setLoading]=useState(true)
 useEffect(()=>{getExpenses().then(setRecords).catch(()=>setRecords([])).finally(()=>setLoading(false))},[])
 const paid=useMemo(()=>records.filter(r=>r.type==='PAID').reduce((s,r)=>s+r.amount,0),[records]); const taken=useMemo(()=>records.filter(r=>r.type==='TAKEN').reduce((s,r)=>s+r.amount,0),[records])
 return <div className="content"><div className="dashboard-head"><div><h2>Dashboard</h2><p className="muted">A simple view of director-paid expenses and drawings.</p></div><Link className="primary" to="/record"><Plus size={17}/> Record New</Link></div><div className="cards"><div className="card"><div className="stat-icon blue-bg"><ArrowUpRight/></div><div className="label">TOTAL PAID</div><div className="value blue">{money(paid)}</div></div><div className="card"><div className="stat-icon red-bg"><ArrowDownLeft/></div><div className="label">TOTAL TAKEN</div><div className="value red">{money(taken)}</div></div><div className="card"><div className="stat-icon gray-bg"><Clock3/></div><div className="label">TOTAL RECORDS</div><div className="value">{records.length}</div></div></div><div className="section"><div className="section-title-row"><div><h2>Recent Records</h2><p className="muted">Your latest confirmed statements.</p></div><Link to="/history">View all</Link></div>{loading?<div className="record-box"><p className="muted">Loading…</p></div>:!records.length?<div className="record-box"><p className="muted">No records yet.</p><Link className="primary" to="/record">Record an Expense</Link></div>:<div className="history-list">{records.slice(0,5).map(r=><div className="history-item" key={r.id}><div className="history-main"><div className="history-meta"><span className={`type-pill ${r.type.toLowerCase()}`}>{r.type}</span><span>{dateText(r.transaction_date)}</span></div><p>{r.statement}</p></div><div className="history-side"><strong>{money(r.amount)}</strong></div></div>)}</div>}</div></div>
}
