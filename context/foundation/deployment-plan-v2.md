---
project: PolyGo
plan_created_at: 2026-06-08
plan_revised_at: 2026-06-08
revision: v2
target_platform: Cloudflare Pages
project_name_cf: polygo
package_name: poly-go
supabase_environments: prod-only
based_on:
  - context/foundation/infrastructure.md
  - context/foundation/tech-stack.md
status: ready-to-execute
---

## Zmiany vs v1

- **Jedno środowisko Supabase (`polygo-prod`), bez staging.** Decyzja użytkownika: na obecnym etapie nie ma potrzeby drugiego projektu. Konsekwencje opisane w sekcji "Świadomie odroczone ryzyka" niżej — to NIE jest tymczasowe niedopatrzenie.
- Usunięty Etap 2 (staging projekt), uproszczony Etap 3 (jeden scope env vars), usunięty preview-vs-prod verify check w Etapie 7.

## Cel

Pierwsze wdrożenie SPA (Vite + React + TypeScript) na Cloudflare Pages z auto-deploy-on-merge przez GitHub Actions, podpięte do jednego projektu Supabase (`polygo-prod`). Plan rozszerza i poprawia rekomendacje z `infrastructure.md` o brakujące kroki wymagane przez aktualny stan repo.

## Stan wyjściowy (audyt)

- `package.json` nazywa się `bootstrap-scaffold` (zostawione przez scaffolder) — wymaga renamingu na `poly-go`.
- Brak `wrangler` w `devDependencies` — checklist w `infrastructure.md` zakłada lokalną instalację, ale nie jest zainstalowany.
- Brak `@supabase/supabase-js` — tech-stack.md zakłada Supabase, ale klient nie jest jeszcze dodany. **Decyzja**: dodajemy minimalny klient w Etapie 2 razem z env varami, żeby pierwszy deploy zawierał już working połączenie (smoke test).
- Brak `git remote origin` — repo GitHub istnieje (potwierdzone przez użytkownika), ale lokalne repo nie jest jeszcze do niego podpięte. **Warunek wstępny do Etapu 4**.
- Brak `.github/workflows/` — workflow do utworzenia w Etapie 4.
- Brak `AGENTS.md` — `infrastructure.md` referuje go jako miejsce dla zasad "DO NOT" (np. zakaz `public/404.html`). **Tworzony w Etapie 5**.
- `README.md` to nietknięty template Vite — zastępujemy real-info o deploymencie w Etapie 5.
- `.gitignore` zawiera już `dist` — OK, ale brak `.env.local` jako wykluczenia explicit. Dodajemy w Etapie 1.
- Wersje pinned: `wrangler@4.98.0` (current latest, spełnia wymóg "4.x lub nowszy"), `@supabase/supabase-js@2.107.0`.

## Świadomie odroczone ryzyka (czytaj zanim zaczniesz)

Plan v2 używa **jednego** projektu Supabase — preview deploys na PRach **będą uderzać w ten sam Supabase co produkcja**. Jest to świadoma decyzja, nie przeoczenie. Konsekwencje:

1. **Preview deploys piszą do prod DB.** Każdy `<branch>.polygo.pages.dev` używa tych samych credentials co `polygo.pages.dev`. Test na PR = realne dane w prod tabelach.
   - **Mitigacja procesowa**: do czasu dodania staging — żadnych destrukcyjnych testów przez UI na preview, żadnych share preview URL z osobami spoza developera. AGENTS.md to formalizuje.
   - **Mitigacja techniczna**: RLS od dnia pierwszego (każda tabela `enable row level security`, polityki ograniczające dostęp do `auth.uid()`-ownera). Bez RLS preview może namieszać w danych innych użytkowników.
2. **Lokalny `.env.local` używa prod credentials.** Naruszenie zasady "NIGDY prod w lokalnym `.env`" z `infrastructure.md`. Konsekwencja: każdy `pnpm dev` może modyfikować dane produkcyjne.
   - **Mitigacja**: dev na koncie testowym (osobny user w `auth.users`), nie na koncie, które dostanie pilot.
3. **Anon key dla prod jest w git history po pierwszym commit env example.** Anon key z założenia jest publiczny (idzie do klienta przeglądarki), więc RLS jest jedyną realną obroną. To wzmacnia punkt 1.

**Trigger dodania staging (zaplanować osobno)**: pierwsza z poniższych okoliczności:
- Zbliża się pilot z realnymi firmami (≥1 zewnętrzny user spoza developera).
- Wprowadzasz schemat migracji wymagających testu przed prod.
- Bug w preview deploy uszkadza dane prod (incident-driven).

Wtedy: utwórz `polygo-staging`, dodaj scope Preview w CF Pages, zmień lokalny `.env.local` na staging. To dodatkowy etap, nie część obecnego planu.

## Etap 0 — Warunki wstępne (manual, ~5 min)

- [ ] **Konta gotowe**: Cloudflare account, Supabase organization, GitHub repo `poly-go` (user potwierdził, że istnieje).
- [ ] **Cloudflare API token**: w Cloudflare dashboard → My Profile → API Tokens → Create Token → custom token z permission **Account → Cloudflare Pages → Edit** (scoped do jednego konta, nie globalny). Skopiuj raz, do `gh secret set` w Etapie 4 — token nie będzie widoczny ponownie.
- [ ] **Cloudflare Account ID**: dashboard URL po zalogowaniu zawiera ID; alternatywnie `dashboard → workers → overview` (prawy panel).
- [ ] **`gh` CLI authenticated**: `gh auth status` musi pokazać aktywny login. Jeśli nie — `gh auth login` (interaktywny).

## Etap 1 — Sanityzacja repo (lokalne, ~5 min)

- [ ] **Rename pakietu**: zmień `package.json:2` z `"name": "bootstrap-scaffold"` na `"name": "poly-go"`. Powód: spójność z `tech-stack.md` (`project_name: poly-go`) i z nazwą CF Pages projektu.
- [ ] **Dodaj wrangler jako lokalną devDependency** (nie globalna — version pinning per repo):
  ```bash
  pnpm add -D wrangler@4.98.0
  pnpm exec wrangler --version  # potwierdź 4.98.x
  ```
- [ ] **Dodaj Supabase klient**:
  ```bash
  pnpm add @supabase/supabase-js@2.107.0
  ```
- [ ] **Rozszerz `.gitignore`** o:
  ```
  .env
  .env.local
  .env.*.local
  .wrangler/
  ```
  Powód: `.env.local` (Supabase credentials) nie może trafić do repo. `.wrangler/` to lokalny cache wranglera.
- [ ] **Sanity build**: `pnpm build` musi przejść lokalnie zanim ruszymy z CI. Jeśli failuje → fix przed dalszymi krokami (nie ma sensu konfigurować deploy na broken build).

## Etap 2 — Supabase: jeden projekt prod (~10 min)

> **Dlaczego najpierw Supabase, potem Cloudflare**: env vars w Pages dashboard wymagają URL + anon key z istniejącego projektu.

- [ ] **Utwórz projekt prod**: Supabase dashboard → New Project → name `polygo-prod`, region `eu-central-1` (Frankfurt — najbliższe PoP CF), strong DB password (zapisz do password managera, NIE do repo). Plan: **Free tier** (zgodne z shape-notes — pilot ~10 firm).
- [ ] **Zapisz credentials** (Settings → API): `URL` + `anon public key` → potrzebne do CF Pages env vars (Etap 3) i lokalnego `.env.local`.
- [ ] **Włącz RLS na poziomie projektu jako domyślny**: Supabase dashboard → Database → Tables → ustawienie "Force RLS on all new tables". To proaktywna obrona, biorąc pod uwagę że preview deploys + lokalny dev używają prod credentials.
- [ ] **Lokalny `.env.local`** (NIE commitować — gitignored w Etapie 1):
  ```
  VITE_SUPABASE_URL=<polygo-prod URL>
  VITE_SUPABASE_ANON_KEY=<polygo-prod anon key>
  ```
  **Świadoma decyzja**: lokalny dev używa prod — patrz "Świadomie odroczone ryzyka" punkt 2. Mitigacja: developer pracuje na osobnym koncie testowym.
- [ ] **Smoke client** (`src/lib/supabase.ts`, ~10 linii):
  ```ts
  import { createClient } from '@supabase/supabase-js'
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  export const supabase = createClient(url, anonKey)
  ```
  Cel: build/runtime od razu fail-fast, jeśli env vars nie są wstrzyknięte. Bez tego cały deploy może "działać" na pustym kliencie — silent failure.
- [ ] **`pnpm dev`** lokalnie z `.env.local` → otwórz devtools → sprawdź że `supabase` instance jest tworzony bez błędu. Smoke pass = gotowi do CF.

## Etap 3 — Cloudflare Pages: projekt + pierwszy deploy ręczny (~10 min)

- [ ] **Auth wranglera**: `pnpm exec wrangler login` — otworzy browser, zaloguj się do CF. Token z Etapu 0 jest do CI, lokalnie używamy interactive login.
- [ ] **Utwórz projekt Pages** (jednorazowo — wybór Direct Upload vs Git-integration jest IRREVERSIBLE, patrz risk register w `infrastructure.md`):
  ```bash
  pnpm exec wrangler pages project create polygo \
    --production-branch=main
  ```
  **Wybór: Direct Upload** (default w nie-interaktywnym trybie z flagą `--production-branch`). Kompatybilne z GitHub Actions, nie blokuje przyszłej migracji do Workers Static Assets.
- [ ] **Konfiguruj env vars** (jeden scope — Production; brak osobnych dla Preview, bo używamy tego samego Supabase wszędzie):
  ```bash
  pnpm exec wrangler pages secret put VITE_SUPABASE_URL --project-name=polygo
  # paste: <polygo-prod URL>
  pnpm exec wrangler pages secret put VITE_SUPABASE_ANON_KEY --project-name=polygo
  # paste: <polygo-prod anon key>
  ```
  **Co z Preview scope?** Cloudflare Pages w v2 planie pozostawia scope Preview pusty — przy braku osobnych env vars CF Pages **dziedziczy** wartości z Production. Efekt: preview deploys używają prod Supabase (zgodne z decyzją "jedno środowisko"). Jeśli kiedyś dodajemy staging, wtedy ustawiamy scope Preview osobno (krok manual w dashboard, bo `wrangler pages secret put` nie ma flagi `--env preview` — issue cloudflare/workers-sdk#5577).
- [ ] **Pierwszy ręczny deploy** (test smoke przed CI):
  ```bash
  pnpm build
  pnpm exec wrangler pages deploy ./dist \
    --project-name=polygo \
    --branch=main \
    --commit-dirty=true
  ```
  - **Sprawdź**: deployment URL `https://<hash>.polygo.pages.dev` ładuje się, devtools → Network → brak 500/CORS na Supabase init.
  - Jeśli aplikacja zawiesi się na "Missing VITE_SUPABASE_*" → env vars w scope Production niepoprawne; powtórz `wrangler pages secret put`.

## Etap 3.5 — `wrangler.toml` (opcjonalny, ale recommended)

- [ ] **Utwórz `wrangler.toml` w root** (pozwala przyszłą migrację Pages → Workers Static Assets bez zmiany kodu, tylko swap konfiga):
  ```toml
  name = "polygo"
  compatibility_date = "2026-06-08"
  pages_build_output_dir = "./dist"
  ```
  Powód: trzymanie konfiga w repo = audit trail i odtwarzalność. Bez tego deploy command musi zawsze podawać `--project-name=polygo` ręcznie.

## Etap 4 — GitHub Actions: auto-deploy-on-merge (~15 min)

- [ ] **Dodaj remote** (warunek wstępny — repo `poly-go` już istnieje na GitHubie):
  ```bash
  git remote add origin git@github.com:<your-username>/poly-go.git
  git push -u origin main
  ```
- [ ] **Ustaw GitHub Secrets przez gh CLI** (bardziej audit-friendly niż dashboard):
  ```bash
  gh secret set CLOUDFLARE_API_TOKEN     # paste token z Etapu 0
  gh secret set CLOUDFLARE_ACCOUNT_ID    # paste account ID z Etapu 0
  ```
- [ ] **Utwórz `.github/workflows/deploy.yml`**:
  ```yaml
  name: Deploy

  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
      paths-ignore:
        - '**.md'
        - 'context/**'
        - '.idea/**'

  permissions:
    contents: read
    deployments: write
    pull-requests: write

  jobs:
    deploy:
      runs-on: ubuntu-latest
      timeout-minutes: 10
      steps:
        - uses: actions/checkout@v4

        - uses: pnpm/action-setup@v4
          with:
            version: 9

        - uses: actions/setup-node@v4
          with:
            node-version: 22
            cache: 'pnpm'

        - run: pnpm install --frozen-lockfile
        - run: pnpm build

        - name: Deploy to Cloudflare Pages
          uses: cloudflare/wrangler-action@v3
          with:
            apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
            accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
            command: pages deploy ./dist --project-name=polygo --branch=${{ github.head_ref || github.ref_name }}
  ```
  **Kluczowe decyzje**:
  - `paths-ignore` na `**.md` i `context/**` — chroni przed marnowaniem build minutes (500/mc cap, patrz risk register).
  - `--branch=${{ github.head_ref || github.ref_name }}` — `main` → production, każdy inny → preview na `<branch>.polygo.pages.dev` (używający prod Supabase — patrz "Świadomie odroczone ryzyka").
  - `pnpm` zgodne z `tech-stack.md` (`package_manager: pnpm`).
  - `timeout-minutes: 10` — backstop, nie runaway build.
  - `permissions: deployments: write, pull-requests: write` — wrangler-action może komentować preview URL na PR.
- [ ] **Commit + push**:
  ```bash
  git add .github package.json pnpm-lock.yaml src/lib/supabase.ts wrangler.toml .gitignore
  git commit -m "feat(deploy): scaffold Cloudflare Pages deployment + Supabase client"
  git push
  ```
  GitHub Actions powinno odpalić workflow → po ~2-3 min nowy deployment widoczny w CF Pages dashboard.

## Etap 5 — Dokumentacja i guardraily (~10 min)

- [ ] **Zastąp template `README.md`** sekcją "Deployment" zawierającą:
  - Link do `context/foundation/deployment-plan-v2.md` (ten plik) i `infrastructure.md`.
  - Komendy: `pnpm dev`, `pnpm build`, `pnpm exec wrangler pages deploy` (escape hatch dla emergency deploys).
  - URL produkcji + Supabase dashboard (jako reference).
- [ ] **Utwórz `AGENTS.md`** w root z sekcją "DO NOT" (referowane przez risk register w `infrastructure.md`):
  ```markdown
  # Agent Rules

  ## Stan środowisk

  - **Jedno środowisko Supabase**: `polygo-prod`. Preview deploys (`<branch>.polygo.pages.dev`) i lokalny dev używają tych samych credentials co produkcja. Decyzja w `context/foundation/deployment-plan-v2.md`, sekcja "Świadomie odroczone ryzyka".

  ## Deployment / Infrastructure DO NOTs

  - **NEVER** udostępniaj preview URL (`*.polygo.pages.dev` non-prod) osobom spoza dewelopera — preview hituje prod Supabase, każda interakcja zostaje w realnej bazie.
  - **NEVER** rób destrukcyjnych testów (delete/truncate) przez UI na preview — to są realne dane prod.
  - **NEVER** twórz tabel bez RLS — każda nowa tabela musi mieć `enable row level security` od pierwszej migracji. To jedyna obrona przed wyciekiem między user-ami przy współdzielonym Supabase.
  - **NEVER** create `public/404.html` — Cloudflare Pages auto-fallback do `index.html` jest jedyną SPA routing strategy. Dodanie `404.html` SILENTLY breaks SPA routing on prod.
  - **NEVER** write `_redirects` z `/* /index.html 200` — silently ignored przez CF Pages, fake security blanket.
  - **NEVER** inline `redirectTo` w `signInWithOAuth` — używaj helpera `getAuthRedirect()` z `src/lib/auth.ts` (gdy zostanie utworzony). Inline string = fallback na preview URL = OAuth callback hijacking.
  - **NEVER** używaj `--no-verify` przy commit / push — pre-commit hooks (gdy będą) chronią przed leakiem sekretów.

  ## Deployment DOs

  - Pracuj w aplikacji na osobnym koncie testowym (auth.users), nie na koncie pilota.
  - Rollback: `pnpm exec wrangler rollback <deployment-id> --project-name=polygo` (lub CF dashboard button). Pamiętaj że rollback nie cofa Supabase migrations.
  - Logi po rollback: pobieraj z CF dashboard, NIE `wrangler pages deployment tail` (broken na ostatnim deploy po rollback — issue #2262).
  - Rotacja `CLOUDFLARE_API_TOKEN`: ręcznie co 6 miesięcy, regenerate w CF dashboard → `gh secret set CLOUDFLARE_API_TOKEN` → re-run failed deploy.
  ```

## Etap 6 — Weryfikacja end-to-end (~5 min)

- [ ] **Production deploy verify**:
  - Otwórz `https://polygo.pages.dev` (lub custom domain jeśli skonfigurowany później).
  - Devtools → Network → `index.html` powinien zwrócić **200**, nie 404.
  - Devtools console: `console.log(import.meta.env.VITE_SUPABASE_URL)` zwraca URL `polygo-prod`.
- [ ] **Preview deploy verify** (smoke, nie izolacja):
  - Utwórz test branch: `git checkout -b deploy-smoke-test`, mała zmiana w `App.tsx` (np. zmiana tytułu), push, otwórz PR.
  - Wait ~2-3 min → CF Pages comment na PR z preview URL `https://deploy-smoke-test.polygo.pages.dev`.
  - Otwórz preview URL → JS ładuje się, brak runtime errors. Console pokazuje **prod** Supabase URL — to jest oczekiwane przy jednym środowisku.
  - Zamknij PR bez merge, usuń branch: `git checkout main && git branch -D deploy-smoke-test`.
- [ ] **Rollback drill** (sanity, nie destrukcyjny):
  - `pnpm exec wrangler pages deployment list --project-name=polygo` — sprawdź historic deployments są widoczne.
  - **NIE wykonuj** real rollback w pierwszym wdrożeniu — tylko zweryfikuj że komenda zwraca poprawną listę.

## Co celowo NIE jest w tym planie

- **Drugie środowisko Supabase (staging)**: świadomie odroczone — patrz sekcja "Świadomie odroczone ryzyka" oraz trigger dodania.
- **Custom domain** (`polygo.io` / `.pl`): wymaga DNS setup i provider-specific kroków, dodajemy po MVP launch (osobny doc).
- **Pages Functions / Workers**: SPA jest pure-static, nie potrzebuje runtime CF. Jeśli pojawi się potrzeba (np. webhook handler) — to osobny plan, bo migracja Pages Functions → Workers Functions wymaga przepisania (gotcha z `infrastructure.md`).
- **Supabase migrations CI**: schema-as-code i migration workflow to osobny etap (po pierwszej tabeli). `infrastructure.md` już zauważa że rollback CF nie cofa Supabase migrations — to wymaga oddzielnego pipeline'u.
- **OAuth callback helper** (`src/lib/auth.ts:getAuthRedirect()`): wspomniany w risk register, ale tworzony dopiero gdy faktycznie wdrażamy login flow (nie blokuje pierwszego deploy).
- **Web Analytics / observability**: free, ale wymaga `<script>` tag w `index.html` — defer do post-MVP launch.

## Risk recheck (delta vs infrastructure.md)

- **Preview → prod Supabase leak (CRITICAL w `infrastructure.md`)**: **świadomie nie zaadresowane** w v2. `infrastructure.md` zalecał osobny staging projekt jako CRITICAL mitigację — v2 odracza ten krok do trigger-driven momentu (patrz "Świadomie odroczone ryzyka"). Tymczasowe mitigacje: RLS od pierwszej tabeli, brak share preview URL, dev na koncie testowym, AGENTS.md formalizuje zasady.
- **`wrangler pages secret put` brak `--env preview`**: nie dotyczy v2 (jeden scope), ale zostaje udokumentowane na wypadek przyszłego dodania staging.
- **`package.json` rename**: nieuwzględnione w `infrastructure.md`, ale konieczne dla spójności z `tech-stack.md`.
- **RLS jako warunek bezpieczeństwa**: przy współdzielonym Supabase RLS jest **jedyną** obroną między userami. `infrastructure.md` nie nadaje temu priorytetu (zakładał izolację per-projekt) — v2 wymaga RLS od pierwszej tabeli i wpisuje to do AGENTS.md.

## Definition of done

Plan uważa się za wykonany gdy WSZYSTKIE z poniższych są spełnione:

1. `https://polygo.pages.dev` zwraca 200 i ładuje React app.
2. Preview deploy na nowym branchu działa (preview używa prod Supabase — zgodne z planem).
3. `git push` do `main` triggeruje workflow → deploy do production scope CF Pages bez ręcznej interwencji.
4. `pnpm exec wrangler pages deployment list` zwraca poprawną historic listę.
5. `AGENTS.md` (z explicit notką o jednym środowisku) + zaktualizowany `README.md` są w repo.
6. **Żadne** credentials Supabase ani CF tokens nie są w git history (`git log -p | grep -iE "supabase|cloudflare" | grep -i key` → empty).
7. Pierwsza utworzona tabela w Supabase ma `enable row level security` (gdy do tego dojdzie — wpisane w AGENTS.md).
