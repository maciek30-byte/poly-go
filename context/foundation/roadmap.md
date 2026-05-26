---
project: polyGo
version: 1
status: draft
created: 2026-05-26
updated: 2026-05-26
prd_version: 1
main_goal: quality
top_blocker: none
---

# Roadmap: polyGo

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Polskie firmy z branży tworzyw sztucznych nie mają wiarygodnego sposobu na weryfikację nowego kontrahenta handlowego — publiczne portale ogłoszeniowe są zalane fejkami, a codzienna komunikacja handlowa rozprasza się po prywatnych telefonach, e-mailach i WhatsAppach, więc gdy pracownik odchodzi, firma traci instytucjonalną pamięć relacji. polyGo handluje skalą za zaufanie: 10+letni insider branżowy ręcznie weryfikuje każdą firmę, która dostaje się do środka. Manualna gatekeeping i zamknięta natura platformy *są* moatem (cechą, której konkurencja nie może łatwo skopiować) — nie błędem do naprawienia.

## North star

**S-06: Employee otwiera 1:1 chat z konkretnym Employee zweryfikowanego kontrahenta, wymienia wiadomości tekstowe z read-receipt, a telefon kontrahenta odsłania się po otwarciu rozmowy z logiem audytu.** — to jądro pełnej pętli z PRD §Success Criteria > Primary (jedyne zdaniowo zdefiniowane kryterium sukcesu produktu w MVP); bez niej żadna metryka secondary (60% aktywnych po 30 dniach) nie zaistnieje.

> Gwiazda przewodnia (north star) — najmniejszy end-to-end slice, którego dowiezienie potwierdza centralną hipotezę produktu (tu: że zweryfikowani kupujący i sprzedający *naprawdę* rozmawiają w polyGo zamiast przeskakiwać na telefon/WhatsAppa). Umieszczona tak wcześnie, jak pozwalają Prerequisites — wszystko inne ma sens tylko wtedy, gdy ten slice działa. S-07 (PDF), S-08 (realtime + push), S-09 (favorites) domykają primary success criterion (kryterium sukcesu z PRD §Success Criteria > Primary) wokół tego jądra.

## At a glance

| ID    | Change ID                                  | Outcome (user can …)                                                                          | Prerequisites      | PRD refs                       | Status   |
| ----- | ------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------ | ------------------------------ | -------- |
| F-01  | app-shell-and-routing                      | (foundation) router, AuthContext, ProtectedRoute i polski layout shell są wpięte             | —                  | Access Control, NFR (3-click, PL UI) | ready    |
| F-02  | supabase-data-and-rls-baseline             | (foundation) Supabase client + state-machine firm + RLS gating "verified-only" + seedy        | F-01               | Business Logic, FR-013, NFR (RODO) | proposed |
| S-01  | owner-invitation-and-signup                | użytkownik akceptuje zaproszenie Admina, zakłada konto Ownera i składa dane firmy do weryfikacji | F-01, F-02         | FR-001, FR-002, FR-003         | proposed |
| S-02  | admin-verification-queue                   | Admin przegląda kolejkę pending, weryfikuje NIP/KRS, aktywuje lub odrzuca firmę              | S-01               | FR-004, FR-005, Access Control | proposed |
| S-03  | owner-profile-and-employee-invites         | Owner aktywowanej firmy edytuje profil firmy i zaprasza Employees, którzy mogą się zalogować | S-02               | FR-006, FR-007, FR-008, FR-009 | proposed |
| S-04  | verified-directory-search                  | Employee przeszukuje katalog zweryfikowanych firm po województwie, typie i materiale          | S-03               | FR-011, FR-012, FR-013         | proposed |
| S-05  | company-profile-with-employee-list         | Employee otwiera profil zweryfikowanej firmy i widzi listę jej Employees (bez telefonu)       | S-04               | FR-010                         | proposed |
| S-06  | one-to-one-chat-with-phone-reveal          | Employee otwiera 1:1 chat z Employee kontrahenta, wymienia tekst z read-receipt; telefon odsłania się i jest logowany | S-05               | FR-014, FR-015, FR-017, FR-010a, US-01 | proposed |
| S-07  | pdf-attachments-in-chat                    | Employee dołącza PDF ≤ 10 MB do wiadomości; >10 MB jest odrzucany z czytelnym komunikatem    | S-06               | FR-016                         | proposed |
| S-08  | realtime-delivery-and-unread-badges        | wiadomość dociera <2 s gdy obaj online; badge unread i browser push gdy karta nieaktywna     | S-06               | FR-018, FR-019, NFR (<2 s)     | proposed |
| S-09  | favorites-list                             | Employee gwiazdkuje firmę i z listy Favorites skacze do jej profilu                            | S-05               | FR-020, FR-021                 | proposed |
| S-10  | employee-deactivation-and-history-retention | Owner deaktywuje Employee — login zablokowany, Owner zachowuje read access do wszystkich threadów Employee | S-03, S-06         | FR-022, FR-023, US-02          | proposed |
| S-11  | polymer-catalog-proposal-flow              | Owner proponuje nowy polimer; do akceptacji widoczny tylko na własnym profilu; Admin akceptuje | S-02               | FR-007a                        | proposed |
| S-12  | platform-lockout-controls                  | Admin lockuje firmę lub Employee out-of-band, log audytowy + notyfikacja Ownera               | S-02               | FR-024                         | proposed |

## Streams

Pomoc nawigacyjna — grupuje pozycje, które dzielą łańcuch Prerequisites. Kanoniczna kolejność nadal żyje w grafie zależności poniżej; ta tabela to zaproponowana kolejność czytania równoległych torów.

| Stream | Theme                       | Chain                                                          | Note                                                                                          |
| ------ | --------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A      | Onboarding & weryfikacja    | `F-01` → `F-02` → `S-01` → `S-02` → `S-03`                     | Domyka pętlę zaufania zgodnie z `main_goal: quality` — RLS i Admin queue wcześnie, nie późno. |
| B      | Discovery + north-star chat | `S-04` → `S-05` → `S-06` → `S-07`                              | Dochodzi do gwiazdy przewodniej (S-06) i domyka primary success criterion przez S-07.         |
| C      | Warstwa interaktywności     | `S-08` → `S-09`                                                | Dołącza do Streamu B w S-06 (S-08) i S-05 (S-09); slice'y równoległe po dotarciu.            |
| D      | Cykl życia konta i moat    | `S-10` → `S-12`                                                | Dołącza do Streamu A/B w S-03+S-06 (S-10) i S-02 (S-12); ochrona moatu po dowiezieniu pętli.  |
| E      | Wzrost katalogu             | `S-11`                                                         | Dołącza do Streamu A w S-02; standalone slice nad tym samym Admin UI co S-02.                 |

## Baseline

Co już jest w kodzie na dzień `2026-05-26` (auto-researched + potwierdzone przez użytkownika). Foundations poniżej zakładają, że to istnieje, i NIE re-scaffolduje tych warstw.

- **Frontend:** partial — React 19 + Vite 8 wpięte (`vite.config.ts:2`), ale `src/App.tsx` to wciąż stock Vite landing; brak routera, brak biblioteki UI/stylowania.
- **Backend / API:** absent — żadnych endpointów, edge functions ani `supabase/functions/`. `@supabase/supabase-js@^2.106.1` jest w `package.json:27`, ale nieużywany.
- **Data:** absent — brak `supabase/` na root, brak migracji, brak typów DB, brak seedów (polimery, województwa).
- **Auth:** absent — brak UI logowania, brak AuthContext, brak ProtectedRoute, brak RLS policies.
- **Deploy / infra:** present — `.github/workflows/deploy.yml` (auto-deploy na main → Cloudflare Pages, z grep'em service_role w `dist/`), `docs/runbooks/deploy.md`, husky + lint-staged + commitlint na pre-commit, Wrangler 4.93.1 + Node 22.
- **Observability:** absent — brak Sentry/PostHog/loggera; brak health-check endpointu. Minimalny audyt (phone-reveal, lockout) wejdzie do slice'ów które go potrzebują, nie do osobnego fundamentu.

## Foundations

### F-01: app-shell-and-routing

- **Outcome:** (foundation) router (np. react-router-dom), AuthContext oparty o sesję Supabase, ProtectedRoute, polski layout shell i baza nawigacji 3-click są wpięte.
- **Change ID:** app-shell-and-routing
- **PRD refs:** Access Control (sign-up vs sign-in, "account locked / pending" state), NFR (polski UI bez fallbacku, dostępność 3-click)
- **Unlocks:** S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08, S-09, S-10, S-11, S-12 (każdy user-facing slice potrzebuje routera + sesji)
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Pierwsza decyzja o konwencji folderów (feature folders vs domain) zostanie zakodyfikowana w `CLAUDE.md` — jeśli pójdzie nie tak, każdy kolejny slice powiela złą konwencję.
- **Status:** ready

### F-02: supabase-data-and-rls-baseline

- **Outcome:** (foundation) Supabase client wrapper, schemat państw weryfikacji firm (`invited → pending → activated → suspended | locked`), tabele core (`companies`, `users`, `roles`, `invitations`), pierwsze RLS policies kodyfikujące "verified-only contact" i seedy (16 województw, curated polymer catalog PE/PP/PVC/PET/PS/ABS).
- **Change ID:** supabase-data-and-rls-baseline
- **PRD refs:** Business Logic (gating rule + identity-continuity rule), FR-013, FR-007 (curated catalog), NFR (RODO data handling)
- **Unlocks:** S-01 (signup pisze do `pending`), S-02 (queue czyta `pending`), S-04+S-05+S-06 (gating jest RLS-em, nie warstwą aplikacji), wszystkie pozostałe slice'y poprzez identyczne tabele
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** RLS zaprojektowane *przed* slice'ami konsumenckimi — jeśli model danych firm pominie późniejsze wymaganie (np. materiały jako relacja many-to-many vs JSON), migracja schematu w trakcie S-04+ podniesie koszt. Mitygacja: model wprost wynika z PRD FR-006/007/011.
- **Status:** proposed

## Slices

### S-01: owner-invitation-and-signup

- **Outcome:** użytkownik akceptuje zaproszenie Admina, zakłada konto Ownera, akceptuje T&Cs i składa dane firmy (legal name, NIP, KRS, adres, website, primary contact) do weryfikacji; firma wchodzi w state `pending`.
- **Change ID:** owner-invitation-and-signup
- **PRD refs:** FR-001, FR-002, FR-003
- **Prerequisites:** F-01, F-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Jak technicznie generujemy single-use sign-up linki (Supabase Auth invite flow vs własna tabela tokenów)? — Owner: user. Block: no.
- **Risk:** T&Cs przyjęte tu są load-bearing dla FR-023 (Owner czyta chaty deaktywowanego Employee) — pominięcie klauzuli "chats are corporate property" zerwie późniejszy slice S-10 z punktu widzenia compliance.
- **Status:** proposed

### S-02: admin-verification-queue

- **Outcome:** Admin loguje się do panelu, przegląda kolejkę firm w state `pending`, widzi NIP/KRS/dane kontaktowe, ręcznie weryfikuje, aktywuje (→ state `activated` + e-mail aktywacyjny do Ownera) lub odrzuca firmę.
- **Change ID:** admin-verification-queue
- **PRD refs:** FR-004, FR-005, Access Control (Platform Administrator)
- **Prerequisites:** S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Czy panel admina jest pod `/admin` w tej samej aplikacji, czy osobnym deploymentem? — Owner: user. Block: no.
- **Risk:** Pierwsza realna decyzja o admin role w RLS — pomyłka tu (np. admin policy zbyt szerokie) otwiera w przyszłości ścieżkę do leaku przez panel.
- **Status:** proposed

### S-03: owner-profile-and-employee-invites

- **Outcome:** aktywowany Owner edytuje profil firmy (FR-006 fields + materials z curated dropdown), edycja NIP/KRS triggeruje re-verification (state wraca do `pending`); Owner zaprasza Employees mailem, Employee zakłada konto z profilem (imię, nazwisko, stanowisko, telefon).
- **Change ID:** owner-profile-and-employee-invites
- **PRD refs:** FR-006, FR-007, FR-008, FR-009
- **Prerequisites:** S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Re-verification po edycji NIP/KRS — czy w międzyczasie firma znika z katalogu czy zostaje widoczna w "ostatnim znanym dobrym" stanie? PRD mówi "until visible again" — interpretuję jako znika. — Owner: user. Block: no.
- **Risk:** Telefon Employee zbierany tu, ale ujawniany dopiero w S-06 (FR-010a). Zachowanie tego rozdziału warstwowo (kolumna w DB, ale RLS odsłania dopiero po wpisie w `phone_reveal_log`) musi być zaprojektowane już tu, nie w S-06.
- **Status:** proposed

### S-04: verified-directory-search

- **Outcome:** zalogowany Employee zweryfikowanej firmy przeszukuje katalog filtrując po województwie + typie aktywności + materiale (jednym lub wielu z curated catalog); wyniki sortowane wg recent activity → name; widać tylko firmy w state `activated`.
- **Change ID:** verified-directory-search
- **PRD refs:** FR-011, FR-012, FR-013
- **Prerequisites:** S-03
- **Parallel with:** S-11
- **Blockers:** —
- **Unknowns:**
  - "Recent activity" to ostatnia wiadomość chat czy ostatnie logowanie którego z Employees? PRD nie precyzuje. — Owner: user. Block: no.
- **Risk:** FR-013 to load-bearing guardrail; każdy bug w filtrze (np. zapomniany `state = 'activated'` w SQL) jest najgorszą możliwą regresją produktu. RLS z F-02 jest siatką bezpieczeństwa.
- **Status:** proposed

### S-05: company-profile-with-employee-list

- **Outcome:** Employee otwiera profil zweryfikowanej firmy z searcha lub Favorites; widzi listę Employees (imię, nazwisko, stanowisko — bez telefonu); profil firmy nieaktywowanej (lub odwiedzonej przez niezalogowanego) renderuje się jako "not found".
- **Change ID:** company-profile-with-employee-list
- **PRD refs:** FR-010, FR-013 (URL-level enforcement), Non-Goals (no public profile, no SEO)
- **Prerequisites:** S-04
- **Parallel with:** S-11
- **Blockers:** —
- **Unknowns:** —
- **Risk:** "Not found" zamiast "403" dla nieaktywowanych firm jest celowy (nie ujawnia istnienia konta) — łatwo zapomnieć i zwrócić różny status, co stałby się oracle dla zewnętrznego skanera.
- **Status:** proposed

### S-06: one-to-one-chat-with-phone-reveal

- **Outcome:** Employee z profilu firmy klika Employee → otwiera (lub re-otwiera tego samego, nie nowy) 1:1 thread; wymienia wiadomości tekstowe z read-receipt; w momencie otwarcia chatu telefon kontrahenta staje się widoczny i event jest zapisywany w `phone_reveal_log` z timestampem i tożsamością ujawniającego.
- **Change ID:** one-to-one-chat-with-phone-reveal
- **PRD refs:** FR-014, FR-015, FR-017, FR-010a, US-01
- **Prerequisites:** S-05
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Read-receipt: per wiadomość czy per thread (ostatnio przeczytana)? PRD mówi "wskaźnik kiedy druga strona przeczytała wiadomość" — interpretuję per wiadomość. — Owner: user. Block: no.
- **Risk:** Phone reveal jest jednym z dwóch wektorów harvesting (drugi = mass employee browsing); log audytowy musi być pisany *przed* renderem telefonu, nie po — inaczej można rozłączyć request po przeczytaniu i ominąć log.
- **Status:** proposed

### S-07: pdf-attachments-in-chat

- **Outcome:** Employee dołącza plik PDF ≤ 10 MB do wiadomości chatu; > 10 MB jest odrzucane z czytelnym komunikatem; załącznik jest widoczny dla obu stron i dla Ownera firmy nadawcy (na potrzeby S-10).
- **Change ID:** pdf-attachments-in-chat
- **PRD refs:** FR-016, US-01 (acceptance criterion: PDF exchange)
- **Prerequisites:** S-06
- **Parallel with:** S-08, S-09
- **Blockers:** —
- **Unknowns:**
  - Limit 10 MB egzekwowany client-side (przed uploadem) czy server-side (przez Supabase Storage policy)? Powinno być oba — UX i bezpieczeństwo. — Owner: user. Block: no.
- **Risk:** Walidacja typu pliku tylko po extension to wektor smuggle'a (PDF ze złośliwą zawartością); Supabase Storage MIME check + content sniff są obowiązkowe.
- **Status:** proposed

### S-08: realtime-delivery-and-unread-badges

- **Outcome:** wiadomość wysłana przez jedną stronę pojawia się na ekranie drugiej w <2 s gdy obaj są online (NFR realtime); badge unread w UI messengera odzwierciedla liczbę nieprzeczytanych threadów; browser push notification dociera gdy odbiorca dał permission i nie jest aktywny na karcie polyGo.
- **Change ID:** realtime-delivery-and-unread-badges
- **PRD refs:** FR-018, FR-019, NFR (<2 s realtime delivery)
- **Prerequisites:** S-06
- **Parallel with:** S-07, S-09
- **Blockers:** —
- **Unknowns:**
  - Browser push: Web Push Protocol bezpośrednio czy przez Supabase Edge Function jako proxy do VAPID? — Owner: user. Block: no.
- **Risk:** Realtime przez Supabase Realtime ma znane edge case'y przy reconnect — slice musi mieć test ręczny "włącz/wyłącz wifi w trakcie chatu", inaczej regresja siedzi cicho do pierwszego usera.
- **Status:** proposed

### S-09: favorites-list

- **Outcome:** Employee gwiazdkuje (i odgwiazdkowuje) firmę-kontrahenta z jej profilu; otwiera listę Favorites i z niej skacze bezpośrednio do profilu firmy.
- **Change ID:** favorites-list
- **PRD refs:** FR-020, FR-021, US-01 (acceptance criterion: mark favorite)
- **Prerequisites:** S-05
- **Parallel with:** S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Favorites są per-Employee (PRD FR-020 resolution), więc deaktywacja Employee w S-10 nie powinna kasować favorites firmy — odzyskuje je Owner lub przechodzą w "company-owned bookmarks" w v2. Zachowanie domyślne: zachowaj, nie kasuj.
- **Status:** proposed

### S-10: employee-deactivation-and-history-retention

- **Outcome:** Owner deaktywuje konto Employee z panelu firmy → Employee przy próbie logowania widzi "account locked — contact your Company Owner"; Owner zachowuje read access do wszystkich threadów Employee zorganizowanych po firmie kontrahencie, z pełną treścią i załącznikami; event deaktywacji jest logowany (timestamp + tożsamość Ownera).
- **Change ID:** employee-deactivation-and-history-retention
- **PRD refs:** FR-022, FR-023, US-02
- **Prerequisites:** S-03, S-06
- **Parallel with:** S-11, S-12
- **Blockers:** —
- **Unknowns:**
  - Czy Owner widzi treść wiadomości "live" (subskrypcja realtime) czy tylko historię? PRD nie precyzuje — interpretuję jako historię (bez podglądu live na żywych chatach Employee, byłoby creepy). — Owner: user. Block: no.
- **Risk:** Najtrudniejsza warstwa RLS w całej roadmapie — Owner-as-viewer ma read na wszystkich threadach swoich byłych Employees, ale NIE na threadach Employees obecnych innych firm. Pomyłka tu = leak chatów między firmami.
- **Status:** proposed

### S-11: polymer-catalog-proposal-flow

- **Outcome:** Owner z formularza profilu firmy proponuje nowy polimer (nazwa + opcjonalny kod); do akceptacji widoczny tylko na profilu jego firmy i niefilrowalny dla innych; Admin w panelu akceptuje lub odrzuca, po akceptacji polimer staje się globalnie filtrowalny w S-04.
- **Change ID:** polymer-catalog-proposal-flow
- **PRD refs:** FR-007a
- **Prerequisites:** S-02
- **Parallel with:** S-04, S-05, S-10, S-12
- **Blockers:** —
- **Unknowns:**
  - Czy Admin może edytować propozycję przed akceptacją (np. ujednolicić "polietylen niska gęstość" → "PE-LD")? — Owner: user. Block: no.
- **Risk:** Lekka wertyklaka — głównym ryzykiem jest pominięcie filtra "tylko zaakceptowane" w SQL searchu z S-04, co odsłoniłoby propozycje innym firmom. Schema-level constraint (osobna kolumna `status: pending|approved`) zamyka temat.
- **Status:** proposed

### S-12: platform-lockout-controls

- **Outcome:** Admin z panelu może zlockować całą firmę lub konkretnego Employee out-of-band (czyli niezależnie od deaktywacji przez Ownera) z polem na powód; event logowany (timestamp + tożsamość Admina); Owner zlockowanej firmy dostaje notyfikację e-mail.
- **Change ID:** platform-lockout-controls
- **PRD refs:** FR-024
- **Prerequisites:** S-02
- **Parallel with:** S-10, S-11
- **Blockers:** —
- **Unknowns:**
  - Czy lockout firmy zamyka też wszystkie otwarte chaty (per Business Logic: "a chat with a counterparty whose company is later locked closes from their side")? Tak — to wynika z PRD, slice musi to wprost zaimplementować. — Owner: user. Block: no.
- **Risk:** Lockout to "ostatnia deska ratunku" moatu; brak loga lub brak notyfikacji Ownera podważa zaufanie do platformy, więc audit-trail i notyfikacja są częścią DoD, nie opcją.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                                  | Suggested issue title                                                | Ready for `/10x-plan` | Notes                                              |
| ---------- | ------------------------------------------ | -------------------------------------------------------------------- | --------------------- | -------------------------------------------------- |
| F-01       | app-shell-and-routing                      | App shell, router and AuthContext baseline                           | yes                   | Run `/10x-plan app-shell-and-routing`              |
| F-02       | supabase-data-and-rls-baseline             | Supabase schema, RLS guardrail and seed data                         | no                    | Depends on F-01                                    |
| S-01       | owner-invitation-and-signup                | Owner invitation flow and company signup                             | no                    | Depends on F-01 + F-02                             |
| S-02       | admin-verification-queue                   | Admin verification queue (activate/reject pending companies)         | no                    | Depends on S-01                                    |
| S-03       | owner-profile-and-employee-invites         | Company profile editing and employee invitation flow                 | no                    | Depends on S-02                                    |
| S-04       | verified-directory-search                  | Directory search with voivodeship + activity + material filters      | no                    | Depends on S-03                                    |
| S-05       | company-profile-with-employee-list         | Verified company profile with employee list (no phone in list view)  | no                    | Depends on S-04                                    |
| S-06       | one-to-one-chat-with-phone-reveal          | 1:1 chat with read-receipts and gated phone reveal (north star)     | no                    | Depends on S-05                                    |
| S-07       | pdf-attachments-in-chat                    | PDF attachments ≤ 10 MB in chat                                      | no                    | Depends on S-06                                    |
| S-08       | realtime-delivery-and-unread-badges        | Realtime <2 s, unread badges and browser push notifications          | no                    | Depends on S-06                                    |
| S-09       | favorites-list                             | Per-Employee favorites list                                          | no                    | Depends on S-05                                    |
| S-10       | employee-deactivation-and-history-retention | Employee deactivation with chat-history retention for Owner          | no                    | Depends on S-03 + S-06                             |
| S-11       | polymer-catalog-proposal-flow              | Polymer proposal and Admin approval flow                             | no                    | Depends on S-02                                    |
| S-12       | platform-lockout-controls                  | Platform-level lockout of company or employee with audit + notify   | no                    | Depends on S-02                                    |

## Open Roadmap Questions

1. **Mature-state scale (post-MVP).** MVP `target_scale` jest `medium` (≤ 100 firm). Realistyczny sufit pełnej sieci to low thousands firm → tens of thousands użytkowników. — Owner: user. Block: no.
2. **PDF > 10 MB.** Early adopters w segmencie machinery-vendor mogą składać quoty > 10 MB. Obserwować feedback. — Owner: user. Block: no.
3. **Opcja wyłączenia read-receipt.** Jeśli istotna część early adopters narzeka, dodać per-user toggle. — Owner: user. Block: no.
4. **Powiadomienia e-mail jako fallback.** MVP wprost rezygnuje z maili. Jeśli 30-day-active spadnie poniżej 60% guardrail, przywrócić. — Owner: user. Block: no.
5. **Filtr lokalizacji na poziomie miasta / promienia.** Województwo to MVP; drobniejsza lokalizacja może być potrzebna dla logistyki short-haul. — Owner: user. Block: no.
6. **Runbook moderacji katalogu materiałów.** FR-007a wymaga udokumentowanego procesu Platform Administratora dla zatwierdzania/odrzucania nowych polimerów. Operacyjny runbook, nie feature. — Owner: user. Block: no.
7. **MVP timeline budget (`timeline_budget.mvp_weeks`).** Open-ended timeline zaakceptowany 2026-05-19; scope nie cięty. Raw-idea wspomina o 3–4 miesiącach jako rough self-estimate. — Owner: user. Block: no.
8. **`target_scale.qps` i `target_scale.data_volume` ballparks.** Wstępnie `low` / `small` — potwierdzić przy implementacji. — Owner: user. Block: no.

## Parked

- **Marketplace / classifieds board.** Why parked: PRD §Non-Goals — discovery ma iść przez zweryfikowany katalog + chat, nie publiczne ogłoszenia.
- **Group chat (multi-party threads).** Why parked: PRD §Non-Goals — 1:1 wystarcza by udowodnić value loop; grupy to deliberate v2 cut.
- **In-platform payments / invoicing.** Why parked: PRD §Non-Goals — polyGo nie przesuwa pieniędzy.
- **Native mobile app.** Why parked: PRD §Non-Goals — browser only w MVP; iOS/Android tylko jeśli feedback po launchu tego zażąda.
- **Public sign-up.** Why parked: PRD §Non-Goals — invitation-only zostaje również post-MVP; otwarcie bramy rozcieńcza moat weryfikacyjny.
- **Voice / video calls.** Why parked: PRD §Non-Goals — real-time audio/video poza MVP.
- **Image attachments.** Why parked: PRD §Non-Goals — chat akceptuje tylko text i PDF ≤ 10 MB w MVP.
- **Public, niezalogowane profile firm i SEO indexing.** Why parked: PRD §Non-Goals — niezalogowany odwiedzający z URL-em widzi nic; nazwy firm nieindeksowane przez zewnętrzne wyszukiwarki.

## Done

(Pusta na pierwszej generacji. `/10x-archive` dopisze tu wpis — i przełączy `Status` pozycji na `done` — gdy zmiana z pasującym `Change ID` zostanie zarchiwizowana. NIE pre-populować.)
