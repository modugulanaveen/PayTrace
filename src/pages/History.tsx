import { useEffect, useMemo, useState } from 'react'
import { Check, Download, Edit3, FileText, Search, Trash2, X } from 'lucide-react'
import jsPDF from 'jspdf'
import { deleteExpense, getExpenses, updateExpense, type ExpenseRecord, type TransactionType } from '../lib/expenses'
import { supabase } from '../lib/supabase'

function money(value: number) { return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function dateText(value: string) { return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) }
function monthKey(value: string) { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }
function monthLabel(key: string) { const [y,m] = key.split('-').map(Number); return new Date(y,m-1,1).toLocaleString('en-IN',{month:'long',year:'numeric'}) }

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]!)) }

export default function History() {
  const [records, setRecords] = useState<ExpenseRecord[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'ALL' | TransactionType>('ALL')
  const [month, setMonth] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<ExpenseRecord | null>(null)
  const [editText, setEditText] = useState('')
  const [editType, setEditType] = useState<TransactionType>('PAID')
  const [editAmount, setEditAmount] = useState('')

  const load = async () => { setLoading(true); setError(''); try { setRecords(await getExpenses()) } catch (e) { setError(e instanceof Error ? e.message : 'Could not load history.') } finally { setLoading(false) } }
  useEffect(() => {
    void load()
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') window.setTimeout(() => { void load() }, 0)
      if (event === 'SIGNED_OUT') { setRecords([]); setError(''); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const months = useMemo(() => Array.from(new Set(records.map(r => monthKey(r.transaction_date)))), [records])
  const filtered = useMemo(() => records.filter(r => {
    const matchesText = !query.trim() || r.statement.toLowerCase().includes(query.toLowerCase())
    const matchesType = filter === 'ALL' || r.type === filter
    const matchesMonth = month === 'ALL' || monthKey(r.transaction_date) === month
    return matchesText && matchesType && matchesMonth
  }), [records, query, filter, month])

  const startEdit = (r: ExpenseRecord) => { setEditing(r); setEditText(r.statement); setEditType(r.type); setEditAmount(String(r.amount || '')) }
  const saveEdit = async () => { if (!editing || !editText.trim()) return; try { const updated = await updateExpense(editing.id, editText, editType, Number(editAmount) || 0); setRecords(rs => rs.map(r => r.id === updated.id ? updated : r)); setEditing(null) } catch (e) { setError(e instanceof Error ? e.message : 'Could not update record.') } }
  const remove = async (id: string) => { if (!window.confirm('Delete this record?')) return; try { await deleteExpense(id); setRecords(rs => rs.filter(r => r.id !== id)) } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete record.') } }

  const downloadMonth = () => {
    if (!filtered.length) return

    const title = month === 'ALL' ? 'Expense Statement' : monthLabel(month)
    const paid = filtered.filter(r => r.type === 'PAID').reduce((s, r) => s + r.amount, 0)
    const taken = filtered.filter(r => r.type === 'TAKEN').reduce((s, r) => s + r.amount, 0)

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let y = 18

    const addHeader = () => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('ANVION INNOVATIONS PRIVATE LIMITED', 15, y)
      y += 7
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      doc.text(title, 15, y)
      y += 9
      doc.setDrawColor(220, 227, 238)
      doc.line(15, y, pageWidth - 15, y)
      y += 9
    }

    const addFooter = () => {
      doc.setFontSize(8)
      doc.setTextColor(120, 128, 144)
      doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, 15, pageHeight - 10)
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - 30, pageHeight - 10)
      doc.setTextColor(23, 32, 51)
    }

    addHeader()

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`Total Paid: ${money(paid)}`, 15, y)
    doc.text(`Total Taken: ${money(taken)}`, 78, y)
    doc.text(`Records: ${filtered.length}`, 142, y)
    y += 12

    const drawColumnHeader = () => {
      doc.setFillColor(241, 245, 249)
      doc.rect(15, y - 5, pageWidth - 30, 9, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.text('DATE / TIME', 18, y)
      doc.text('TYPE', 55, y)
      doc.text('AMOUNT', 78, y)
      doc.text('STATEMENT', 111, y)
      y += 9
      doc.setFont('helvetica', 'normal')
    }

    drawColumnHeader()

    filtered.forEach((r) => {
      const date = new Date(r.transaction_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      const statementLines = doc.splitTextToSize(r.statement, pageWidth - 126) as string[]
      const rowHeight = Math.max(12, statementLines.length * 4.2 + 4)

      if (y + rowHeight > pageHeight - 18) {
        addFooter()
        doc.addPage()
        y = 18
        addHeader()
        drawColumnHeader()
      }

      doc.setFontSize(8)
      doc.text(date, 18, y)
      doc.text(r.type === 'PAID' ? 'PAID' : 'TAKEN', 55, y)
      doc.text(money(r.amount), 78, y)
      doc.text(statementLines, 111, y)
      y += rowHeight
      doc.setDrawColor(235, 239, 245)
      doc.line(15, y - 2, pageWidth - 15, y - 2)
    })

    addFooter()
    const suffix = month === 'ALL' ? 'all' : month
    doc.save(`anvion-${suffix}-statement.pdf`)
  }

  return <div className="content"><div className="section">
    <div className="history-head"><div><h2>Expense History</h2><p className="muted">Every confirmed statement, with the original date and type.</p></div><button className="secondary" onClick={downloadMonth} disabled={!filtered.length}><FileText size={17}/> Download PDF Statement</button></div>
    <div className="filters"><div className="search"><Search size={17}/><input placeholder="Search statements…" value={query} onChange={e=>setQuery(e.target.value)}/></div><select value={month} onChange={e=>setMonth(e.target.value)}><option value="ALL">All months</option>{months.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}</select><select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="ALL">All types</option><option value="PAID">Paid</option><option value="TAKEN">Taken</option></select></div>
    {error && <div className="error-box">{error} <button className="secondary" onClick={load}>Try again</button></div>}
    {loading ? <div className="record-box"><p className="muted">Loading records…</p></div> : error ? null : !filtered.length ? <div className="record-box"><p className="muted">No records match your filters.</p></div> : <div className="history-list">{filtered.map(r=><div className="history-item" key={r.id}><div className="history-main"><div className="history-meta"><span className={`type-pill ${r.type.toLowerCase()}`}>{r.type === 'PAID' ? 'PAID' : 'TAKEN'}</span><span>{dateText(r.transaction_date)}</span></div><p>{r.statement}</p></div><div className="history-side"><strong>{money(r.amount)}</strong><div className="icon-actions"><button onClick={()=>startEdit(r)} title="Edit"><Edit3 size={16}/></button><button onClick={()=>remove(r.id)} title="Delete"><Trash2 size={16}/></button></div></div></div>)}</div>}
  </div>
  {editing && <div className="modal-backdrop"><div className="modal"><div className="modal-head"><h3>Edit Record</h3><button onClick={()=>setEditing(null)}><X/></button></div><div className="field"><label>Statement</label><textarea rows={6} value={editText} onChange={e=>setEditText(e.target.value)}/></div><div className="edit-grid"><div className="field"><label>Amount</label><input inputMode="decimal" value={editAmount} onChange={e=>setEditAmount(e.target.value)}/></div><div className="field"><label>Type</label><select value={editType} onChange={e=>setEditType(e.target.value as TransactionType)}><option value="PAID">PAID</option><option value="TAKEN">TAKEN</option></select></div></div><div className="modal-actions"><button className="secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="primary" onClick={saveEdit}><Check size={16}/> Save Changes</button></div></div></div>}
  </div>
}
