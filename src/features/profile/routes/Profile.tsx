import { useEffect, useMemo, useState, type JSX } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  saveCompanyBasics,
  saveCompanyCategories,
  saveCompanyCertificates,
  saveCompanyHighlights,
  saveCompanyParameters,
  useOwnCompany,
  type OwnCompanyData,
  type OwnCompanyDictionaries,
} from '../hooks/use-own-company'
import { useCompanyMedia, type UploadKind } from '@/shared/data/company/use-company-media'
import { saveEmployee, useCompanyEmployees, type EmployeeRow } from '@/shared/data/company/use-company-employees'
import CompanyProfile from '@/shared/components/CompanyProfile'
import type { CompanyProfileData } from '@/shared/data/company/use-company-profile'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'

const MAX_HIGHLIGHTS = 5
const CURRENT_YEAR = new Date().getFullYear()

// Walidacja zgodna z CHECK w bazie: opis ≤600, founding_year 1800..bieżący rok.
// nip/regon/krs — format luźny (pilot, dane ręczne). Puste pola → null.
const emptyToNull = (v: string): string | null => (v.trim() === '' ? null : v.trim())

function makeProfileSchema(t: TFunction) {
  return z.object({
    name: z.string().trim().min(1, t('validation:profile.nameRequired')),
    display_name: z.string(),
    founding_year: z
      .string()
      .refine(
        (v) => v.trim() === '' || /^\d{4}$/.test(v.trim()),
        t('validation:profile.yearFourDigits'),
      )
      .refine((v) => {
        if (v.trim() === '') return true
        const n = Number(v)
        return n >= 1800 && n <= CURRENT_YEAR
      }, t('validation:profile.yearRange', { max: CURRENT_YEAR })),
    description: z.string().max(600, t('validation:profile.descriptionMax')),
    region: z.string(),
    nip: z.string(),
    regon: z.string(),
    krs: z.string(),
    headquarters_address: z.string(),
    plant_address: z.string(),
    website: z.string(),
  })
}

type ProfileFormValues = z.infer<ReturnType<typeof makeProfileSchema>> & {
  categoryIds: number[]
  certificateIds: number[]
  parameters: { definitionId: number; value: string }[]
  highlights: { title: string; description: string }[]
}

function toFormValues(data: OwnCompanyData, dict: OwnCompanyDictionaries): ProfileFormValues {
  return {
    name: data.name,
    display_name: data.display_name ?? '',
    founding_year: data.founding_year != null ? String(data.founding_year) : '',
    description: data.description ?? '',
    region: data.region ?? '',
    nip: data.nip ?? '',
    regon: data.regon ?? '',
    krs: data.krs ?? '',
    headquarters_address: data.headquarters_address ?? '',
    plant_address: data.plant_address ?? '',
    website: data.website ?? '',
    categoryIds: data.categoryIds,
    certificateIds: data.certificateIds,
    parameters: dict.parameterDefinitions.map((def) => ({
      definitionId: def.id,
      value: data.parameterValues[def.id] ?? '',
    })),
    highlights: data.highlights.map((h) => ({ title: h.title, description: h.description ?? '' })),
  }
}

export default function Profile(): JSX.Element {
  const { t } = useTranslation(['profile', 'common', 'validation'])
  const state = useOwnCompany()
  const employeesState = useCompanyEmployees()
  // Domyślnie podgląd (tak jak widzą to klienci); edycję włącza dopiero przycisk.
  const [mode, setMode] = useState<'view' | 'edit'>('view')

  if (state.status === 'loading') {
    return (
      <main className="max-w-[880px] mx-auto px-5 pt-10 pb-18 text-text">
        <div className="h-[320px] rounded-lg bg-border opacity-40 animate-pulse" aria-busy="true" aria-label={t('loadingAria')} />
      </main>
    )
  }

  if (state.status === 'noCompany') {
    return (
      <main className="max-w-[880px] mx-auto px-5 pt-10 pb-18 text-text">
        <div className="text-center px-5 py-18">
          <h1 className="text-heading text-text-strong mb-2">{t('noCompany.title')}</h1>
          <p className="text-text-muted">{t('noCompany.body')}</p>
        </div>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="max-w-[880px] mx-auto px-5 pt-10 pb-18 text-text">
        <div className="text-center px-5 py-18">
          <h1 className="text-heading text-text-strong mb-2">{t('loadError.title')}</h1>
          <p className="text-text-muted">{t('loadError.body')}</p>
        </div>
      </main>
    )
  }

  if (mode === 'view') {
    const employees =
      employeesState.status === 'ready' ? employeesState.employees : []
    return (
      <ProfilePreview
        data={state.data}
        dictionaries={state.dictionaries}
        employees={employees}
        onEdit={() => setMode('edit')}
      />
    )
  }

  return (
    <ProfileForm
      data={state.data}
      dictionaries={state.dictionaries}
      onSaved={() => {
        state.reload()
        employeesState.reload()
      }}
      onBack={() => setMode('view')}
    />
  )
}

type ProfilePreviewProps = {
  data: OwnCompanyData
  dictionaries: OwnCompanyDictionaries
  employees: EmployeeRow[]
  onEdit: () => void
}

// Podgląd własnej wizytówki dokładnie w kształcie, w jakim widzą ją klienci —
// reużywamy publiczny <CompanyProfile/>. Pasek nad podglądem przełącza w edycję.
function ProfilePreview({ data, dictionaries, employees, onEdit }: ProfilePreviewProps): JSX.Element {
  const { t } = useTranslation(['profile', 'common', 'validation'])
  const profile = useMemo(
    () => toCompanyProfileData(data, dictionaries, employees),
    [data, dictionaries, employees],
  )

  return (
    <main className="text-text pb-18">
      {/* Sticky pasek akcji: szklisty (backdrop-blur), przykleja się POD
          nagłówkiem aplikacji (top = wysokość headera), z niższym z-index niż
          header — inaczej zasłaniałby menu konta z „Wyloguj". */}
      <div className="sticky top-[57px] z-[5] -mx-[clamp(1rem,5vw,6rem)] px-[clamp(1rem,5vw,6rem)] border-b border-border/70 bg-bg/70 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 flex-wrap max-w-[1100px] mx-auto py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full bg-surface border border-border pl-2 pr-3 py-1 text-eyebrow uppercase font-medium text-text-muted">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-accent opacity-60 animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-accent" />
              </span>
              {t('preview.badge')}
            </span>
            <p className="text-label text-text-subtle truncate max-sm:hidden">
              {t('preview.hint')}
            </p>
          </div>
          <Button variant="primary" onClick={onEdit} className="gap-2 shadow-sm">
            <PencilIcon />
            {t('preview.edit')}
          </Button>
        </div>
      </div>

      {/* Wizytówka oprawiona w „okno" — zaokrąglona karta z cieniem, żeby podgląd
          czytał się jak osobny ekran, nie surowa treść strony. */}
      <div className="max-w-[1100px] mx-auto mt-6 max-md:mt-4">
        <div className="rounded-xl border border-border bg-surface shadow-md overflow-hidden">
          <CompanyProfile data={profile} />
        </div>
      </div>
    </main>
  )
}

function PencilIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function ArrowLeftIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}

// Adapter OwnCompanyData (kształt edycyjny: płaskie id + mapa parametrów) →
// CompanyProfileData (kształt prezentacyjny: pełne wiersze słownikowe + employees),
// którego oczekuje publiczny <CompanyProfile/>. Tylko transformacja w pamięci,
// bez dodatkowego zapytania — słowniki i pracownicy są już załadowane.
function toCompanyProfileData(
  data: OwnCompanyData,
  dict: OwnCompanyDictionaries,
  employees: EmployeeRow[],
): CompanyProfileData {
  const categories = dict.categories.filter((c) => data.categoryIds.includes(c.id))
  const certificates = dict.certificates.filter((c) => data.certificateIds.includes(c.id))

  const parameters = dict.parameterDefinitions
    .map((definition) => ({ value: data.parameterValues[definition.id] ?? '', definition }))
    .filter((p) => p.value.trim() !== '')
    .sort((a, b) => a.definition.sort_order - b.definition.sort_order)

  return {
    id: data.id,
    name: data.name,
    display_name: data.display_name,
    logo_url: data.logo_url,
    founding_year: data.founding_year,
    description: data.description,
    region: data.region,
    nip: data.nip,
    regon: data.regon,
    krs: data.krs,
    headquarters_address: data.headquarters_address,
    plant_address: data.plant_address,
    website: data.website,
    categories,
    certificates,
    parameters,
    media: data.media,
    highlights: data.highlights,
    // Podgląd pokazuje pracowników tak jak profil publiczny — tylko widocznych.
    employees: employees.filter((e) => e.is_visible_on_profile),
  }
}

type ProfileFormProps = {
  data: OwnCompanyData
  dictionaries: OwnCompanyDictionaries
  onSaved: () => void
  onBack: () => void
}

function ProfileForm({ data, dictionaries, onSaved, onBack }: ProfileFormProps): JSX.Element {
  const { t } = useTranslation(['profile', 'common', 'validation'])
  const companyId = data.id
  const defaults = useMemo(() => toFormValues(data, dictionaries), [data, dictionaries])
  const profileSchema = useMemo(() => makeProfileSchema(t), [t])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    mode: 'onSubmit',
    defaultValues: defaults,
    resolver: async (values) => {
      const parsed = profileSchema.safeParse(values)
      if (parsed.success) return { values: values, errors: {} }
      const fieldErrors: Record<string, { type: string; message: string }> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0]
        if (typeof path === 'string' && !fieldErrors[path]) {
          fieldErrors[path] = { type: issue.code, message: issue.message }
        }
      }
      return { values: {}, errors: fieldErrors }
    },
  })

  // Po przeładowaniu danych (reload po zapisie pivotów/parametrów) odśwież form.
  useEffect(() => {
    reset(defaults)
  }, [defaults, reset])

  const { fields: highlightFields, append, remove } = useFieldArray({ control, name: 'highlights' })

  const selectedCategoryIds = watch('categoryIds')
  const selectedCertificateIds = watch('certificateIds')

  function toggleId(field: 'categoryIds' | 'certificateIds', id: number): void {
    const current = field === 'categoryIds' ? selectedCategoryIds : selectedCertificateIds
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    setValue(field, next, { shouldDirty: true })
  }

  // Pełny zapis: jeden submit zapisuje wszystkie sekcje sekwencyjnie. RLS
  // zapewnia, że dotyczy tylko własnej firmy. Po sukcesie reload danych.
  async function onSubmit(values: ProfileFormValues): Promise<void> {
    try {
      await saveCompanyBasics(companyId, {
        name: values.name.trim(),
        display_name: emptyToNull(values.display_name),
        founding_year: values.founding_year.trim() === '' ? null : Number(values.founding_year),
        description: emptyToNull(values.description),
        region: emptyToNull(values.region),
        nip: emptyToNull(values.nip),
        regon: emptyToNull(values.regon),
        krs: emptyToNull(values.krs),
        headquarters_address: emptyToNull(values.headquarters_address),
        plant_address: emptyToNull(values.plant_address),
        website: emptyToNull(values.website),
      })
      await saveCompanyCategories(companyId, values.categoryIds)
      await saveCompanyCertificates(companyId, values.certificateIds)
      await saveCompanyParameters(
        companyId,
        Object.fromEntries(values.parameters.map((p) => [p.definitionId, p.value])),
      )
      await saveCompanyHighlights(
        companyId,
        values.highlights.map((h) => ({ title: h.title, description: h.description })),
      )
      toast.success(t('form.toast.saved'))
      onSaved()
      onBack() // po zapisie wracamy do podglądu, by pokazać efekt zmian
    } catch {
      toast.error(t('form.toast.saveError'))
    }
  }

  const description = watch('description') ?? ''

  // Definicje pogrupowane po kategorii — pola parametrów renderowane data-driven.
  const paramGroups = useMemo(() => {
    const categoryName = new Map(dictionaries.categories.map((c) => [c.id, c.name]))
    const groups = new Map<number, { label: string; items: { index: number; label: string; unit: string | null; valueType: string }[] }>()
    defaults.parameters.forEach((p, index) => {
      const def = dictionaries.parameterDefinitions.find((d) => d.id === p.definitionId)
      if (!def) return
      let group = groups.get(def.category_id)
      if (!group) {
        group = { label: categoryName.get(def.category_id) ?? 'Parametry', items: [] }
        groups.set(def.category_id, group)
      }
      group.items.push({ index, label: def.label, unit: def.unit, valueType: def.value_type })
    })
    return [...groups.values()]
  }, [defaults.parameters, dictionaries])

  return (
    <main className="text-text pb-18">
      {/* Sticky pasek edycji: spójny ze szklistym paskiem podglądu. Przykleja się
          POD nagłówkiem aplikacji z niższym z-index, by nie zasłaniać menu „Wyloguj".
          Lewa = powrót, prawa = zapis. Przycisk „Zapisz" celuje w <form> po id. */}
      <div className="sticky top-[57px] z-[5] -mx-[clamp(1rem,5vw,6rem)] px-[clamp(1rem,5vw,6rem)] border-b border-border/70 bg-bg/70 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 max-w-[880px] mx-auto py-3.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-label font-medium text-text-muted hover:text-text-strong transition-colors -ml-1 px-1 py-1 rounded-sm"
          >
            <ArrowLeftIcon />
            {t('form.back')}
          </button>
          <Button type="submit" form="profile-form" variant="primary" disabled={isSubmitting} className="shadow-sm">
            {isSubmitting ? t('common:actions.saving') : t('form.save')}
          </Button>
        </div>
      </div>

      <div className="max-w-[880px] mx-auto px-5 pt-8">
        <header className="mb-8">
          <span className="text-eyebrow uppercase font-medium text-accent">{t('form.eyebrow')}</span>
          <h1 className="text-display text-text-strong mt-1.5 mb-2">{t('form.title')}</h1>
          <p className="text-text-muted">{t('form.subtitle')}</p>
        </header>

      <form id="profile-form" className="flex flex-col gap-6" onSubmit={handleSubmit(onSubmit)} noValidate>
        <section className="border border-border rounded-lg p-6 bg-surface">
          <h2 className="text-heading font-semibold text-text-strong mb-4">{t('form.sections.basics')}</h2>
          <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            <Field label={t('form.fields.name')} error={errors.name?.message} required>
              <Input {...register('name')} />
            </Field>
            <Field label={t('form.fields.displayName')}>
              <Input {...register('display_name')} />
            </Field>
            <Field label={t('form.fields.foundingYear')} error={errors.founding_year?.message}>
              <Input inputMode="numeric" {...register('founding_year')} />
            </Field>
            <Field label={t('form.fields.region')}>
              <Input {...register('region')} />
            </Field>
          </div>
          <Field label={t('form.fields.description', { count: description.length })} error={errors.description?.message}>
            <Textarea className="mt-4" rows={5} {...register('description')} />
          </Field>
        </section>

        <section className="border border-border rounded-lg p-6 bg-surface">
          <h2 className="text-heading font-semibold text-text-strong mb-4">{t('form.sections.registry')}</h2>
          <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
            <Field label={t('form.fields.nip')}>
              <Input {...register('nip')} />
            </Field>
            <Field label={t('form.fields.regon')}>
              <Input {...register('regon')} />
            </Field>
            <Field label={t('form.fields.krs')}>
              <Input {...register('krs')} />
            </Field>
            <Field label={t('form.fields.website')}>
              <Input {...register('website')} />
            </Field>
            <Field label={t('form.fields.headquarters')}>
              <Input {...register('headquarters_address')} />
            </Field>
            <Field label={t('form.fields.plant')}>
              <Input {...register('plant_address')} />
            </Field>
          </div>
        </section>

        <section className="border border-border rounded-lg p-6 bg-surface">
          <h2 className="text-heading font-semibold text-text-strong mb-4">{t('form.sections.categories')}</h2>
          <div className="flex flex-wrap gap-2">
            {dictionaries.categories.map((c) => (
              <label
                key={c.id}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 border border-border rounded-sm cursor-pointer text-[0.875rem] select-none',
                  selectedCategoryIds.includes(c.id) && 'bg-accent-bg border-accent text-accent',
                )}
              >
                <input
                  type="checkbox"
                  className="accent-[var(--color-accent)]"
                  checked={selectedCategoryIds.includes(c.id)}
                  onChange={() => toggleId('categoryIds', c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
          <p className="text-[0.8125rem] text-text-subtle mt-3">{t('form.categoriesHint')}</p>
        </section>

        <section className="border border-border rounded-lg p-6 bg-surface">
          <h2 className="text-heading font-semibold text-text-strong mb-4">{t('form.sections.certificates')}</h2>
          <div className="flex flex-wrap gap-2">
            {dictionaries.certificates.map((c) => (
              <label
                key={c.id}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 border border-border rounded-sm cursor-pointer text-[0.875rem] select-none',
                  selectedCertificateIds.includes(c.id) && 'bg-accent-bg border-accent text-accent',
                )}
              >
                <input
                  type="checkbox"
                  className="accent-[var(--color-accent)]"
                  checked={selectedCertificateIds.includes(c.id)}
                  onChange={() => toggleId('certificateIds', c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </section>

        {paramGroups.length > 0 && (
          <section className="border border-border rounded-lg p-6 bg-surface">
            <h2 className="text-heading font-semibold text-text-strong mb-4">{t('form.sections.params')}</h2>
            <p className="text-[0.8125rem] text-text-subtle mt-3">{t('form.paramsHint')}</p>
            {paramGroups.map((group) => (
              <div
                key={group.label}
                className="[&:not(:first-of-type)]:border-t [&:not(:first-of-type)]:border-border [&:not(:first-of-type)]:mt-4"
              >
                <h3 className="text-base font-semibold text-text mt-4 mb-3">{group.label}</h3>
                <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
                  {group.items.map((item) => (
                    <Field key={item.index} label={item.unit ? t('form.paramWithUnit', { label: item.label, unit: item.unit }) : item.label}>
                      <Input
                        inputMode={item.valueType === 'number' ? 'numeric' : undefined}
                        {...register(`parameters.${item.index}.value` as const)}
                      />
                    </Field>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="border border-border rounded-lg p-6 bg-surface">
          <h2 className="text-heading font-semibold text-text-strong mb-4">{t('form.sections.top5')}</h2>
          <ol className="list-none m-0 mb-3 p-0 flex flex-col gap-3">
            {highlightFields.map((field, i) => (
              <li key={field.id} className="flex items-start gap-3">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 flex-1 max-[640px]:grid-cols-1">
                  <Input
                    placeholder={t('form.top5.titlePlaceholder')}
                    {...register(`highlights.${i}.title` as const)}
                  />
                  <Input
                    placeholder={t('form.top5.descriptionPlaceholder')}
                    {...register(`highlights.${i}.description` as const)}
                  />
                </div>
                <Button type="button" variant="ghost" onClick={() => remove(i)}>
                  {t('form.top5.remove')}
                </Button>
              </li>
            ))}
          </ol>
          {highlightFields.length < MAX_HIGHLIGHTS && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => append({ title: '', description: '' })}
            >
              {t('form.top5.add')}
            </Button>
          )}
        </section>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? t('common:actions.saving') : t('form.save')}
          </Button>
        </div>
      </form>

      {/* Media poza <form> — uploady są niezależne (natychmiastowe), więc reload
          po wgraniu nie kasuje niezapisanych zmian tekstowych w formularzu. */}
      <MediaSection
        companyId={companyId}
        logoUrl={data.logo_url}
        media={data.media}
        onChanged={onSaved}
      />

        <EmployeesSection />
      </div>
    </main>
  )
}

function EmployeesSection(): JSX.Element {
  const { t } = useTranslation(['profile', 'common', 'validation'])
  const state = useCompanyEmployees()

  if (state.status === 'loading') {
    return (
      <section className="border border-border rounded-lg p-6 bg-surface">
        <h2 className="text-heading font-semibold text-text-strong mb-4">{t('form.sections.employees')}</h2>
        <p className="text-[0.8125rem] text-text-subtle mt-3">{t('employees.loading')}</p>
      </section>
    )
  }

  if (state.status !== 'ready') {
    return (
      <section className="border border-border rounded-lg p-6 bg-surface">
        <h2 className="text-heading font-semibold text-text-strong mb-4">{t('form.sections.employees')}</h2>
        <p className="text-[0.8125rem] text-text-subtle mt-3">{t('employees.loadError')}</p>
      </section>
    )
  }

  return (
    <section className="border border-border rounded-lg p-6 bg-surface">
      <h2 className="text-heading font-semibold text-text-strong mb-4">{t('form.sections.employees')}</h2>
      <p className="text-[0.8125rem] text-text-subtle mt-3">
        {t('employees.hint')}
      </p>
      <ul className="list-none m-0 p-0 flex flex-col gap-3">
        {state.employees.map((emp) => (
          <EmployeeRowEditor key={emp.id} employee={emp} onSaved={state.reload} />
        ))}
      </ul>
    </section>
  )
}

type EmployeeRowEditorProps = {
  employee: EmployeeRow
  onSaved: () => void
}

function EmployeeRowEditor({ employee, onSaved }: EmployeeRowEditorProps): JSX.Element {
  const { t } = useTranslation(['profile', 'common', 'validation'])
  const [jobTitle, setJobTitle] = useState(employee.job_title)
  const [phone, setPhone] = useState(employee.phone ?? '')
  const [visible, setVisible] = useState(employee.is_visible_on_profile)
  const [saving, setSaving] = useState(false)

  const dirty =
    jobTitle !== employee.job_title ||
    phone !== (employee.phone ?? '') ||
    visible !== employee.is_visible_on_profile

  async function onSave(): Promise<void> {
    if (jobTitle.trim() === '') {
      toast.error(t('employees.toast.jobTitleEmpty'))
      return
    }
    setSaving(true)
    try {
      await saveEmployee(employee.id, { job_title: jobTitle, phone, is_visible_on_profile: visible })
      toast.success(t('employees.toast.saved'))
      onSaved()
    } catch {
      toast.error(t('employees.toast.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="flex items-end gap-3 flex-wrap p-3 border border-border rounded-md">
      <div className="font-semibold text-text-strong basis-full">{employee.full_name}</div>
      <div className="flex items-center gap-3 flex-wrap flex-1">
        <Input
          className="flex-1 min-w-[140px]"
          placeholder={t('employees.jobTitlePlaceholder')}
          value={jobTitle}
          onChange={(e) => setJobTitle(e.currentTarget.value)}
        />
        <Input
          className="flex-1 min-w-[140px]"
          placeholder={t('employees.phonePlaceholder')}
          value={phone}
          onChange={(e) => setPhone(e.currentTarget.value)}
        />
        <label className="inline-flex items-center gap-2 text-[0.875rem] whitespace-nowrap">
          <input
            type="checkbox"
            className="accent-[var(--color-accent)]"
            checked={visible}
            onChange={(e) => setVisible(e.currentTarget.checked)}
          />
          {t('employees.visible')}
        </label>
      </div>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={() => void onSave()}
        disabled={saving || !dirty}
      >
        {saving ? t('common:actions.saving') : t('employees.save')}
      </Button>
    </li>
  )
}

type MediaSectionProps = {
  companyId: string
  logoUrl: string | null
  media: OwnCompanyData['media']
  onChanged: () => void
}

function MediaSection({ companyId, logoUrl, media, onChanged }: MediaSectionProps): JSX.Element {
  const { t } = useTranslation(['profile', 'common', 'validation'])
  const { uploading, upload, remove, removeLogo, error } = useCompanyMedia(companyId)

  const photos = media.filter((m) => m.media_type === 'PHOTO')
  const documents = media.filter((m) => m.media_type === 'DOCUMENT')

  async function onPick(kind: UploadKind, currentCount: number, input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0]
    input.value = '' // pozwól ponownie wybrać ten sam plik
    if (!file) return
    const ok = await upload(kind, file, currentCount)
    if (ok) {
      toast.success(t('media.toast.uploaded'))
      onChanged()
    }
  }

  async function onRemove(media: OwnCompanyData['media'][number]): Promise<void> {
    const ok = await remove(media)
    if (ok) {
      toast.success(t('media.toast.removed'))
      onChanged()
    }
  }

  async function onRemoveLogo(): Promise<void> {
    const ok = await removeLogo(logoUrl)
    if (ok) {
      toast.success(t('media.toast.logoRemoved'))
      onChanged()
    }
  }

  return (
    <section className="border border-border rounded-lg p-6 bg-surface">
      <h2 className="text-heading font-semibold text-text-strong mb-4">{t('form.sections.media')}</h2>
      {error && <p className="text-[0.8125rem] text-error">{error}</p>}

      <div className="[&:not(:first-of-type)]:border-t [&:not(:first-of-type)]:border-border [&:not(:first-of-type)]:mt-4 [&:not(:first-of-type)]:pt-4">
        <h3 className="text-base font-semibold text-text mt-4 mb-3">{t('media.logo')}</h3>
        <div className="flex items-center gap-4 mb-3">
          {logoUrl ? (
            <>
              <img src={logoUrl} alt={t('media.logoAlt')} className="size-16 object-contain border border-border rounded-md bg-bg" />
              <Button type="button" variant="ghost" onClick={onRemoveLogo} disabled={uploading}>
                {t('media.removeLogo')}
              </Button>
            </>
          ) : (
            <span className="text-[0.8125rem] text-text-subtle mt-3">{t('media.noLogo')}</span>
          )}
        </div>
        <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer text-[0.875rem] text-accent">
          <span>{logoUrl ? t('media.changeLogo') : t('media.uploadLogo')}</span>
          <input
            type="file"
            className="text-[0.8125rem] max-w-[200px]"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            onChange={(e) => void onPick('logo', 0, e.currentTarget)}
          />
        </label>
      </div>

      <div className="[&:not(:first-of-type)]:border-t [&:not(:first-of-type)]:border-border [&:not(:first-of-type)]:mt-4 [&:not(:first-of-type)]:pt-4">
        <h3 className="text-base font-semibold text-text mt-4 mb-3">{t('media.gallery', { count: photos.length })}</h3>
        {photos.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 mb-3">
            {photos.map((p) => (
              <figure key={p.id} className="flex flex-col gap-2">
                <img src={p.file_url} alt={p.file_name ?? t('media.photoAlt')} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-md border border-border" />
                <Button type="button" variant="ghost" size="sm" onClick={() => void onRemove(p)} disabled={uploading}>
                  {t('media.remove')}
                </Button>
              </figure>
            ))}
          </div>
        )}
        {photos.length < 5 && (
          <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer text-[0.875rem] text-accent">
            <span>{t('media.addPhoto')}</span>
            <input
              type="file"
              className="text-[0.8125rem] max-w-[200px]"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              onChange={(e) => void onPick('photo', photos.length, e.currentTarget)}
            />
          </label>
        )}
      </div>

      <div className="[&:not(:first-of-type)]:border-t [&:not(:first-of-type)]:border-border [&:not(:first-of-type)]:mt-4 [&:not(:first-of-type)]:pt-4">
        <h3 className="text-base font-semibold text-text mt-4 mb-3">{t('media.documents', { count: documents.length })}</h3>
        {documents.length > 0 && (
          <ul className="list-none m-0 mb-3 p-0 flex flex-col gap-2">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 border border-border rounded-md">
                <a href={d.file_url} target="_blank" rel="noreferrer">
                  {d.file_name ?? t('media.docFallback')}
                </a>
                <Button type="button" variant="ghost" size="sm" onClick={() => void onRemove(d)} disabled={uploading}>
                  {t('media.remove')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {documents.length < 5 && (
          <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-md cursor-pointer text-[0.875rem] text-accent">
            <span>{t('media.addPdf')}</span>
            <input
              type="file"
              className="text-[0.8125rem] max-w-[200px]"
              accept="application/pdf"
              disabled={uploading}
              onChange={(e) => void onPick('document', documents.length, e.currentTarget)}
            />
          </label>
        )}
      </div>
    </section>
  )
}

type FieldProps = {
  label: string
  error?: string
  required?: boolean
  children: JSX.Element
}

function Field({ label, error, required, children }: FieldProps): JSX.Element {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-eyebrow text-text-muted font-medium">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      {children}
      {error && <span className="text-[0.8125rem] text-error">{error}</span>}
    </label>
  )
}
