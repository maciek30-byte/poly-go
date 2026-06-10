import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import * as Avatar from '@radix-ui/react-avatar'
import * as Tooltip from '@radix-ui/react-tooltip'
import './CompanyProfile.css'

type Category = { label: string; tone: 'producer' | 'recycler' | 'distributor' | 'service' }
type Certificate = { code: string; name: string }
type Offering = { title: string; description: string }
type TechParam = { label: string; value: string }
type GalleryImage = { src: string; alt: string }
type Document = { name: string; size: string; type: string }
type Employee = {
  name: string
  role: string
  email: string
  phone: string
  initials: string
  online: boolean
}

const company = {
  name: 'PolyMer Industries Sp. z o.o.',
  logo: 'PM',
  foundedYear: 1998,
  city: 'Tarnów, Małopolska',
  categories: [
    { label: 'Producent', tone: 'producer' },
    { label: 'Wtryskownia', tone: 'producer' },
    { label: 'Recykler PE/PP', tone: 'recycler' },
    { label: 'Eksport UE', tone: 'distributor' },
  ] as Category[],
  certificates: [
    { code: 'ISO 9001', name: 'System zarządzania jakością' },
    { code: 'ISO 14001', name: 'Zarządzanie środowiskowe' },
    { code: 'IATF 16949', name: 'Standard motoryzacyjny' },
    { code: 'EuCertPlast', name: 'Certyfikat recyklera' },
  ] as Certificate[],
  description:
    'Działamy od 1998 roku jako producent komponentów z tworzyw sztucznych dla branży motoryzacyjnej, AGD i opakowaniowej. Posiadamy 18 wtryskarek o sile zwarcia od 80 do 1300 ton oraz własną linię regranulacji PE/PP. Specjalizujemy się w krótkich i średnich seriach z gwarancją powtarzalności partii. Realizujemy projekty od koncepcji formy aż po seryjną produkcję — z własnym działem konstrukcyjnym i narzędziownią.',
  topOfferings: [
    {
      title: 'Wtrysk techniczny detali do 1.8 kg',
      description: 'Komponenty konstrukcyjne dla automotive i AGD, tolerancje ±0.05 mm',
    },
    {
      title: 'Regranulat PE-HD i PP post-industrial',
      description: 'Materiał o powtarzalnym MFI, świadectwo jakości do każdej partii',
    },
    {
      title: 'Projektowanie i wykonanie form',
      description: 'Własna narzędziownia, formy 1-16 gniazdowe, serwis i modyfikacje',
    },
    {
      title: 'Konfekcjonowanie i montaż',
      description: 'Linia montażu z kontrolą wizyjną, pakowanie w opakowania klienta',
    },
    {
      title: 'Magazynowanie i logistyka UE',
      description: 'Konsygnacja, dostawy JIT do 1500 km, własny transport',
    },
  ] as Offering[],
  techParams: {
    Produkcja: [
      { label: 'Liczba wtryskarek', value: '18 sztuk' },
      { label: 'Siła zwarcia', value: '80 – 1300 ton' },
      { label: 'Detal max', value: '1.8 kg' },
      { label: 'Technologie', value: 'Wtrysk standard, wtrysk gazowy, wkładkowanie' },
    ],
    Recykling: [
      { label: 'Frakcje przyjmowane', value: 'PE-HD, PE-LD, PP, mix poliolefin' },
      { label: 'Forma wsadu', value: 'Regrind, bele, big bag' },
      { label: 'Przepustowość', value: '450 t / miesiąc' },
      { label: 'Forma produktu', value: 'Regranulat (MFI na żądanie)' },
    ],
    Rynki: [
      { label: 'Segmenty', value: 'Automotive (Tier 2), AGD, opakowania techniczne' },
      { label: 'Eksport', value: 'DE, CZ, SK, AT, HU — ~38% obrotu' },
      { label: 'MOQ', value: 'od 500 sztuk / 200 kg regranulatu' },
    ],
  } as Record<string, TechParam[]>,
  gallery: [
    { src: 'gradient-1', alt: 'Hala produkcyjna' },
    { src: 'gradient-2', alt: 'Linia wtryskarek' },
    { src: 'gradient-3', alt: 'Magazyn surowca' },
    { src: 'gradient-4', alt: 'Narzędziownia' },
    { src: 'gradient-5', alt: 'Linia regranulacji' },
  ] as GalleryImage[],
  documents: [
    { name: 'Certyfikat ISO 9001:2015', size: '1.2 MB', type: 'PDF' },
    { name: 'Certyfikat IATF 16949', size: '2.4 MB', type: 'PDF' },
    { name: 'Prezentacja firmy 2026', size: '6.8 MB', type: 'PDF' },
    { name: 'Karta technologiczna — wtrysk', size: '840 KB', type: 'PDF' },
    { name: 'Świadectwo regranulatu PE-HD', size: '320 KB', type: 'PDF' },
  ] as Document[],
  registry: {
    legalName: 'PolyMer Industries Spółka z ograniczoną odpowiedzialnością',
    nip: '873-101-22-44',
    regon: '850412331',
    krs: '0000123456',
    headquarters: 'ul. Przemysłowa 14, 33-101 Tarnów',
    productionAddress: 'ul. Fabryczna 8, 33-100 Tarnów',
    capital: '4 800 000 PLN',
    employees: '85 – 110',
    revenue: '~ 62 mln PLN (2025)',
    website: 'www.polymer-industries.pl',
  },
  employees: [
    {
      name: 'Anna Kowalczyk',
      role: 'Dyrektor sprzedaży',
      email: 'a.kowalczyk@polymer-industries.pl',
      phone: '+48 600 100 200',
      initials: 'AK',
      online: true,
    },
    {
      name: 'Marek Wójcik',
      role: 'Kierownik produkcji',
      email: 'm.wojcik@polymer-industries.pl',
      phone: '+48 600 100 201',
      initials: 'MW',
      online: false,
    },
    {
      name: 'Joanna Lewandowska',
      role: 'Specjalista ds. recyklingu',
      email: 'j.lewandowska@polymer-industries.pl',
      phone: '+48 600 100 202',
      initials: 'JL',
      online: true,
    },
    {
      name: 'Piotr Zieliński',
      role: 'Konstruktor form',
      email: 'p.zielinski@polymer-industries.pl',
      phone: '+48 600 100 203',
      initials: 'PZ',
      online: false,
    },
    {
      name: 'Katarzyna Nowak',
      role: 'Eksport / Key Account',
      email: 'k.nowak@polymer-industries.pl',
      phone: '+48 600 100 204',
      initials: 'KN',
      online: true,
    },
  ] as Employee[],
}

const sectionAnchors = [
  { id: 'oferta', label: 'Oferta' },
  { id: 'opis', label: 'O firmie' },
  { id: 'parametry', label: 'Parametry' },
  { id: 'galeria', label: 'Galeria' },
  { id: 'dokumenty', label: 'Dokumenty' },
]

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function CompanyProfile() {
  const [favorite, setFavorite] = useState(false)
  const [showAllOfferings, setShowAllOfferings] = useState(false)

  const offerings = showAllOfferings ? company.topOfferings : company.topOfferings.slice(0, 5)

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="cp-shell">
        <header className="cp-hero">
          <div className="cp-hero-main">
            <Avatar.Root className="cp-logo">
              <Avatar.Fallback className="cp-logo-fallback">{company.logo}</Avatar.Fallback>
            </Avatar.Root>

            <div className="cp-hero-body">
              <div className="cp-hero-meta">
                <span className="cp-meta-chip">Profil zweryfikowany</span>
                <span className="cp-meta-dot">·</span>
                <span className="cp-meta-text">założono {company.foundedYear}</span>
                <span className="cp-meta-dot">·</span>
                <span className="cp-meta-text">{company.city}</span>
              </div>

              <h1 className="cp-name">{company.name}</h1>

              <div className="cp-tags">
                {company.categories.map((c) => (
                  <span key={c.label} className={`cp-tag cp-tag-${c.tone}`}>
                    {c.label}
                  </span>
                ))}
              </div>

              <div className="cp-certs">
                {company.certificates.map((cert) => (
                  <Tooltip.Root key={cert.code}>
                    <Tooltip.Trigger asChild>
                      <span className="cp-cert">
                        <CheckIcon />
                        {cert.code}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content className="cp-tooltip" sideOffset={6}>
                        {cert.name}
                        <Tooltip.Arrow className="cp-tooltip-arrow" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                ))}
              </div>
            </div>

            <div className="cp-hero-actions">
              <button className="cp-btn cp-btn-primary">
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

          <nav className="cp-anchors" aria-label="Sekcje profilu">
            {sectionAnchors.map((a) => (
              <a key={a.id} href={`#${a.id}`} className="cp-anchor">
                {a.label}
              </a>
            ))}
          </nav>
        </header>

        <Tabs.Root defaultValue="profil" className="cp-tabs">
          <Tabs.List className="cp-tabs-list" aria-label="Widoki profilu firmy">
            <Tabs.Trigger value="profil" className="cp-tab">Profil</Tabs.Trigger>
            <Tabs.Trigger value="dane" className="cp-tab">Dane rejestrowe</Tabs.Trigger>
            <Tabs.Trigger value="zespol" className="cp-tab">
              Lista pracowników
              <span className="cp-tab-count">{company.employees.length}</span>
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="profil" className="cp-tab-content">
            <section id="oferta" className="cp-section">
              <div className="cp-section-head">
                <h2>Top {company.topOfferings.length} z oferty</h2>
                <p>Najważniejsze rzeczy, które firma chce pokazać partnerom.</p>
              </div>
              <ol className="cp-offerings">
                {offerings.map((o, i) => (
                  <li key={o.title} className="cp-offering">
                    <span className="cp-offering-num">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{o.title}</h3>
                      <p>{o.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {company.topOfferings.length > 5 && (
                <button className="cp-link-btn" onClick={() => setShowAllOfferings((v) => !v)}>
                  {showAllOfferings ? 'Zwiń' : 'Pokaż wszystkie'}
                </button>
              )}
            </section>

            <section id="opis" className="cp-section">
              <div className="cp-section-head">
                <h2>O firmie</h2>
              </div>
              <p className="cp-description">{company.description}</p>
            </section>

            <section id="parametry" className="cp-section">
              <div className="cp-section-head">
                <h2>Parametry techniczne</h2>
                <p>Pola strukturyzowane zależne od kategorii działalności.</p>
              </div>
              <div className="cp-params">
                {Object.entries(company.techParams).map(([group, rows]) => (
                  <div key={group} className="cp-param-group">
                    <h3>{group}</h3>
                    <dl>
                      {rows.map((r) => (
                        <div key={r.label} className="cp-param-row">
                          <dt>{r.label}</dt>
                          <dd>{r.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </section>

            <section id="galeria" className="cp-section">
              <div className="cp-section-head">
                <h2>Galeria</h2>
                <p>Hala produkcyjna, maszyny, magazyn.</p>
              </div>
              <div className="cp-gallery">
                {company.gallery.map((g, i) => (
                  <figure key={g.src} className={`cp-photo cp-photo-${i + 1}`}>
                    <span className="cp-photo-label">{g.alt}</span>
                  </figure>
                ))}
              </div>
            </section>

            <section id="dokumenty" className="cp-section">
              <div className="cp-section-head">
                <h2>Dokumenty do pobrania</h2>
                <p>PDF, do 10 MB każdy.</p>
              </div>
              <ul className="cp-docs">
                {company.documents.map((d) => (
                  <li key={d.name} className="cp-doc">
                    <span className="cp-doc-icon">{d.type}</span>
                    <div className="cp-doc-meta">
                      <span className="cp-doc-name">{d.name}</span>
                      <span className="cp-doc-size">{d.size}</span>
                    </div>
                    <button className="cp-btn cp-btn-ghost cp-btn-sm">
                      <DownloadIcon />
                      Pobierz
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </Tabs.Content>

          <Tabs.Content value="dane" className="cp-tab-content">
            <section className="cp-section">
              <div className="cp-section-head">
                <h2>Dane rejestrowe</h2>
                <p>Twarde dane firmy — gotowe do skopiowania do systemu ERP / na fakturę.</p>
              </div>
              <div className="cp-registry">
                {Object.entries({
                  'Nazwa rejestrowa': company.registry.legalName,
                  NIP: company.registry.nip,
                  REGON: company.registry.regon,
                  KRS: company.registry.krs,
                  'Siedziba': company.registry.headquarters,
                  'Adres produkcji': company.registry.productionAddress,
                  'Kapitał zakładowy': company.registry.capital,
                  'Zatrudnienie': company.registry.employees,
                  'Przychód (2025)': company.registry.revenue,
                  'Strona WWW': company.registry.website,
                }).map(([k, v]) => (
                  <div key={k} className="cp-registry-row">
                    <span className="cp-registry-key">{k}</span>
                    <span className="cp-registry-val">{v}</span>
                  </div>
                ))}
              </div>
            </section>
          </Tabs.Content>

          <Tabs.Content value="zespol" className="cp-tab-content">
            <section className="cp-section">
              <div className="cp-section-head">
                <h2>Lista pracowników</h2>
                <p>Kliknij „Napisz", aby otworzyć komunikator 1:1.</p>
              </div>
              <ul className="cp-team">
                {company.employees.map((e) => (
                  <li key={e.email} className="cp-person">
                    <Avatar.Root className="cp-person-avatar">
                      <Avatar.Fallback className="cp-person-fallback">{e.initials}</Avatar.Fallback>
                      <span className={`cp-presence ${e.online ? 'is-online' : ''}`} aria-hidden />
                    </Avatar.Root>
                    <div className="cp-person-body">
                      <div className="cp-person-name">{e.name}</div>
                      <div className="cp-person-role">{e.role}</div>
                      <div className="cp-person-contact">
                        <span>{e.email}</span>
                        <span className="cp-person-sep">·</span>
                        <span>{e.phone}</span>
                      </div>
                    </div>
                    <button className="cp-btn cp-btn-primary cp-btn-sm">
                      <ChatIcon />
                      Napisz
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </Tooltip.Provider>
  )
}
