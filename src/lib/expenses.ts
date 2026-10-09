import { supabase } from './supabase'

export type TransactionType = 'PAID' | 'TAKEN'
export type ExpenseRecord = {
  id: string
  user_id: string
  type: TransactionType
  statement: string
  amount: number
  transaction_date: string
  created_at: string
  updated_at: string
}

export async function saveExpense(statement: string, type: TransactionType, amount: number) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Please log in again.')
  const { data, error } = await supabase.from('expense_records').insert({
    user_id: user.id,
    type,
    statement: statement.trim(),
    amount: Number.isFinite(amount) ? amount : 0,
    transaction_date: new Date().toISOString(),
  }).select().single()
  if (error) throw new Error(error.message)
  return data as ExpenseRecord
}

export async function getExpenses() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) throw new Error(`Could not verify your login: ${authError.message}`)
  if (!user) throw new Error('Please log in again to view your expense history.')
  const { data, error } = await supabase.from('expense_records').select('*').eq('user_id', user.id).order('transaction_date', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as ExpenseRecord[]
}

export async function updateExpense(id: string, statement: string, type: TransactionType, amount: number) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('expense_records').update({ statement: statement.trim(), type, amount: Number.isFinite(amount) ? amount : 0 }).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as ExpenseRecord
}

export async function deleteExpense(id: string) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('expense_records').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export function extractAmount(text: string): number {
  const cleaned = text.replace(/,/g, '')
  const rupee = cleaned.match(/(?:₹|rs\.?|inr\s*)\s*(\d+(?:\.\d+)?)/i)
  if (rupee) return Number(rupee[1]) || 0
  const numbers = cleaned.match(/\b\d+(?:\.\d+)?\b/g)
  if (!numbers) return 0
  const candidates = numbers.map(Number).filter(n => n > 0)
  return candidates.length ? candidates[candidates.length - 1] : 0
}
