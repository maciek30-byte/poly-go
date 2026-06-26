import { useEffect, useMemo, type JSX } from 'react'
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
} from '../lib/use-own-company'
import './Profile.css'

const MAX_HIGHLIGHTS = 5
const CURRENT_YEAR = new Date().getFullYear()

// Walidacja zgodna z CHECK w bazie: opis ≤600, founding_year 1800..bieżący rok.
// nip/regon/krs — format luźny (pilot, dane ręczne). Puste pola → null.
const emptyToNull = (v: string): string | null => (v.trim() === '' ? null : v.trim())

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Nazwa firmy jest wymagana.'),
  display_name: z.string(),
  founding_year: z
    .string()
    .refine(
      (v) => v.trim() === '' || /^\d{4}$/.test(v.trim()),
      'Rok musi być czterocyfrowy.',
    )
    .refine((v) => {
      if (v.trim() === '') return true
      const n = Number(v)
      return n >= 1800 && n <= CURRENT_YEAR
    }, `Rok musi być w zakresie 1800–${CURRENT_YEAR}.`),
  description: z.string().max(600, 'Opis może mieć maks. 600 znaków.'),
  region: z.string(),
  nip: z.string(),
  regon: z.string(),
  krs: z.string(),
  headquarters_address: z.string(),
  plant_address: z.string(),
  website: z.string(),
})

type ProfileFormValues = z.infer<typeof profileSchema> & {
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
  const state = useOwnCompany()

  if (state.status === 'loading') {
    return (
      <main className="pf">
        <div className="pf__skeleton" aria-busy="true" aria-label="Ładowanie wizytówki" />
      </main>
    )
  }

  if (state.status === 'noCompany') {
    return (
      <main className="pf">
        <div className="pf__empty">
          <h1>Brak przypisanej firmy</h1>
          <p>Twoje konto nie jest jeszcze powiązane z żadną firmą. Skontaktuj się z operatorem.</p>
        </div>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="pf">
        <div className="pf__empty">
          <h1>Nie udało się wczytać wizytówki</h1>
          <p>Spróbuj odświeżyć stronę.</p>
        </div>
      </main>
    )
  }

  return <ProfileForm data={state.data} dictionaries={state.dictionaries} onSaved={state.reload} />
}

type ProfileFormProps = {
  data: OwnCompanyData
  dictionaries: OwnCompanyDictionaries
  onSaved: () => void
}

function ProfileForm({ data, dictionaries, onSaved }: ProfileFormProps): JSX.Element {
  const companyId = data.id
  const defaults = useMemo(() => toFormValues(data, dictionaries), [data, dictionaries])

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
      toast.success('Wizytówka zapisana.')
      onSaved()
    } catch {
      toast.error('Nie udało się zapisać wizytówki. Spróbuj ponownie.')
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
    <main className="pf">
      <header className="pf__head">
        <h1>Twoja wizytówka</h1>
        <p>Edytuj dane swojej firmy. Zmiany są widoczne na profilu publicznym.</p>
      </header>

      <form className="pf__form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <section className="pf__section">
          <h2>Dane podstawowe</h2>
          <div className="pf__grid">
            <Field label="Nazwa rejestrowa" error={errors.name?.message} required>
              <input className="pf__input" {...register('name')} />
            </Field>
            <Field label="Nazwa wyświetlana">
              <input className="pf__input" {...register('display_name')} />
            </Field>
            <Field label="Rok założenia" error={errors.founding_year?.message}>
              <input className="pf__input" inputMode="numeric" {...register('founding_year')} />
            </Field>
            <Field label="Region / województwo">
              <input className="pf__input" {...register('region')} />
            </Field>
          </div>
          <Field label={`Opis firmy (${description.length}/600)`} error={errors.description?.message}>
            <textarea className="pf__textarea" rows={5} {...register('description')} />
          </Field>
        </section>

        <section className="pf__section">
          <h2>Dane rejestrowe</h2>
          <div className="pf__grid">
            <Field label="NIP">
              <input className="pf__input" {...register('nip')} />
            </Field>
            <Field label="REGON">
              <input className="pf__input" {...register('regon')} />
            </Field>
            <Field label="KRS">
              <input className="pf__input" {...register('krs')} />
            </Field>
            <Field label="Strona WWW">
              <input className="pf__input" {...register('website')} />
            </Field>
            <Field label="Adres siedziby">
              <input className="pf__input" {...register('headquarters_address')} />
            </Field>
            <Field label="Adres zakładu / produkcji">
              <input className="pf__input" {...register('plant_address')} />
            </Field>
          </div>
        </section>

        <section className="pf__section">
          <h2>Kategorie działalności</h2>
          <div className="pf__chips">
            {dictionaries.categories.map((c) => (
              <label key={c.id} className={`pf__chip ${selectedCategoryIds.includes(c.id) ? 'is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedCategoryIds.includes(c.id)}
                  onChange={() => toggleId('categoryIds', c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
          <p className="pf__hint">Zmiana kategorii zmienia zestaw dostępnych parametrów po zapisaniu.</p>
        </section>

        <section className="pf__section">
          <h2>Certyfikaty</h2>
          <div className="pf__chips">
            {dictionaries.certificates.map((c) => (
              <label key={c.id} className={`pf__chip ${selectedCertificateIds.includes(c.id) ? 'is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={selectedCertificateIds.includes(c.id)}
                  onChange={() => toggleId('certificateIds', c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </section>

        {paramGroups.length > 0 && (
          <section className="pf__section">
            <h2>Parametry techniczne</h2>
            <p className="pf__hint">Pola zależne od wybranych kategorii.</p>
            {paramGroups.map((group) => (
              <div key={group.label} className="pf__param-group">
                <h3>{group.label}</h3>
                <div className="pf__grid">
                  {group.items.map((item) => (
                    <Field key={item.index} label={item.unit ? `${item.label} [${item.unit}]` : item.label}>
                      <input
                        className="pf__input"
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

        <section className="pf__section">
          <h2>Czym się zajmujemy (Top-5)</h2>
          <ol className="pf__highlights">
            {highlightFields.map((field, i) => (
              <li key={field.id} className="pf__highlight">
                <div className="pf__highlight-fields">
                  <input
                    className="pf__input"
                    placeholder="Tytuł"
                    {...register(`highlights.${i}.title` as const)}
                  />
                  <input
                    className="pf__input"
                    placeholder="Opis (opcjonalny)"
                    {...register(`highlights.${i}.description` as const)}
                  />
                </div>
                <button type="button" className="pf__btn pf__btn--ghost" onClick={() => remove(i)}>
                  Usuń
                </button>
              </li>
            ))}
          </ol>
          {highlightFields.length < MAX_HIGHLIGHTS && (
            <button
              type="button"
              className="pf__btn pf__btn--ghost"
              onClick={() => append({ title: '', description: '' })}
            >
              + Dodaj pozycję
            </button>
          )}
        </section>

        <div className="pf__actions">
          <button type="submit" className="pf__btn pf__btn--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Zapisywanie…' : 'Zapisz wizytówkę'}
          </button>
        </div>
      </form>
    </main>
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
    <label className="pf__field">
      <span className="pf__label">
        {label}
        {required && <span className="pf__req"> *</span>}
      </span>
      {children}
      {error && <span className="pf__error">{error}</span>}
    </label>
  )
}
