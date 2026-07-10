import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuthStore } from '@/shared/lib/auth-store'
import type { Database } from '@/shared/lib/database.types'

export type EmployeeRow = Database['public']['Tables']['users']['Row']

// Pola pracownika edytowalne przez ownera (job_title/phone/widoczność).
// company_id/id/full_name nie są edytowalne tu (full_name = dane konta).
export type EmployeeEdit = {
  job_title: string
  phone: string | null
  is_visible_on_profile: boolean
}

export type CompanyEmployeesState =
  | { status: 'loading'; employees: null; reload: () => void }
  | { status: 'noCompany'; employees: null; reload: () => void }
  | { status: 'error'; employees: null; reload: () => void }
  | { status: 'ready'; employees: EmployeeRow[]; reload: () => void }

// Token sekwencji — ochrona przed wyścigiem (wzorzec z innych hooków).
let requestSeq = 0

export function useCompanyEmployees(): CompanyEmployeesState {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const [employees, setEmployees] = useState<EmployeeRow[] | null>(null)
  const [status, setStatus] = useState<'loading' | 'noCompany' | 'error' | 'ready'>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    const seq = ++requestSeq

    void (async () => {
      if (!userId) {
        if (seq === requestSeq) {
          setStatus('noCompany')
          setEmployees(null)
        }
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .maybeSingle()

      if (seq !== requestSeq) return
      if (profileError) {
        setStatus('error')
        setEmployees(null)
        return
      }
      if (!profile?.company_id) {
        setStatus('noCompany')
        setEmployees(null)
        return
      }

      // RLS users_select_all pozwala czytać; zawężamy do własnej firmy jawnie.
      const { data, error } = await supabase
        .from('users')
        .select('id, company_id, full_name, job_title, phone, is_visible_on_profile, created_at')
        .eq('company_id', profile.company_id)
        .order('full_name')

      if (seq !== requestSeq) return
      if (error) {
        setStatus('error')
        setEmployees(null)
        return
      }

      setEmployees(data ?? [])
      setStatus('ready')
    })()
  }, [userId, reloadKey])

  if (status === 'ready') return { status, employees: employees ?? [], reload }
  return { status, employees: null, reload }
}

// Edycja pracownika własnej firmy. RLS users_update_own_company (migracja 0006)
// gwarantuje, że zapis dotyczy tylko pracownika własnej firmy. Rzuca na błędzie.
export async function saveEmployee(employeeId: string, edit: EmployeeEdit): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      job_title: edit.job_title.trim(),
      phone: edit.phone?.trim() ? edit.phone.trim() : null,
      is_visible_on_profile: edit.is_visible_on_profile,
    })
    .eq('id', employeeId)
  if (error) throw error
}
