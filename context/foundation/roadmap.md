---
project: PolyGo
version: 1
status: draft
created: 2026-06-09
updated: 2026-06-09
prd_version: 1
main_goal: market-feedback
top_blocker: none
---

# Roadmap: PolyGo

> Wygenerowane z `context/foundation/prd.md` (v1) + auto-zbadanego baseline kodu.
> Edytuj w miejscu; archiwizuj gdy nieaktualne.
> Plastry poniżej w kolejności zależności. Tabela "At a glance" jest indeksem.

## Vision recap

Handlowiec w polskiej firmie polimerowej prowadzi proces zamówienia rozproszony między mailem, WhatsAppem i telefonem — wątki się gubią, specyfikacje krzyżują, brak jednego źródła prawdy. PolyGo v1 jest świadomie warstwą narzędziową (wyszukiwarka + komunikator + ulubieni kontrahenci) bez reguły domenowej — pilot ma odpowiedzieć, gdzie produkt powinien zacząć decydować za użytkownika w v2. Operator akceptuje ryzyko learning-MVP: czat bez strukturyzacji może nie udowodnić pełnej wartości, ale obserwacja realnych firm > założenia a priori.

## North star

**S-04: User pisze do firmy z listy ulubionych i widzi historię rozmów.**

Gwiazda przewodnia — najmniejszy end-to-end (`login → ulubieni → klik → realtime chat`), który, jeśli zadziała, udowodni że firmy w ogóle wracają jutro. Wybrana jako north star, bo zamyka kluczową pętlę wartości PRD ("rozproszenie komunikacji rozwiązane") z minimalnym ryzykiem mechaniki odkrywania kontrahenta — Operator seeduje ulubionych offline na podstawie znajomości pilotowych firm. Wyszukiwarka (US-02) wchodzi po gwiezdzie jako druga fala pilotu.

## At a glance

| ID   | Change ID                  | Outcome (user can …)                                            | Prerequisites | PRD refs                                | Status   |
| ---- | -------------------------- | --------------------------------------------------------------- | ------------- | --------------------------------------- | -------- |
| F-01 | auth-scaffold              | (foundation) logowanie e-mail/hasło + OAuth Google              | —             | Access Control, NFR RODO                | ready    |
| F-02 | multi-tenant-data-rls      | (foundation) schemat firm/użytkowników z RLS izolacji per-firma | —             | NFR izolacji                            | ready    |
| F-04 | routing-and-auth-shell     | (foundation) router + auth-protected app shell                  | F-01          | Access Control                          | proposed |
| S-01 | login-and-signout          | zalogować się i wylogować                                       | F-01, F-04    | US-01                                   | proposed |
| S-02 | edit-own-company-profile   | edytować wizytówkę własnej firmy                                | F-02, S-01    | US-07                                   | proposed |
| S-03 | favorites-and-company-card | zobaczyć ulubionych kontrahentów i pełną wizytówkę firmy        | F-02, S-01    | US-06, US-03                            | proposed |
| S-04 | realtime-chat-with-history | otworzyć czat z kontrahentem, pisać realtime, zobaczyć historię | S-03          | US-04, US-05                            | proposed |
| S-05 | company-search-by-criteria | wyszukiwać firmy po typie polimeru, profilu, regionie           | S-03          | US-02                                   | proposed |

## Streams

Pomocnik nawigacyjny — grupuje plastry współdzielące łańcuch Prerequisites. Kanoniczna kolejność wciąż jest w grafie zależności poniżej; ta tabela to proponowana ścieżka czytania w równoległych torach.

| Stream | Theme                        | Chain                                                | Note                                                                |
| ------ | ---------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| A      | Auth + Pętla do gwiazdy      | `F-01` → `F-04` → `S-01` → `S-03` → `S-04`           | Główny tor do north star; każdy krok bezpośrednio przybliża do `S-04`. |
| B      | Profil własnej firmy         | `F-02` → `S-02`                                      | `S-02` dołącza do Streamu A przy `S-01` (wymaga zalogowania). `F-02` zasila też `S-03`/`S-05`. |
| C      | Discovery druga fala         | `S-05`                                               | Wyszukiwarka po pilocie pierwszej fali — gdy ulubieni już zwalidowali pętlę czatu. |

## Baseline

Co jest już w kodzie na `2026-06-09` (auto-zbadane + potwierdzone przez użytkownika).
Foundations poniżej zakładają obecność tych warstw i NIE re-scaffoldują ich.

- **Frontend:** partial — Vite + React + TypeScript skonfigurowane (`package.json`, `vite.config.ts`); `App.tsx` to placeholder "SOON"; **brak react-router** w dependencies, brak struktury widoków.
- **Backend / API:** absent — naturalne dla architektury SPA + Supabase BaaS; brak Pages Functions / `/functions/` (zgodne z tech-stack).
- **Data:** partial — klient Supabase w `src/lib/supabase.ts`, env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` wpięte; **brak migracji, schematu, seedów lokalnie**.
- **Auth:** absent — klient Supabase istnieje, ale brak logowania, kontekstu auth, hooków, redirectu OAuth.
- **Deploy / infra:** present — `.github/workflows/deploy.yml` + `wrangler.jsonc` skonfigurowane, auto-deploy z main na prod. **Świadomie tylko dwa środowiska: localhost + prod** — preview deploys są wyłączone (`ci(deploy): disable PR preview deploys (solo workflow)`), wszystkie zmiany weryfikujemy lokalnie i lecą na prod. Środowisko pośrednie (staging) zostanie dodane dopiero po wpuszczeniu realnych userów pilotowych — przed tym momentem prod jest pusty i nie ma ryzyka wycieku danych firm.
- **Observability:** absent — brak Sentry/Datadog/OTel/analytics. Świadomie poza MVP (NFR nie wymaga).

## Foundations

### F-01: Auth scaffold (Supabase Auth: email/hasło + OAuth Google)

- **Outcome:** (foundation) Supabase Auth skonfigurowane z email/hasło i OAuth Google; redirect callback działa; helper `getAuthRedirect()` w `lib/auth.ts` używany jednolicie (per Risk #3 w `infrastructure.md`). Microsoft OAuth odłożony do v2 — koszt Azure AD app registration vs realna wartość dla MVP nie uzasadnia setupu na pilota.
- **Change ID:** auth-scaffold
- **PRD refs:** Access Control (Uwierzytelnianie), NFR RODO (zgody, audyt dostępu)
- **Unlocks:** `S-01` (login UI), `F-04` (router potrzebuje session do guardów), pośrednio każdą `S-NN` (każda US wymaga zalogowanego usera)
- **Prerequisites:** —
- **Parallel with:** F-02, F-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** OAuth callback fallback to udokumentowane ryzyko (Risk #3) — obowiązkowy helper `getAuthRedirect()` zamiast inline string. Weryfikacja na localhoście (jedyne środowisko poza prod do momentu wpuszczenia pilotowych userów); na prod redirect URLs ustawione w Supabase Auth config.
- **Status:** ready

### F-02: Multi-tenant data layer + RLS

- **Outcome:** (foundation) schemat Postgres (companies, users, favorites, messages, conversations) z politykami RLS gwarantującymi izolację danych firm; user widzi tylko dane swojej firmy + publiczne pola wizytówek innych firm.
- **Change ID:** multi-tenant-data-rls
- **PRD refs:** NFR izolacji ("dane jednej firmy całkowicie odizolowane od innych — wyciek = krytyczny incydent"), Access Control (każde konto należy do dokładnie jednej firmy)
- **Unlocks:** `S-02`, `S-03`, `S-04`, `S-05` — każdy plaster operuje na danych firmowych i musi przejść przez RLS
- **Prerequisites:** —
- **Parallel with:** F-01
- **Blockers:** —
- **Unknowns:**
  - Jakie pola wizytówki firmy są jawnie publiczne (widoczne dla wszystkich zalogowanych), a jakie tylko dla "swoich"? — Owner: user. Block: no (decyzja może być podjęta w S-02; rozsądny default: wszystko z wizytówki w MVP jest publiczne dla zalogowanych, bo cały sens pilotu = firmy widzą się nawzajem).
- **Risk:** Najbardziej obciążająca warstwa MVP — wyciek przez błędną politykę RLS = krytyczny incydent (NFR). Sequenced przed wszelkimi user-visible slice'ami, żeby każda kolejna slice testowała izolację na realnym schemacie. Świadomie nie odkładamy schematu pod plaster. Weryfikacja polityk RLS odbywa się na localhoście z lokalną instancją Supabase / na prod przed wpuszczeniem userów (prod jest pusty do momentu pilotu).
- **Status:** ready

### F-04: Routing + auth-protected app shell

- **Outcome:** (foundation) `react-router` zainstalowany, struktura tras (`/login`, `/`, `/favorites`, `/companies/:id`, `/chat/:companyId`, `/profile`) i layout shell; guard przekierowujący na `/login` jeśli brak sesji.
- **Change ID:** routing-and-auth-shell
- **PRD refs:** Access Control (cała aplikacja za loginem); brak konkretnego US, bo jest cross-cutting
- **Unlocks:** `S-01` i każdy kolejny user-visible plaster — bez routera nie ma nawigacji
- **Prerequisites:** F-01
- **Parallel with:** F-02 (sam routing) — pełna integracja guarda po F-01
- **Blockers:** —
- **Unknowns:**
  - Czy mobile nav używa drawer/bottom tabs czy klasycznego responsive layoutu? — Owner: user. Block: no (kosmetyczne, decyzja w trakcie).
- **Risk:** Małe ryzyko techniczne (react-router to standard); jedyne ryzyko to silent SPA-routing breakage z `infrastructure.md` Risk #4 — `_redirects` z `/* /index.html 200` rozwala routing przez infinite loop. Mitigation: nie dodawać `_redirects`, nie dodawać `404.html`.
- **Status:** proposed

## Slices

### S-01: Login i wylogowanie

- **Outcome:** User loguje się email+hasłem lub OAuth Google; widzi swoją tożsamość w app shellu; wylogowuje się.
- **Change ID:** login-and-signout
- **PRD refs:** US-01, Access Control (Uwierzytelnianie)
- **Prerequisites:** F-01, F-04
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Obie metody (email+hasło, Google) muszą działać — pominięcie któregokolwiek to ryzyko że pilotowa firma nie wejdzie do aplikacji wcale. Microsoft OAuth odłożony do v2: świadome zawężenie, akceptowalne dopóki żaden pilot nie zażąda M365 SSO jako blokera wejścia.
- **Status:** proposed

### S-02: Edycja wizytówki własnej firmy

- **Outcome:** User edytuje opis, profil polimerowy (typ polimeru, frakcje), profil działalności (producent/dostawca/recykler/trader), możliwości technologiczne i operacyjne swojej firmy.
- **Change ID:** edit-own-company-profile
- **PRD refs:** US-07, MVP Scope §1 (Baza Danych firm i Wizytówki)
- **Prerequisites:** F-02, S-01
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:**
  - Jakie pola wizytówki to enum (typ polimeru, profil działalności) a jakie wolny tekst? — Owner: user/team. Block: no (decyzja w trakcie planowania `/10x-plan`; PRD wymienia typy polimerów PE-LD/PE-HD/PP/PET → naturalny enum).
- **Risk:** Pierwsza akcja po loginie w pilocie — jeśli wizytówka jest pusta lub niewygodna do edycji, firma nie poczuje że "to jest jej miejsce". Słownik branżowy (PE-LD itd.) musi być w UI od dnia 1 — generyczny tekst nie udowodni branżowości produktu.
- **Status:** proposed

### S-03: Ulubieni kontrahenci + przegląd wizytówki firmy

- **Outcome:** User widzi listę ulubionych kontrahentów (seedowanych offline przez Operatora w pilocie); klika w firmę i ogląda pełną wizytówkę; może zaznaczać/odznaczać ulubionych.
- **Change ID:** favorites-and-company-card
- **PRD refs:** US-06, US-03, MVP Scope §4 (Ulubieni) i §1 (Wizytówki — strona konsumenta)
- **Prerequisites:** F-02, S-01
- **Parallel with:** S-02
- **Blockers:** —
- **Unknowns:**
  - Jak Operator wyseeduje listę ulubionych dla każdej pilotowej firmy? — Owner: operator. Block: no (proces seedingu jest poza aplikacją; aplikacja tylko czyta tabelę `favorites`).
- **Risk:** To jest "wejście" do north star — jeśli lista ulubionych jest niewidoczna lub klikalność do wizytówki jest nieoczywista, user nie dotrze do czatu. Bezpośredni prekursor `S-04`.
- **Status:** proposed

### S-04: Realtime czat 1:1 z kontrahentem + historia (NORTH STAR)

- **Outcome:** User otwiera czat z firmą (z wizytówki albo z ulubionych), wysyła wiadomość, widzi nową wiadomość drugiej strony w realtime (bez refresha), wraca następnego dnia i widzi pełną historię rozmów per kontrahent.
- **Change ID:** realtime-chat-with-history
- **PRD refs:** US-04, US-05, MVP Scope §3 (Smart Messenger — w MVP zwykły czat 1:1 z historią)
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Czy MVP obsługuje załączniki (zdjęcie specyfikacji, PDF) czy tylko tekst? — Owner: user. Block: no (PRD shape-notes mówi "obsługuje tekst i ewentualne załączniki" — "ewentualne" = decyzja do podjęcia w plan stage; default: tylko tekst).
  - Jak obsługujemy presence / "online now" / typing indicators? — Owner: user. Block: no (nie w NFR; default: pominięte w MVP, dorzucenie w v2 po pilocie).
- **Risk:** **Najwyższe ryzyko produktowe MVP.** Operator wprost akceptuje (shape-notes challenge_chat_value): "czat bez strukturyzacji świadomie zostawiony jako baseline learning-MVP". Możliwe że pilot pokaże niepełną wartość, bo pilotowe firmy oczekują RFQ/draft/PDF (actionable messages w v2). Mitigation: ten plaster JEST eksperymentem; obserwacja jak firmy go używają to główny output pilotu.
- **Suggested research:** `/10x-research` zalecany przed `/10x-plan` — wybór wzorca Supabase Realtime (Postgres Changes vs Broadcast vs Presence) dla 1:1 chatu z historią to jedyna decyzja techniczna w roadmapie, której odpowiedź nie jest oczywista z docs przy pierwszym czytaniu. Research powinien rozstrzygnąć: który kanał dla nowych wiadomości, jak zaprojektować tabele `conversations` / `messages` żeby subscription był wydajny, jak łączyć realtime stream z initial history load (race conditions), jaki wzorzec optimistic UI.
- **Status:** proposed

### S-05: Wyszukiwarka firm po kryteriach branżowych

- **Outcome:** User filtruje firmy po typie polimeru, profilu działalności, regionie; widzi listę wizytówek; klika w wizytówkę żeby otworzyć profil; z profilu może dodać do ulubionych lub otworzyć czat.
- **Change ID:** company-search-by-criteria
- **PRD refs:** US-02, MVP Scope §2 (Wyszukiwarka i Matchmaking)
- **Prerequisites:** S-03
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Czy wyszukiwarka ma być eager (filtry w sidebarze, wyniki update'ują się live) czy form-submit (wybierz filtry → kliknij "szukaj")? — Owner: user. Block: no (kosmetyczne; default eager, bo lepiej eksploruje słownik branżowy).
- **Risk:** W pilocie skali 10 firm filtry zwracają 1-3 wyniki — to świadomie zaakceptowane (shape-notes challenge_search_at_pilot_scale: "marginalny dodatkowy koszt vs build 'tylko lista'"). Architektura gotowa na 200-500 firm w v2. Sequenced po north star, bo w pierwszej fali pilotu Operator seeduje ulubionych offline — wyszukiwarka jest dla "drugiej fali", gdy chcemy zobaczyć czy firmy odkrywają sobie kontrahentów spoza listy ulubionych.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                     | Suggested issue title                                              | Ready for `/10x-plan` | Notes                                  |
| ---------- | ----------------------------- | ------------------------------------------------------------------ | --------------------- | -------------------------------------- |
| F-01       | auth-scaffold                 | Supabase Auth: email/hasło + OAuth Google                          | yes                   | Niezbędne dla każdego user-visible slice. |
| F-02       | multi-tenant-data-rls         | Schemat firm/users/favorites/messages z RLS izolacji per-firma     | yes                   | CRITICAL — NFR izolacji.               |
| F-04       | routing-and-auth-shell        | React-router + auth-protected app shell + layout                   | no                    | Czeka na F-01.                         |
| S-01       | login-and-signout             | UI logowania i wylogowania                                         | no                    | Czeka na F-01 + F-04. Pierwszy user-visible. |
| S-02       | edit-own-company-profile      | Edycja wizytówki własnej firmy ze słownikiem polimerów             | no                    | Czeka na F-02 + S-01.                  |
| S-03       | favorites-and-company-card    | Lista ulubionych + przegląd wizytówki firmy                        | no                    | Czeka na F-02 + S-01. Brama do north star. |
| S-04       | realtime-chat-with-history    | Czat 1:1 realtime między firmami + historia per kontrahent         | no                    | NORTH STAR. Czeka na S-03.             |
| S-05       | company-search-by-criteria    | Wyszukiwarka firm: filtry typ polimeru / profil / region           | no                    | Druga fala pilotu. Czeka na S-03.      |

## Open Roadmap Questions

1. **`market_insight` — dlaczego nikt nie zrobił tego dobrze do tej pory?** — Owner: user. Block: roadmap-wide → no (świadomie pozostawione w shape-notes do dopracowania w trakcie pilotu, nie blokuje builda; ale śledzimy żeby pilot dał odpowiedź).
2. **Domain rule v2 — gdzie aplikacja powinna zacząć decydować za użytkownika?** — Owner: pilot observation. Block: roadmap-wide → no (świadomie odłożone do v2 po obserwacji realnych firm; kandydaci: matchmaking, ranking wyszukiwarki, klasyfikacja wiarygodności firm, strukturyzacja komunikatora RFQ→draft→PDF).
3. **Jakie pola wizytówki firmy są publiczne dla wszystkich zalogowanych, a jakie tylko dla "swoich"?** — Owner: user. Block: F-02 i S-02 → no (decyzja może być podjęta w trakcie planowania; default MVP: cała wizytówka jest publiczna dla zalogowanych, bo cały sens pilotu = firmy widzą się nawzajem).

## Parked

- **Moduł magazynu i produkcji** — Why parked: PRD §"Świadomie poza MVP" + shape-notes v2_offload.
- **Alarmy / powiadomienia mailowe o pasujących firmach lub ogłoszeniach** — Why parked: PRD §"Świadomie poza MVP".
- **Płatności i abonamenty (Stripe)** — Why parked: PRD §"Świadomie poza MVP"; pilot jest free.
- **Role i uprawnienia w obrębie firmy (super-admin / właściciel / pracownik)** — Why parked: shape-notes role_model: "wycofany na rzecz prostoty MVP. Wraca jako otwarta decyzja v2".
- **Gatekeeping firm wbudowany w aplikację** — Why parked: PRD §"Świadomie poza MVP"; w pilocie gatekeeping offline przez Operatora.
- **Actionable Messages (RFQ, draft zamówienia, dokument podsumowujący PDF)** — Why parked: PRD §Smart Messenger; kształt strukturyzacji wyklaruje się po pilocie — to GŁÓWNY learning v2.
- **Publiczna tablica ogłoszeń (Kupię/Sprzedam)** — Why parked: shape-notes matchmaking_vs_marketplace: świadomy wybór wyszukiwarki po wizytówkach zamiast tablicy.
- **Tryb "firma ukryta / tylko zaproszeni"** — Why parked: PRD §Access Control / Widoczność firm; kontrola widoczności wraca na v2.
- **Observability (Sentry/Datadog/OTel)** — Why parked: PRD §NFR — tylko RODO i izolacja są formalnie wymagane; observability nie blokuje pilotu.
- **i18n (drugi język UI)** — Why parked: shape-notes geography: "architektura przygotowana pod i18n od początku, ale dodanie drugiego języka po pilocie".
- **Środowisko pośrednie (staging Supabase + preview deploys)** — Why parked: do momentu wpuszczenia realnych userów pilotowych pracujemy na localhost + pustym prod, brak ryzyka wycieku danych firm. Staging + preview deploys wracają zanim pierwszy realny user dostanie zaproszenie — wtedy prod przestaje być pusty i przestaje być bezpiecznym poligonem.

## Done

(Pusta na pierwsze wygenerowanie. `/10x-archive` dopisuje wpisy tutaj, gdy zamykane są zmiany.)
