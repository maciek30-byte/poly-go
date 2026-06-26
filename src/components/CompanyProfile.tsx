import { useMemo, useState, type JSX } from 'react'
import * as Avatar from '@radix-ui/react-avatar'
import * as Tooltip from '@radix-ui/react-tooltip'
import type { CompanyProfileData } from '../lib/use-company-profile'
import { MessageDrawerPlaceholder, type MessageTarget } from './MessageDrawerPlaceholder'
import './CompanyProfile.css'

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
  const [favorite, setFavorite] = useState(false)
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
      <div className="cp-shell">
        <header className="cp-hero">
          <div className="cp-hero-main">
            <Avatar.Root className="cp-logo">
              {data.logo_url && <Avatar.Image className="cp-logo-img" src={data.logo_url} alt={heroName} />}
              <Avatar.Fallback className="cp-logo-fallback">{initials(heroName)}</Avatar.Fallback>
            </Avatar.Root>

            <div className="cp-hero-body">
              <div className="cp-hero-meta">
                {data.founding_year != null && (
                  <span className="cp-meta-text">założono {data.founding_year}</span>
                )}
                {data.founding_year != null && data.region && <span className="cp-meta-dot">·</span>}
                {data.region && <span className="cp-meta-text">{data.region}</span>}
              </div>

              <h1 className="cp-name">{heroName}</h1>

              {data.categories.length > 0 && (
                <div className="cp-tags">
                  {data.categories.map((c) => (
                    <span key={c.id} className={`cp-tag cp-tag-${toneForCategory(c.name)}`}>
                      {c.name}
                    </span>
                  ))}
                </div>
              )}

              {data.certificates.length > 0 && (
                <div className="cp-certs">
                  {data.certificates.map((cert) => (
                    <span key={cert.id} className="cp-cert">
                      <CheckIcon />
                      {cert.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="cp-hero-actions">
              <button
                className="cp-btn cp-btn-primary"
                onClick={() => openMessage({ name: heroName, role: 'Firma' })}
              >
                <ChatIcon />
                Napisz
              </button>
              <button
                className={`cp-btn cp-btn-ghost ${favorite ? 'is-active' : ''}`}
                onClick={() => setFavorite((v) => !v)}
                aria-pressed={favorite}
              >
                <StarIcon filled={favorite} />
                {favorite ? 'W ulubionych' : 'Dodaj do ulubionych'}
              </button>
            </div>
          </div>

          {anchors.length > 0 && (
            <nav className="cp-anchors" aria-label="Sekcje profilu">
              {anchors.map((a) => (
                <a key={a.id} href={`#${a.id}`} className="cp-anchor">
                  {a.label}
                </a>
              ))}
            </nav>
          )}
        </header>

        <div className="cp-body">
          {hasHighlights && (
            <section id="oferta" className="cp-section">
              <div className="cp-section-head">
                <h2>Czym się zajmujemy</h2>
                <p>Najważniejsze rzeczy, które firma chce pokazać partnerom.</p>
              </div>
              <ol className="cp-offerings">
                {data.highlights.map((h, i) => (
                  <li key={h.id} className="cp-offering">
                    <span className="cp-offering-num">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{h.title}</h3>
                      {h.description && <p>{h.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {hasDescription && (
            <section id="opis" className="cp-section">
              <div className="cp-section-head">
                <h2>O firmie</h2>
              </div>
              <p className="cp-description">{data.description}</p>
            </section>
          )}

          {hasParams && (
            <section id="parametry" className="cp-section">
              <div className="cp-section-head">
                <h2>Parametry techniczne</h2>
                <p>Pola strukturyzowane zależne od kategorii działalności.</p>
              </div>
              <div className="cp-params">
                {paramGroups.map((group) => (
                  <div key={group.categoryId} className="cp-param-group">
                    <h3>{group.label}</h3>
                    <dl>
                      {group.rows.map((r) => (
                        <div key={r.label} className="cp-param-row">
                          <dt>{r.label}</dt>
                          <dd>{r.display}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>
          )}

          {hasPhotos && (
            <section id="galeria" className="cp-section">
              <div className="cp-section-head">
                <h2>Galeria</h2>
                <p>Hala produkcyjna, maszyny, magazyn.</p>
              </div>
              <div className="cp-gallery-grid">
                {photos.map((p) => (
                  <figure key={p.id} className="cp-photo-tile">
                    <img src={p.file_url} alt={p.file_name ?? heroName} loading="lazy" />
                  </figure>
                ))}
              </div>
            </section>
          )}

          {hasDocuments && (
            <section id="dokumenty" className="cp-section">
              <div className="cp-section-head">
                <h2>Dokumenty do pobrania</h2>
                <p>PDF, do 10 MB każdy.</p>
              </div>
              <ul className="cp-docs">
                {documents.map((d) => (
                  <li key={d.id} className="cp-doc">
                    <span className="cp-doc-icon">PDF</span>
                    <div className="cp-doc-meta">
                      <span className="cp-doc-name">{d.file_name ?? 'Dokument'}</span>
                    </div>
                    <a className="cp-btn cp-btn-ghost cp-btn-sm" href={d.file_url} target="_blank" rel="noreferrer">
                      <DownloadIcon />
                      Pobierz
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {SHOW_REGISTRY && (
            <section id="dane" className="cp-section">
              <div className="cp-section-head">
                <h2>Dane rejestrowe</h2>
                <p>Twarde dane firmy — gotowe do skopiowania do systemu ERP / na fakturę.</p>
              </div>
              <div className="cp-registry">
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
                    <div key={k} className="cp-registry-row">
                      <span className="cp-registry-key">{k}</span>
                      <span className="cp-registry-val">{v}</span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {hasEmployees && (
            <section id="pracownicy" className="cp-section">
              <div className="cp-section-head">
                <h2>Pracownicy</h2>
                <p>Kliknij „Napisz", aby otworzyć komunikator 1:1.</p>
              </div>
              <ul className="cp-team">
                {data.employees.map((e) => (
                  <li key={e.id} className="cp-person">
                    <Avatar.Root className="cp-person-avatar">
                      <Avatar.Fallback className="cp-person-fallback">{initials(e.full_name)}</Avatar.Fallback>
                    </Avatar.Root>
                    <div className="cp-person-body">
                      <div className="cp-person-name">{e.full_name}</div>
                      <div className="cp-person-role">{e.job_title}</div>
                      {e.phone && (
                        <div className="cp-person-contact">
                          <span>{e.phone}</span>
                        </div>
                      )}
                    </div>
                    <button
                      className="cp-btn cp-btn-primary cp-btn-sm"
                      onClick={() => openMessage({ name: e.full_name, role: e.job_title })}
                    >
                      <ChatIcon />
                      Napisz
                    </button>
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
