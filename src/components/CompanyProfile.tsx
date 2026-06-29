import { useMemo, useState, type JSX } from 'react'
import * as Avatar from '@radix-ui/react-avatar'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { CompanyProfileData } from '../lib/use-company-profile'
import { useFavorite } from '../lib/use-favorite'
import { MessageDrawerPlaceholder, type MessageTarget } from './MessageDrawerPlaceholder'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Dane rejestrowe ukryte w demo (kolumny istnieją, integracja GUS/KRS poza zakresem).
const SHOW_REGISTRY = false

type CategoryTone = 'producer' | 'recycler' | 'distributor' | 'service'

// Mapowanie nazwy kategorii (słownik) na ton wizualny. Słownik jest mały
// i stabilny (Producent/Recykler/Dystrybutor/Trader/Serwis) — to prezentacja,
// nie logika branżowa, więc nie łamie zasady "parametry data-driven".
function toneForCategory(name: string): CategoryTone {
  switch (name) {
    case 'Producent':
      return 'producer'
    case 'Recykler':
      return 'recycler'
    case 'Dystrybutor':
    case 'Trader':
      return 'distributor'
    case 'Serwis':
    default:
      return 'service'
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

// Per-ton override koloru kropki (::before) — odpowiednik .cp-tag-*::before.
const tagDotClass: Record<CategoryTone, string> = {
  producer: 'before:bg-[var(--color-dot-producer)]',
  recycler: 'before:bg-[var(--color-dot-recycler)]',
  distributor: 'before:bg-[var(--color-dot-distributor)]',
  service: 'before:bg-[var(--color-dot-service)]',
}

function ChatIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function StarIcon({ filled }: { filled: boolean }): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function DownloadIcon(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CheckIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

type CompanyProfileProps = {
  data: CompanyProfileData
}

// Grupa parametrów = jedna kategoria firmy. Render generyczny: label: value [unit].
type ParamGroup = { categoryId: number; label: string; rows: { label: string; display: string }[] }

export default function CompanyProfile({ data }: CompanyProfileProps): JSX.Element {
  const { isFavorite, toggle: toggleFavorite, pending: favoritePending } = useFavorite(data.id)
  const [messageTarget, setMessageTarget] = useState<MessageTarget | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const heroName = data.display_name ?? data.name

  const photos = useMemo(() => data.media.filter((m) => m.media_type === 'PHOTO'), [data.media])
  const documents = useMemo(() => data.media.filter((m) => m.media_type === 'DOCUMENT'), [data.media])

  // Parametry grupowane po kategorii definicji. Nazwa grupy z słownika kategorii
  // firmy; definicje przyjeżdżają już posortowane wg sort_order z hooka.
  const paramGroups = useMemo<ParamGroup[]>(() => {
    const categoryName = new Map(data.categories.map((c) => [c.id, c.name]))
    const byCategory = new Map<number, ParamGroup>()
    for (const { value, definition } of data.parameters) {
      const catId = definition.category_id
      let group = byCategory.get(catId)
      if (!group) {
        group = { categoryId: catId, label: categoryName.get(catId) ?? 'Parametry', rows: [] }
        byCategory.set(catId, group)
      }
      const display = definition.unit ? `${value} ${definition.unit}` : value
      group.rows.push({ label: definition.label, display })
    }
    return [...byCategory.values()]
  }, [data.categories, data.parameters])

  const hasHighlights = data.highlights.length > 0
  const hasDescription = Boolean(data.description)
  const hasParams = paramGroups.length > 0
  const hasPhotos = photos.length > 0
  const hasDocuments = documents.length > 0
  const hasEmployees = data.employees.length > 0

  // Kotwice tylko dla realnych, niepustych sekcji.
  const anchors = useMemo(() => {
    const out: { id: string; label: string }[] = []
    if (hasHighlights) out.push({ id: 'oferta', label: 'Oferta' })
    if (hasDescription) out.push({ id: 'opis', label: 'O firmie' })
    if (hasParams) out.push({ id: 'parametry', label: 'Parametry' })
    if (hasPhotos) out.push({ id: 'galeria', label: 'Galeria' })
    if (hasDocuments) out.push({ id: 'dokumenty', label: 'Dokumenty' })
    if (hasEmployees) out.push({ id: 'pracownicy', label: 'Pracownicy' })
    return out
  }, [hasHighlights, hasDescription, hasParams, hasPhotos, hasDocuments, hasEmployees])

  function openMessage(target: MessageTarget): void {
    setMessageTarget(target)
    setDrawerOpen(true)
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="text-left text-text pb-18">
        <header className="border-b border-border px-10 pt-10 max-md:px-5 max-md:pt-6">
          <div className="grid grid-cols-[auto_1fr_auto] gap-8 items-start max-md:grid-cols-[auto_1fr] max-md:gap-4">
            <Avatar.Root className="size-20 rounded-xl overflow-hidden bg-brand grid place-items-center shadow-brand max-md:size-15 max-md:rounded-xl">
              {data.logo_url && <Avatar.Image className="size-full object-cover" src={data.logo_url} alt={heroName} />}
              <Avatar.Fallback className="text-white font-bold text-[22px] tracking-[-0.02em] max-md:text-[18px]">{initials(heroName)}</Avatar.Fallback>
            </Avatar.Root>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-eyebrow uppercase text-text-muted mb-3 flex-wrap">
                {data.founding_year != null && (
                  <span className="font-medium">założono {data.founding_year}</span>
                )}
                {data.founding_year != null && data.region && <span className="text-text-subtle -mx-0.5">·</span>}
                {data.region && <span className="font-medium">{data.region}</span>}
              </div>

              <h1 className="text-display text-text-strong mb-4 max-md:text-[24px]">{heroName}</h1>

              {data.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {data.categories.map((c) => (
                    <span
                      key={c.id}
                      className={cn(
                        "inline-flex items-center gap-1.5 pl-2 pr-2.5 py-[3px] rounded-sm text-label font-medium bg-surface border border-border text-text before:content-[''] before:size-1.5 before:rounded-full before:bg-text-muted before:shrink-0",
                        tagDotClass[toneForCategory(c.name)],
                      )}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}

              {data.certificates.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.certificates.map((cert) => (
                    <span
                      key={cert.id}
                      className="inline-flex items-center gap-1.5 pl-[7px] pr-[9px] py-0.5 rounded-sm bg-bg border border-border text-label font-medium text-text-muted cursor-default [&_svg]:text-accent [&_svg]:opacity-90"
                    >
                      <CheckIcon />
                      {cert.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 min-w-[200px] max-md:col-span-full max-md:flex-row max-md:min-w-0 max-md:mt-1">
              <Button
                variant="primary"
                className="max-md:flex-1"
                onClick={() => openMessage({ name: heroName, role: 'Firma' })}
              >
                <ChatIcon />
                Napisz
              </Button>
              <Button
                variant="ghost"
                className={cn('max-md:flex-1', isFavorite && 'bg-accent-bg border-accent-border text-accent')}
                onClick={toggleFavorite}
                disabled={favoritePending}
                aria-pressed={isFavorite}
              >
                <StarIcon filled={isFavorite} />
                {isFavorite ? 'W ulubionych' : 'Dodaj do ulubionych'}
              </Button>
            </div>
          </div>

          {anchors.length > 0 && (
            <nav
              className="flex gap-1 mt-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Sekcje profilu"
            >
              {anchors.map((a) => (
                <a
                  key={a.id}
                  href={`#${a.id}`}
                  className="px-3.5 py-2.5 text-body font-medium text-text-muted no-underline border-b-2 border-transparent -mb-px whitespace-nowrap transition-colors hover:text-text-strong"
                >
                  {a.label}
                </a>
              ))}
            </nav>
          )}
        </header>

        <div className="px-10 pt-10 max-md:px-5 max-md:pt-6">
          {hasHighlights && (
            <section id="oferta" className="mb-14 scroll-mt-6">
              <div className="mb-5 pb-4 border-b border-border">
                <h2 className="text-heading text-text-strong mb-1">Czym się zajmujemy</h2>
                <p className="text-value text-text-muted">Najważniejsze rzeczy, które firma chce pokazać partnerom.</p>
              </div>
              <ol className="grid">
                {data.highlights.map((h, i) => (
                  <li key={h.id} className="grid grid-cols-[32px_1fr] gap-4 items-start py-4 border-b border-border last:border-b-0">
                    <span className="font-mono text-label text-text-subtle font-medium pt-[3px] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3 className="text-body font-semibold text-text-strong mb-0.5 tracking-[-0.005em]">{h.title}</h3>
                      {h.description && <p className="text-value text-text-muted">{h.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {hasDescription && (
            <section id="opis" className="mb-14 scroll-mt-6">
              <div className="mb-5 pb-4 border-b border-border">
                <h2 className="text-heading text-text-strong mb-1">O firmie</h2>
              </div>
              <p className="text-[15px] leading-[1.7] text-text max-w-[68ch]">{data.description}</p>
            </section>
          )}

          {hasParams && (
            <section id="parametry" className="mb-14 scroll-mt-6">
              <div className="mb-5 pb-4 border-b border-border">
                <h2 className="text-heading text-text-strong mb-1">Parametry techniczne</h2>
                <p className="text-value text-text-muted">Pola strukturyzowane zależne od kategorii działalności.</p>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
                {paramGroups.map((group) => (
                  <div key={group.categoryId} className="border border-border rounded-lg p-5 bg-bg">
                    <h3 className="text-eyebrow uppercase text-text-muted mb-4">{group.label}</h3>
                    <dl className="grid gap-3">
                      {group.rows.map((r) => (
                        <div key={r.label} className="grid grid-cols-[130px_1fr] gap-3 items-baseline max-[480px]:grid-cols-1 max-[480px]:gap-0.5">
                          <dt className="text-text-muted text-label">{r.label}</dt>
                          <dd className="text-text-strong font-medium text-value">{r.display}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          )}

          {hasPhotos && (
            <section id="galeria" className="mb-14 scroll-mt-6">
              <div className="mb-5 pb-4 border-b border-border">
                <h2 className="text-heading text-text-strong mb-1">Galeria</h2>
                <p className="text-value text-text-muted">Hala produkcyjna, maszyny, magazyn.</p>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
                {photos.map((p) => (
                  <figure key={p.id} className="aspect-[4/3] rounded-md overflow-hidden bg-surface border border-border">
                    <img className="size-full object-cover block" src={p.file_url} alt={p.file_name ?? heroName} loading="lazy" />
                  </figure>
                ))}
              </div>
            </section>
          )}

          {hasDocuments && (
            <section id="dokumenty" className="mb-14 scroll-mt-6">
              <div className="mb-5 pb-4 border-b border-border">
                <h2 className="text-heading text-text-strong mb-1">Dokumenty do pobrania</h2>
                <p className="text-value text-text-muted">PDF, do 10 MB każdy.</p>
              </div>
              <ul className="grid gap-2">
                {documents.map((d) => (
                  <li key={d.id} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center px-4 py-3 border border-border rounded-md bg-bg transition-colors hover:border-border-strong hover:bg-surface">
                    <span className="size-9 rounded-md bg-surface text-text-muted border border-border grid place-items-center text-eyebrow font-bold tracking-[0.04em]">PDF</span>
                    <div className="flex flex-col gap-px min-w-0">
                      <span className="text-body font-medium text-text-strong truncate tracking-[-0.005em]">{d.file_name ?? 'Dokument'}</span>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <a href={d.file_url} target="_blank" rel="noreferrer">
                        <DownloadIcon />
                        Pobierz
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {SHOW_REGISTRY && (
            <section id="dane" className="mb-14 scroll-mt-6">
              <div className="mb-5 pb-4 border-b border-border">
                <h2 className="text-heading text-text-strong mb-1">Dane rejestrowe</h2>
                <p className="text-value text-text-muted">Twarde dane firmy — gotowe do skopiowania do systemu ERP / na fakturę.</p>
              </div>
              <div className="border border-border rounded-lg overflow-hidden bg-bg">
                {([
                  ['Nazwa rejestrowa', data.name],
                  ['NIP', data.nip],
                  ['REGON', data.regon],
                  ['KRS', data.krs],
                  ['Siedziba', data.headquarters_address],
                  ['Adres produkcji', data.plant_address],
                  ['Strona WWW', data.website],
                ] as const)
                  .filter(([, v]) => Boolean(v))
                  .map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[200px_1fr] gap-6 px-5 py-3 border-b border-border items-baseline last:border-b-0 hover:bg-surface max-[600px]:grid-cols-1 max-[600px]:gap-0.5">
                      <span className="text-text-muted text-label">{k}</span>
                      <span className="text-text-strong font-medium text-value tracking-[-0.003em]">{v}</span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {hasEmployees && (
            <section id="pracownicy" className="mb-14 scroll-mt-6">
              <div className="mb-5 pb-4 border-b border-border">
                <h2 className="text-heading text-text-strong mb-1">Pracownicy</h2>
                <p className="text-value text-text-muted">Kliknij „Napisz", aby otworzyć komunikator 1:1.</p>
              </div>
              <ul className="grid gap-2">
                {data.employees.map((e) => (
                  <li key={e.id} className="grid grid-cols-[auto_1fr_auto] gap-4 items-center px-5 py-4 border border-border rounded-lg bg-bg transition-colors hover:border-border-strong hover:bg-surface max-[600px]:grid-cols-[auto_1fr]">
                    <Avatar.Root className="relative size-10 rounded-full bg-avatar grid place-items-center shrink-0">
                      <Avatar.Fallback className="text-white text-label font-semibold tracking-[-0.01em]">{initials(e.full_name)}</Avatar.Fallback>
                    </Avatar.Root>
                    <div className="min-w-0">
                      <div className="text-body font-semibold text-text-strong mb-px tracking-[-0.005em]">{e.full_name}</div>
                      <div className="text-label text-text-muted mb-1">{e.job_title}</div>
                      {e.phone && (
                        <div className="text-label text-text-muted flex gap-1.5 flex-wrap">
                          <span>{e.phone}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="max-[600px]:col-span-full"
                      onClick={() => openMessage({ name: e.full_name, role: e.job_title })}
                    >
                      <ChatIcon />
                      Napisz
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <MessageDrawerPlaceholder open={drawerOpen} onOpenChange={setDrawerOpen} target={messageTarget} />
      </div>
    </Tooltip.Provider>
  )
}
