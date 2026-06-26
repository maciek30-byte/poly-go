import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuthStore } from './auth-store'
import type { Database } from './database.types'

type CategoryRow = Database['public']['Tables']['categories']['Row']
type CertificateRow = Database['public']['Tables']['certificates']['Row']
type ParameterDefinitionRow = Database['public']['Tables']['parameter_definitions']['Row']
type HighlightRow = Database['public']['Tables']['highlights']['Row']
type CompanyMediaRow = Database['public']['Tables']['company_media']['Row']

// Edytowalny kształt własnej firmy. Pola tekstowe/rejestrowe + relacje
// rozłożone tak, by łatwo wpiąć je w react-hook-form (płaskie pola + listy id).
export type OwnCompanyData = {
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
  categoryIds: number[]
  certificateIds: number[]
  parameterValues: Record<number, string> // definition_id -> value
  highlights: HighlightRow[]
  media: CompanyMediaRow[]
}

// Słowniki + definicje pasujące do kategorii firmy. Render parametrów jest
// data-driven: pola formularza powstają z `parameterDefinitions`, nigdy
// z hardkodu kluczy per branża (memory: param-definitions-data-not-code).
export type OwnCompanyDictionaries = {
  categories: CategoryRow[]
  certificates: CertificateRow[]
  parameterDefinitions: ParameterDefinitionRow[]
}

export type OwnCompanyState =
  | { status: 'loading'; data: null; dictionaries: null; reload: () => void }
  | { status: 'noCompany'; data: null; dictionaries: null; reload: () => void }
  | { status: 'error'; data: null; dictionaries: null; reload: () => void }
  | { status: 'ready'; data: OwnCompanyData; dictionaries: OwnCompanyDictionaries; reload: () => void }

const COMPANY_SELECT = `
  id, name, display_name, logo_url, founding_year, description, region,
  nip, regon, krs, headquarters_address, plant_address, website,
  company_categories ( category_id ),
  company_certificates ( certificate_id ),
  company_parameter_values ( definition_id, value ),
  highlights ( id, company_id, title, description, sort_order, created_at ),
  company_media ( id, company_id, media_type, file_url, file_name, created_at )
`

// Wynik ładowania bez `reload` — `reload` dokładamy stabilnie przy zwrocie,
// żeby nie tworzyć cyklu (funkcja referująca samą siebie w stanie).
type LoadResult =
  | { status: 'loading'; data: null; dictionaries: null }
  | { status: 'noCompany'; data: null; dictionaries: null }
  | { status: 'error'; data: null; dictionaries: null }
  | { status: 'ready'; data: OwnCompanyData; dictionaries: OwnCompanyDictionaries }

// Token sekwencji: chroni przed wyścigiem przy przelogowaniu / wielokrotnym
// reloadzie (wzorzec z auth-store.ts / use-company-profile.ts).
let requestSeq = 0

export function useOwnCompany(): OwnCompanyState {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const [result, setResult] = useState<LoadResult>({ status: 'loading', data: null, dictionaries: null })
  // Bumpnięcie licznika wyzwala ponowne ładowanie (po zapisie wizytówki).
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    const seq = ++requestSeq

    void (async () => {
      if (!userId) {
        if (seq === requestSeq) setResult({ status: 'noCompany', data: null, dictionaries: null })
        return
      }

      // 1) company_id zalogowanego usera
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', userId)
        .maybeSingle()

      if (seq !== requestSeq) return
      if (profileError) {
        setResult({ status: 'error', data: null, dictionaries: null })
        return
      }
      if (!profile?.company_id) {
        setResult({ status: 'noCompany', data: null, dictionaries: null })
        return
      }

      // 2) firma + relacje, słowniki kategorii/certyfikatów — równolegle
      const companyId = profile.company_id
      const [companyRes, categoriesRes, certificatesRes] = await Promise.all([
        supabase.from('companies').select(COMPANY_SELECT).eq('id', companyId).maybeSingle(),
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('certificates').select('id, name, icon_url').order('name'),
      ])

      if (seq !== requestSeq) return
      if (companyRes.error || categoriesRes.error || certificatesRes.error || !companyRes.data) {
        setResult({ status: 'error', data: null, dictionaries: null })
        return
      }

      const company = companyRes.data
      const categoryIds = (company.company_categories ?? []).map((c) => c.category_id)

      // 3) definicje parametrów dla kategorii firmy (data-driven render formularza)
      let parameterDefinitions: ParameterDefinitionRow[] = []
      if (categoryIds.length > 0) {
        const { data: defs, error: defsError } = await supabase
          .from('parameter_definitions')
          .select('id, category_id, key, label, unit, value_type, sort_order')
          .in('category_id', categoryIds)
          .order('sort_order')

        if (seq !== requestSeq) return
        if (defsError) {
          setResult({ status: 'error', data: null, dictionaries: null })
          return
        }
        parameterDefinitions = defs ?? []
      }

      const parameterValues: Record<number, string> = {}
      for (const pv of company.company_parameter_values ?? []) {
        parameterValues[pv.definition_id] = pv.value
      }

      const data: OwnCompanyData = {
        id: company.id,
        name: company.name,
        display_name: company.display_name,
        logo_url: company.logo_url,
        founding_year: company.founding_year,
        description: company.description,
        region: company.region,
        nip: company.nip,
        regon: company.regon,
        krs: company.krs,
        headquarters_address: company.headquarters_address,
        plant_address: company.plant_address,
        website: company.website,
        categoryIds,
        certificateIds: (company.company_certificates ?? []).map((c) => c.certificate_id),
        parameterValues,
        highlights: [...(company.highlights ?? [])].sort((a, b) => a.sort_order - b.sort_order),
        media: company.company_media ?? [],
      }

      if (seq !== requestSeq) return
      setResult({
        status: 'ready',
        data,
        dictionaries: {
          categories: categoriesRes.data ?? [],
          certificates: certificatesRes.data ?? [],
          parameterDefinitions,
        },
      })
    })()
  }, [userId, reloadKey])

  return { ...result, reload }
}

// ============================================================
// Zapisy per sekcja. RLS (companies_update_own, *_modify_own,
// company_parameter_values_modify_own, highlights_modify_own) gwarantuje, że
// owner zapisze tylko własną firmę — funkcje nie sprawdzają tego dodatkowo.
// Rzucają na błędzie; wołający łapie i pokazuje sonner toast.
// ============================================================

export type CompanyBasicFields = {
  name: string
  display_name: string | null
  founding_year: number | null
  description: string | null
  region: string | null
  nip: string | null
  regon: string | null
  krs: string | null
  headquarters_address: string | null
  plant_address: string | null
  website: string | null
}

export async function saveCompanyBasics(companyId: string, fields: CompanyBasicFields): Promise<void> {
  const { error } = await supabase.from('companies').update(fields).eq('id', companyId)
  if (error) throw error
}

// Pivoty M:N: pełna wymiana (delete-all + insert-wybrane). Prostsze i
// idempotentne przy małych zbiorach (kilka kategorii/certów na firmę).
export async function saveCompanyCategories(companyId: string, categoryIds: number[]): Promise<void> {
  const del = await supabase.from('company_categories').delete().eq('company_id', companyId)
  if (del.error) throw del.error
  if (categoryIds.length > 0) {
    const ins = await supabase
      .from('company_categories')
      .insert(categoryIds.map((category_id) => ({ company_id: companyId, category_id })))
    if (ins.error) throw ins.error
  }
}

export async function saveCompanyCertificates(companyId: string, certificateIds: number[]): Promise<void> {
  const del = await supabase.from('company_certificates').delete().eq('company_id', companyId)
  if (del.error) throw del.error
  if (certificateIds.length > 0) {
    const ins = await supabase
      .from('company_certificates')
      .insert(certificateIds.map((certificate_id) => ({ company_id: companyId, certificate_id })))
    if (ins.error) throw ins.error
  }
}

// Parametry: upsert niepustych wartości, delete dla wyczyszczonych. Klucz
// (company_id, definition_id) jest PK, więc onConflict trafia w PK.
export async function saveCompanyParameters(
  companyId: string,
  values: Record<number, string>,
): Promise<void> {
  const rows = Object.entries(values)
    .map(([definitionId, value]) => ({ definitionId: Number(definitionId), value: value.trim() }))
    .filter((r) => Number.isFinite(r.definitionId))

  const toUpsert = rows.filter((r) => r.value.length > 0)
  const toDelete = rows.filter((r) => r.value.length === 0).map((r) => r.definitionId)

  if (toUpsert.length > 0) {
    const up = await supabase.from('company_parameter_values').upsert(
      toUpsert.map((r) => ({ company_id: companyId, definition_id: r.definitionId, value: r.value })),
      { onConflict: 'company_id,definition_id' },
    )
    if (up.error) throw up.error
  }
  if (toDelete.length > 0) {
    const del = await supabase
      .from('company_parameter_values')
      .delete()
      .eq('company_id', companyId)
      .in('definition_id', toDelete)
    if (del.error) throw del.error
  }
}

export type HighlightInput = { title: string; description: string | null }

// Top-5: pełna wymiana (delete-all + insert ≤5 z sort_order = pozycja).
// Limit 5 egzekwowany przez wołającego; tu twardo przycinamy dla bezpieczeństwa.
export async function saveCompanyHighlights(companyId: string, items: HighlightInput[]): Promise<void> {
  const del = await supabase.from('highlights').delete().eq('company_id', companyId)
  if (del.error) throw del.error

  const clean = items.filter((h) => h.title.trim().length > 0).slice(0, 5)
  if (clean.length > 0) {
    const ins = await supabase.from('highlights').insert(
      clean.map((h, i) => ({
        company_id: companyId,
        title: h.title.trim(),
        description: h.description?.trim() ? h.description.trim() : null,
        sort_order: i,
      })),
    )
    if (ins.error) throw ins.error
  }
}
