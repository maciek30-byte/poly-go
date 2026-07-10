import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Database } from '@/shared/lib/database.types'

type CategoryRow = Database['public']['Tables']['categories']['Row']
type CertificateRow = Database['public']['Tables']['certificates']['Row']
type ParameterDefinitionRow = Database['public']['Tables']['parameter_definitions']['Row']
type CompanyMediaRow = Database['public']['Tables']['company_media']['Row']
type HighlightRow = Database['public']['Tables']['highlights']['Row']
type UserRow = Database['public']['Tables']['users']['Row']

// Kształt zwrócony przez zagnieżdżony select PostgREST. Jedno zapytanie,
// bez N+1 — relacje przyjeżdżają jako tablice obiektów.
export type CompanyProfileData = {
  id: string
  name: string
  display_name: string | null
  logo_url: string | null
  founding_year: number | null
  description: string | null
  region: string | null
  nip: string | null
  regon: string | null
  krs: string | null
  headquarters_address: string | null
  plant_address: string | null
  website: string | null
  categories: CategoryRow[]
  certificates: CertificateRow[]
  parameters: { value: string; definition: ParameterDefinitionRow }[]
  media: CompanyMediaRow[]
  highlights: HighlightRow[]
  employees: UserRow[]
}

export type CompanyProfileStatus = 'loading' | 'ready' | 'notFound' | 'error'

export type CompanyProfileState =
  | { status: 'loading'; data: null }
  | { status: 'ready'; data: CompanyProfileData }
  | { status: 'notFound'; data: null }
  | { status: 'error'; data: null }

const SELECT = `
  id, name, display_name, logo_url, founding_year, description, region,
  nip, regon, krs, headquarters_address, plant_address, website,
  company_categories ( categories ( id, name ) ),
  company_certificates ( certificates ( id, name, icon_url ) ),
  company_parameter_values ( value, parameter_definitions ( id, category_id, key, label, unit, value_type, sort_order ) ),
  company_media ( id, company_id, media_type, file_url, file_name, created_at ),
  highlights ( id, company_id, title, description, sort_order, created_at ),
  users ( id, company_id, full_name, job_title, phone, is_visible_on_profile, created_at )
`

// Token sekwencji: chroni przed wyścigiem przy szybkiej zmianie :id
// (wzorzec z auth-store.ts). Starsza odpowiedź, która dojedzie później,
// jest ignorowana.
let requestSeq = 0

export function useCompanyProfile(companyId: string | undefined): CompanyProfileState {
  // Stan startowy zależy od :id już w pierwszym renderze — brak id to od razu
  // notFound, co pozwala uniknąć synchronicznego setState w efekcie.
  const [state, setState] = useState<CompanyProfileState>(
    companyId ? { status: 'loading', data: null } : { status: 'notFound', data: null },
  )

  useEffect(() => {
    const seq = ++requestSeq

    void (async () => {
      if (!companyId) {
        if (seq !== requestSeq) return
        setState({ status: 'notFound', data: null })
        return
      }

      const { data, error } = await supabase
        .from('companies')
        .select(SELECT)
        .eq('id', companyId)
        .eq('users.is_visible_on_profile', true)
        .maybeSingle()

      // Zignoruj, jeśli wystartowało nowsze żądanie.
      if (seq !== requestSeq) return

      if (error) {
        setState({ status: 'error', data: null })
        return
      }

      if (!data) {
        setState({ status: 'notFound', data: null })
        return
      }

      setState({ status: 'ready', data: shape(data) })
    })()
  }, [companyId])

  return state
}

// Spłaszcza zagnieżdżony kształt PostgREST do płaskiego CompanyProfileData.
// PostgREST zwraca pivoty jako tablice obiektów z zagnieżdżoną relacją;
// wyciągamy z nich docelowe wiersze i sortujemy tam, gdzie kolejność ma znaczenie.
function shape(row: RawCompanyRow): CompanyProfileData {
  const categories = (row.company_categories ?? [])
    .map((cc) => cc.categories)
    .filter((c): c is CategoryRow => c != null)

  const certificates = (row.company_certificates ?? [])
    .map((cc) => cc.certificates)
    .filter((c): c is CertificateRow => c != null)

  const parameters = (row.company_parameter_values ?? [])
    .filter((pv): pv is RawParameterValue & { parameter_definitions: ParameterDefinitionRow } =>
      pv.parameter_definitions != null,
    )
    .map((pv) => ({ value: pv.value, definition: pv.parameter_definitions }))
    .sort((a, b) => a.definition.sort_order - b.definition.sort_order)

  const highlights = [...(row.highlights ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  const media = row.company_media ?? []

  // RLS/filtr is_visible_on_profile zawężamy też po stronie klienta na wszelki
  // wypadek (zagnieżdżony filtr PostgREST działa, ale jawne odsianie jest tańsze
  // niż poleganie na nim w 100%).
  const employees = (row.users ?? []).filter((u) => u.is_visible_on_profile)

  return {
    id: row.id,
    name: row.name,
    display_name: row.display_name,
    logo_url: row.logo_url,
    founding_year: row.founding_year,
    description: row.description,
    region: row.region,
    nip: row.nip,
    regon: row.regon,
    krs: row.krs,
    headquarters_address: row.headquarters_address,
    plant_address: row.plant_address,
    website: row.website,
    categories,
    certificates,
    parameters,
    media,
    highlights,
    employees,
  }
}

// Surowy kształt wiersza zwracanego przez SELECT powyżej.
type RawParameterValue = { value: string; parameter_definitions: ParameterDefinitionRow | null }

type RawCompanyRow = {
  id: string
  name: string
  display_name: string | null
  logo_url: string | null
  founding_year: number | null
  description: string | null
  region: string | null
  nip: string | null
  regon: string | null
  krs: string | null
  headquarters_address: string | null
  plant_address: string | null
  website: string | null
  company_categories: { categories: CategoryRow | null }[] | null
  company_certificates: { certificates: CertificateRow | null }[] | null
  company_parameter_values: RawParameterValue[] | null
  company_media: CompanyMediaRow[] | null
  highlights: HighlightRow[] | null
  users: UserRow[] | null
}
