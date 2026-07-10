import { useMemo, useState, type JSX } from 'react'
import * as Avatar from '@radix-ui/react-avatar'
import { useTranslation } from 'react-i18next'
import type { CompanyProfileData } from '@/shared/data/company/use-company-profile'
import { useFavorite } from '@/shared/data/favorites/use-favorite'
import { MessageDrawerPlaceholder, type MessageTarget } from './MessageDrawerPlaceholder'
import { Button } from '@/shared/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import { cn } from '@/shared/lib/utils'

// Dane rejestrowe ukryte w demo (kolumny istnieją, integracja GUS/KRS poza zakresem).
// W układzie co-ecoplas dane rejestrowe mają własny tab — pokazujemy pola,
// które faktycznie mamy w bazie (renderujemy tylko niepuste).
const SHOW_REGISTRY = true

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function ChatIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function StarIcon({ filled }: { filled: boolean }): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function DownloadIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

// Ikona weryfikacyjna certyfikatu (checkmark), zielona jak w mockupie.
function CheckIcon(): JSX.Element {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PinIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function CalendarIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function UsersIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function GlobeIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function ImagePlaceholderIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-text-muted">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function FileIcon(): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

type CompanyProfileProps = {
  data: CompanyProfileData
}

// Wiersz sekcji „O firmie" — KPI. Tylko wartości pokryte danymi.
type Kpi = { label: string; value: string }

export default function CompanyProfile({ data }: CompanyProfileProps): JSX.Element {
  const { t } = useTranslation(['company', 'common'])
  const { isFavorite, toggle: toggleFavorite, pending: favoritePending } = useFavorite(data.id)
  const [messageTarget, setMessageTarget] = useState<MessageTarget | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const heroName = data.display_name ?? data.name

  const photos = useMemo(() => data.media.filter((m) => m.media_type === 'PHOTO'), [data.media])
  const documents = useMemo(() => data.media.filter((m) => m.media_type === 'DOCUMENT'), [data.media])

  // Parametry spłaszczone do siatki 2-kolumnowej (mockup .param-grid/.param-cell):
  // label = etykieta definicji, value = wartość + jednostka.
  const paramCells = useMemo(
    () =>
      data.parameters.map(({ value, definition }) => ({
        key: definition.id,
        label: definition.label,
        value: definition.unit ? `${value} ${definition.unit}` : value,
      })),
    [data.parameters],
  )

  const hasHighlights = data.highlights.length > 0
  const hasDescription = Boolean(data.description)
  const hasParams = paramCells.length > 0
  const hasPhotos = photos.length > 0
  const hasDocuments = documents.length > 0
  const hasEmployees = data.employees.length > 0

  // KPI „O firmie" — tylko realne dane (rok / pracownicy / region).
  const kpis = useMemo<Kpi[]>(() => {
    const out: Kpi[] = []
    if (data.founding_year != null) out.push({ label: t('about.kpiFounded'), value: String(data.founding_year) })
    if (hasEmployees) out.push({ label: t('about.kpiEmployees'), value: String(data.employees.length) })
    if (data.region) out.push({ label: t('about.kpiLocation'), value: data.region })
    return out
  }, [t, data.founding_year, data.region, data.employees.length, hasEmployees])

  const hasAboutSection = hasDescription || kpis.length > 0

  // Dane rejestrowe (tab „Dane rejestrowe") — pary pokazywane, gdy niepuste.
  const registryIdentity = ([
    [t('registry.fields.fullName'), data.name],
    [t('registry.fields.nip'), data.nip],
    [t('registry.fields.regon'), data.regon],
    [t('registry.fields.krs'), data.krs],
  ] as const).filter(([, v]) => Boolean(v))

  const registryAddress = ([
    [t('registry.fields.headquarters'), data.headquarters_address],
    [t('registry.fields.plant'), data.plant_address],
    [t('registry.fields.region'), data.region],
    [t('registry.fields.website'), data.website],
  ] as const).filter(([, v]) => Boolean(v))

  const hasRegistry = SHOW_REGISTRY && (registryIdentity.length > 0 || registryAddress.length > 0)

  // Kotwice tylko dla realnych, niepustych sekcji taba „Profil".
  const anchors = useMemo(() => {
    const out: { id: string; label: string }[] = []
    if (hasAboutSection) out.push({ id: 'o-firmie', label: t('anchors.about') })
    if (hasHighlights) out.push({ id: 'top5', label: t('anchors.top5') })
    if (hasParams) out.push({ id: 'parametry', label: t('anchors.params') })
    if (hasPhotos) out.push({ id: 'galeria', label: t('anchors.gallery') })
    if (hasDocuments) out.push({ id: 'dokumenty', label: t('anchors.documents') })
    return out
  }, [t, hasAboutSection, hasHighlights, hasParams, hasPhotos, hasDocuments])

  function openMessage(target: MessageTarget): void {
    setMessageTarget(target)
    setDrawerOpen(true)
  }

  return (
    <div className="text-left text-text pb-16">
        {/* ── HERO (.co-hero) ── */}
        <div className="bg-bg border-b-2 border-border">
          <div className="flex items-start gap-5 px-7 py-6 max-md:flex-wrap max-md:px-5 max-md:py-5">
            <Avatar.Root className="size-18 shrink-0 rounded-md overflow-hidden bg-brand grid place-items-center shadow-brand max-md:size-14">
              {data.logo_url && <Avatar.Image className="size-full object-cover" src={data.logo_url} alt={heroName} />}
              <Avatar.Fallback className="text-white font-semibold text-[18px] tracking-[0.04em]">{initials(heroName)}</Avatar.Fallback>
            </Avatar.Root>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h1 className="text-display text-text-strong">{heroName}</h1>
              </div>

              <div className="flex items-center gap-3.5 flex-wrap mb-2.5 text-label text-text-muted [&_svg]:size-3 [&_svg]:shrink-0">
                {data.region && (
                  <span className="inline-flex items-center gap-1">
                    <PinIcon />
                    {data.region}
                  </span>
                )}
                {data.founding_year != null && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon />
                    {t('hero.foundedShort', { year: data.founding_year })}
                  </span>
                )}
                {hasEmployees && (
                  <span className="inline-flex items-center gap-1">
                    <UsersIcon />
                    {t('hero.employeesCount', { count: data.employees.length })}
                  </span>
                )}
                {data.website && (
                  <span className="inline-flex items-center gap-1">
                    <GlobeIcon />
                    <a
                      href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline underline-offset-2"
                    >
                      {data.website.replace(/^https?:\/\//, '')}
                    </a>
                  </span>
                )}
              </div>

              {data.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.categories.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-accent-bg border border-accent-border text-accent whitespace-nowrap"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0 pt-1 max-md:w-full max-md:items-stretch">
              <div className="flex gap-2 max-md:w-full">
                <Button
                  variant="primary"
                  className="max-md:flex-1"
                  onClick={() => openMessage({ name: heroName, role: t('messageTargetCompany') })}
                >
                  <ChatIcon />
                  {t('common:actions.write')}
                </Button>
              </div>
              <button
                type="button"
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] cursor-pointer transition-colors py-1 bg-transparent border-none',
                  isFavorite ? 'text-accent' : 'text-text-muted hover:text-[hsl(38_65%_44%)]',
                )}
                onClick={toggleFavorite}
                disabled={favoritePending}
                aria-pressed={isFavorite}
              >
                <StarIcon filled={isFavorite} />
                {isFavorite ? t('hero.favoriteActive') : t('hero.favoriteAdd')}
              </button>
            </div>
          </div>

          {/* Cert strip (.co-certs) */}
          {data.certificates.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap border-t border-border px-7 py-2.5 max-md:px-5">
              <span className="text-eyebrow uppercase text-text-muted mr-1">{t('hero.certsLabel')}</span>
              {data.certificates.map((cert) => (
                <span
                  key={cert.id}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-[3px] text-[11px] font-medium border border-border bg-bg text-text [&_svg]:text-[hsl(142_45%_40%)]"
                >
                  <CheckIcon />
                  {cert.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── TABY ── */}
        <Tabs defaultValue="profil">
          <TabsList>
            <TabsTrigger value="profil">{t('tabs.profile')}</TabsTrigger>
            {hasRegistry && <TabsTrigger value="dane">{t('tabs.registry')}</TabsTrigger>}
            {hasEmployees && (
              <TabsTrigger value="pracownicy">{t('tabs.employees', { count: data.employees.length })}</TabsTrigger>
            )}
          </TabsList>

          {/* ── TAB: PROFIL ── */}
          <TabsContent value="profil">
            {anchors.length > 0 && (
              <nav
                className="sticky top-[calc(3rem+45px)] z-10 flex bg-bg border-b border-border px-7 max-md:px-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label={t('anchors.sectionsNav')}
              >
                {anchors.map((a, i) => (
                  <a
                    key={a.id}
                    href={`#${a.id}`}
                    className={cn(
                      '-mb-px whitespace-nowrap border-b-2 border-transparent px-3.5 py-2.5 text-value text-text-muted no-underline transition-colors hover:text-text-strong',
                      i === 0 && 'text-accent border-accent font-medium',
                    )}
                  >
                    {a.label}
                  </a>
                ))}
              </nav>
            )}

            <div className="px-7 py-6 max-w-[960px] max-md:px-5 max-md:py-5">
              {/* O firmie */}
              {hasAboutSection && (
                <section id="o-firmie" className="mb-4 scroll-mt-[150px]">
                  <div className="bg-bg border border-border rounded-lg shadow-md overflow-hidden">
                    <div className="flex items-center justify-between px-[18px] py-3 border-b border-border">
                      <span className="text-heading text-text-strong">{t('about.title')}</span>
                    </div>
                    {hasDescription && (
                      <div className="px-[18px] py-4">
                        <p className="text-body leading-[1.7] text-text">{data.description}</p>
                      </div>
                    )}
                    {kpis.length > 0 && (
                      <div className="grid grid-cols-4 gap-px bg-border border-t border-border max-[560px]:grid-cols-2">
                        {kpis.map((k) => (
                          <div key={k.label} className="bg-bg px-3.5 py-3">
                            <div className="text-eyebrow uppercase text-text-muted mb-1">{k.label}</div>
                            <div className="text-[22px] font-normal text-accent tracking-[-0.04em] leading-tight">{k.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Top 5 z oferty */}
              {hasHighlights && (
                <section id="top5" className="mb-4 scroll-mt-[150px]">
                  <div className="bg-bg border border-border rounded-lg shadow-md overflow-hidden">
                    <div className="flex items-center justify-between px-[18px] py-3 border-b border-border">
                      <span className="text-heading text-text-strong">{t('top5.title')}</span>
                      <span className="text-[11px] text-text-muted">{t('top5.subtitle')}</span>
                    </div>
                    <div className="px-[18px]">
                      {data.highlights.map((h, i) => (
                        <div
                          key={h.id}
                          className="flex items-start gap-3 py-2.5 border-b border-border last:border-b-0 -mx-[18px] px-[18px] transition-colors hover:bg-surface"
                        >
                          <span className="grid place-items-center size-[22px] shrink-0 mt-px rounded-full bg-accent-bg border border-accent-border text-[11px] font-semibold text-accent">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-value text-text-strong leading-[1.4] font-medium">{h.title}</div>
                            {h.description && <div className="text-[11px] text-text-muted mt-0.5">{h.description}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Parametry techniczne */}
              {hasParams && (
                <section id="parametry" className="mb-4 scroll-mt-[150px]">
                  <div className="bg-bg border border-border rounded-lg shadow-md overflow-hidden">
                    <div className="flex items-center justify-between px-[18px] py-3 border-b border-border">
                      <span className="text-heading text-text-strong">{t('params.title')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-border max-[480px]:grid-cols-1">
                      {paramCells.map((cell) => (
                        <div key={cell.key} className="bg-bg px-3.5 py-2.5">
                          <div className="text-eyebrow uppercase text-text-muted mb-0.5">{cell.label}</div>
                          <div className="text-value text-text-strong font-medium">{cell.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Galeria */}
              {hasPhotos && (
                <section id="galeria" className="mb-4 scroll-mt-[150px]">
                  <div className="bg-bg border border-border rounded-lg shadow-md overflow-hidden">
                    <div className="flex items-center justify-between px-[18px] py-3 border-b border-border">
                      <span className="text-heading text-text-strong">{t('gallery.title')}</span>
                      <span className="text-[11px] text-text-muted">{t('gallery.count', { count: photos.length })}</span>
                    </div>
                    <div className="px-[18px] py-4">
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
                        {photos.map((p) => (
                          <figure key={p.id} className="aspect-[4/3] overflow-hidden bg-surface border border-border grid place-items-center">
                            {p.file_url ? (
                              <img className="size-full object-cover block" src={p.file_url} alt={p.file_name ?? heroName} loading="lazy" />
                            ) : (
                              <ImagePlaceholderIcon />
                            )}
                          </figure>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Dokumenty do pobrania */}
              {hasDocuments && (
                <section id="dokumenty" className="mb-4 scroll-mt-[150px]">
                  <div className="bg-bg border border-border rounded-lg shadow-md overflow-hidden">
                    <div className="flex items-center justify-between px-[18px] py-3 border-b border-border">
                      <span className="text-heading text-text-strong">{t('documents.title')}</span>
                      <span className="text-[11px] text-text-muted">{t('documents.count', { count: documents.length })}</span>
                    </div>
                    {documents.map((d) => (
                      <div key={d.id} className="flex items-center gap-3 px-3.5 py-2.5 border-b border-border last:border-b-0">
                        <span className="grid place-items-center size-[30px] shrink-0 bg-error-bg border border-error-border text-error">
                          <FileIcon />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-value font-medium text-text-strong truncate">{d.file_name ?? t('documents.fallbackName')}</div>
                        </div>
                        <Button asChild variant="secondary" size="sm">
                          <a href={d.file_url} target="_blank" rel="noreferrer">
                            <DownloadIcon />
                            {t('common:actions.download')}
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </TabsContent>

          {/* ── TAB: DANE REJESTROWE ── */}
          {hasRegistry && (
            <TabsContent value="dane">
              <div className="px-7 py-6 max-w-[640px] max-md:px-5 max-md:py-5">
                {registryIdentity.length > 0 && (
                  <div className="bg-bg border border-border rounded-lg shadow-md overflow-hidden mb-4">
                    <div className="px-4 py-3 border-b border-border">
                      <span className="text-heading text-text-strong">{t('registry.identityTitle')}</span>
                    </div>
                    {registryIdentity.map(([k, v]) => (
                      <div key={k} className="flex px-4 py-2.5 border-b border-border last:border-b-0 max-[480px]:flex-col max-[480px]:gap-0.5">
                        <div className="w-[180px] shrink-0 text-label font-medium text-text-muted pt-px">{k}</div>
                        <div className="text-value text-text-strong">{v}</div>
                      </div>
                    ))}
                  </div>
                )}
                {registryAddress.length > 0 && (
                  <div className="bg-bg border border-border rounded-lg shadow-md overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <span className="text-heading text-text-strong">{t('registry.addressTitle')}</span>
                    </div>
                    {registryAddress.map(([k, v]) => (
                      <div key={k} className="flex px-4 py-2.5 border-b border-border last:border-b-0 max-[480px]:flex-col max-[480px]:gap-0.5">
                        <div className="w-[180px] shrink-0 text-label font-medium text-text-muted pt-px">{k}</div>
                        <div className="text-value text-text-strong break-all">{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* ── TAB: PRACOWNICY ── */}
          {hasEmployees && (
            <TabsContent value="pracownicy">
              <div className="px-7 py-6 max-md:px-5 max-md:py-5">
                <div className="bg-bg border border-border rounded-lg shadow-md overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div>
                      <div className="text-heading text-text-strong">{t('employees.title', { count: data.employees.length })}</div>
                      <div className="text-[11px] text-text-muted mt-0.5">{t('employees.subtitle')}</div>
                    </div>
                  </div>
                  {data.employees.map((e) => (
                    <div
                      key={e.id}
                      className="grid grid-cols-[40px_1fr_auto] items-center gap-2 px-4 border-b border-border last:border-b-0 transition-colors hover:bg-surface max-md:grid-cols-[40px_1fr]"
                    >
                      <Avatar.Root className="size-[30px] rounded-full bg-avatar grid place-items-center shrink-0">
                        <Avatar.Fallback className="text-white text-[9px] font-semibold tracking-[0.03em]">{initials(e.full_name)}</Avatar.Fallback>
                      </Avatar.Root>
                      <div className="min-w-0 py-3 px-2">
                        <div className="text-value font-medium text-text-strong truncate">{e.full_name}</div>
                        {e.job_title && <div className="text-[11px] text-text-muted truncate">{e.job_title}</div>}
                        {e.phone && <div className="text-[11px] text-text-muted mt-0.5">{e.phone}</div>}
                      </div>
                      <div className="py-3 flex justify-end max-md:col-span-full max-md:justify-start max-md:pt-0 max-md:pb-3 max-md:pl-[52px]">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openMessage({ name: e.full_name, role: e.job_title ?? t('employees.roleFallback') })}
                        >
                          <ChatIcon />
                          {t('common:actions.write')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>

        <MessageDrawerPlaceholder open={drawerOpen} onOpenChange={setDrawerOpen} target={messageTarget} />
    </div>
  )
}
