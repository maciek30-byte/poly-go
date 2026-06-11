---
project: PolyGo
researched_at: 2026-06-08
updated: 2026-06-11
recommended_platform: Cloudflare Pages
runner_up: Netlify
context_type: mvp
environments: localhost + prod (preview/staging świadomie wyłączone do momentu wpuszczenia userów)
---

## Recommendation

**Deploy on Cloudflare Pages.** Koszt $0 indefinitely (unlimited bandwidth + requests dla statycznych assetów) i PoP w Warszawie + Frankfurt + Amsterdam = najlepsza latencja dla użytkowników w PL/EU.

## Environment model (aktualny stan — solo dev, pre-pilot)

**Świadomie tylko dwa środowiska: `localhost` + `prod`.** Preview deploys są wyłączone (`paths-ignore` + `ci(deploy): disable PR preview deploys (solo workflow)`); staging Supabase nie istnieje.

**Dlaczego to jest OK teraz**: prod nie ma jeszcze realnych userów ani danych firm pilotowych — jest pusty / zawiera tylko dane testowe Operatora. Weryfikacja zmian odbywa się lokalnie (`npm run dev` + lokalny lub współdzielony Supabase) i bezpośrednio na prod po merge na `main`. Brak ryzyka wycieku danych firm, bo nie ma jeszcze cudzych danych do wycieku.

**Kiedy to przestaje być OK**: zanim pierwszy realny user pilotowy dostanie zaproszenie. Wtedy prod przestaje być pusty i przestaje być bezpiecznym poligonem — dopiero w tym momencie wprowadzamy środowisko pośrednie (staging Supabase + włączone preview deploys w Cloudflare Pages). Jest to udokumentowane w `roadmap.md` (Parked: "Środowisko pośrednie").

## Shortlisted Platforms

#### 1. Cloudflare Pages (Recommended)

- **Koszt**: $0 indefinitely dla MVP — unlimited bandwidth, unlimited requests dla statycznych assetów. Limit: 500 build minutes/mc (wystarczające dla solo dev), 20k plików/site, 25 MiB/asset.
- **CLI**: `wrangler pages deploy ./dist --project-name=polygo` headless przez `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`. Rollback `wrangler rollback <deployment-id>`.
- **Latencja PL/EU**: PoP w Warszawie + Frankfurt + Amsterdam, TTFB <20ms typowo dla polskich użytkowników.

> _Netlify rozważany ponownie jeśli Cloudflare Pages zostanie zdeprecjonowany (patrz Risk Register). Vercel odrzucony — commercial-use ban na Hobby tier._

## Caveats

1. **Strategic deprecation drift**: Cloudflare od kwietnia 2025 oficjalnie poleca **Workers Static Assets** dla nowych projektów. Pages nie ma EOL, ale wszystkie nowe feature'y idą Workers-first. Wybór Pages w czerwcu 2026 to zakład na produkt w cichym sunset — w horyzoncie 12-18 miesięcy konieczna migracja.
2. **SPA routing silent gotcha**: `/* /index.html 200` w `_redirects` jest silently ignored ("Infinite loop detected" w build logach). React Router DOM "działa" tylko bo Pages auto-serwuje `index.html` dla 404. Dodanie `404.html` w `public/` zepsuje SPA routing bez ostrzeżenia, runtime, na produkcji.
3. **Limits 20k plików + 25 MiB/asset**: dla MVP 7 user stories OK, ale i18n + lazy chunks + asset-heavy company cards mogą zbliżyć do limitu w v2.

## Gotchas

- **WAW PoP outages**: odnotowane incydenty w warszawskim PoP (przykład 2026-05-15 ze status page). Auto-failover do FRA/AMS to +20-30ms latency, nie downtime — ale ten kompromis nie jest reklamowany.
- **Direct Upload vs Git-integration lock-in**: przy `wrangler pages project create` musisz wybrać raz — projekt **nie da się skonwertować** później.
- **Pages Functions ≠ Workers Functions**: różny runtime/quota; migracja Pages → Workers wymaga przepisania Functions.
- **`wrangler pages deployment tail` bug po rollback**: unresolved issue [`workers-sdk#2262`](https://github.com/cloudflare/workers-sdk/issues/2262) — po rollback `tail` nie działa na ostatnim deploymencie. Konsekwencja: rollback + debugowanie = ślepota agenta.
- **500 build minutes vs iteracje agentowe**: solo dev pushujący 10+ razy dziennie z każdym PR robiącym preview build → ~25 dni pełnych pracy mieści się w free tier; hardcap blokuje builds (nie chargeback, lepiej niż Netlify), ale CI staje.

## Deployment

- **Preview deploys**: **wyłączone** w workflow (`ci(deploy): disable PR preview deploys (solo workflow)` + `paths-ignore` na push events). Powód: solo dev, brak realnych userów na prod, weryfikacja na prod jest tańsza i wystarczająca. Wracają zanim wpuścimy pierwszego pilotowego usera (wtedy konieczny też osobny Supabase staging — patrz Risk Register #2).
- **Verification flow (pre-pilot)**: `npm run dev` lokalnie → przegląd zmian na localhost → merge do `main` → auto-deploy na prod (`deploy.yml`) → weryfikacja na prod. Prod jest pusty / zawiera dane testowe Operatora, więc "verify on prod" nie naraża cudzych danych.
- **Secrets**: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` jako GitHub Secrets (scoped token: Account → Cloudflare Pages → Edit). Supabase keys jako Environment Variables w Pages dashboard, scope **Production** (Preview scope nieaktywny do momentu wpuszczenia userów). Rotacja: regenerate API token w Cloudflare dashboard → update GH Secrets → re-run failed deploy. Brak automatic rotation; ręczna co 6 miesięcy.
- **Rollback**: `wrangler rollback <deployment-id>` lub Cloudflare dashboard ("Rollback" button na deployment). Time-to-revert: ~30s do propagacji edge. **Caveat**: rollback nie cofa migracji Supabase — schema changes wymagają osobnego rollback w Supabase CLI (`supabase db reset` lub manualny migration revert). Po rollbacku `wrangler pages deployment tail` ma znany bug (#2262) — debugowanie wymaga pobierania logów z dashboard.
- **Logs**: dla statycznego SPA brak runtime logs — `wrangler pages deployment list` (lista deploymentów), Cloudflare Web Analytics (traffic, free, no cookie banner). Jeśli dodasz Pages Function: `wrangler pages deployment tail` live tail. Read-only przez MCP: `observability.mcp.cloudflare.com/mcp` (runtime logs/analytics) i `builds.mcp.cloudflare.com/mcp` (build logs).

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Cloudflare Pages strategic sunset (EOL ogłoszony w 6-18mc) | M | M | Trzymać deployment script w `wrangler` (Pages i Workers Static Assets dzielą CLI). Audytować Cloudflare changelog co kwartał. Migracja Pages → Workers Static Assets jest 1 zmianą w `wrangler.toml` + DNS swap; trzymać projekt w stanie gotowym do migracji (nie używać Pages-only feature'ów). |
| Wpuszczenie pilotowego usera bez wcześniejszego dodania środowiska pośredniego (staging Supabase + włączone preview deploys) | M | **CRITICAL** | Aktualny model "weryfikacja na prod" działa TYLKO dopóki prod jest pusty. Trigger do reaktywacji preview + utworzenia staging Supabase: zanim pierwszy realny user dostanie zaproszenie pilotowe. Checklist: (1) utworzyć osobny projekt Supabase "staging", (2) ustawić `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` w Pages env vars pod scope "Preview", (3) włączyć preview deploys w `deploy.yml`, (4) zaktualizować ten dokument. Udokumentować zakaz "weryfikujemy na prod" w AGENTS.md od momentu wpuszczenia userów. |
| Supabase Auth OAuth callback fallback na nieprawidłowy URL | M | H | We wszystkich `signInWithOAuth({ options: { redirectTo } })` wymóg explicit `redirectTo: window.location.origin + '/auth/callback'`. Helper function `getAuthRedirect()` w `lib/auth.ts` — agent musi używać helpera, nie inline string. Weryfikacja na localhost (dev) i prod (po merge). Dodać reguły linta (custom ESLint rule lub grep w pre-commit). |
| SPA routing silent breakage przy dodaniu `404.html` | L | H | Nie dodawać `public/404.html` — polegać na auto-fallback do `index.html`. Nie pisać `_redirects` z `/* /index.html 200`. Udokumentować w AGENTS.md jako "DO NOT". |
| Direct Upload vs Git-integration lock-in przy create | M | L | Wybrać **Direct Upload** przy `wrangler pages project create polygo` (kompatybilne z GitHub Actions, headless CI/CD). Udokumentować w README że konwersja niemożliwa — nowy projekt jeśli kiedyś chcesz Git-integration. |
| `wrangler pages deployment tail` bug po rollback | M | L | Po rollback pobierać logi przez Cloudflare dashboard albo MCP `observability.mcp.cloudflare.com/mcp`. Issue tracking: cloudflare/workers-sdk#2262. |
| 500 build min/mc cap przy intensywnej iteracji agentowej | L | L | Monitor usage w Cloudflare dashboard. Skip preview build dla docs-only PRs przez `paths-ignore` w GitHub Action. Pro tier $20/mc daje 5000 build min jeśli przekroczysz w v2. |
| 20k plików / 25 MiB asset cap w v2 (i18n, lazy chunks, asset-heavy company cards) | L | M | Dla MVP nie dotyczy. W v2: zdjęcia/PDF do Supabase Storage (CDN tam), Vite chunk splitting konfiguracja, sourcemaps tylko dla prod (nie preview). |

## Checklist wdrożenia

- [ ] Zainstaluj wrangler (lokalna dependency, nie globalna — version pinning)
  ```bash
  npm install --save-dev wrangler
  npx wrangler --version  # potwierdź 4.x lub nowszy
  ```

- [ ] Utwórz projekt Pages (jeden raz; wybierz Direct Upload, nie Git-integration — patrz Risk Register)
  ```bash
  npx wrangler pages project create polygo --production-branch=main
  ```

- [ ] Pierwszy deploy do testu (przed setupem CI)
  ```bash
  npm run build  # Vite → dist/
  npx wrangler pages deploy ./dist --project-name=polygo --commit-dirty=true
  ```

- [ ] Skonfiguruj GitHub Actions workflow (`.github/workflows/deploy.yml`) — auto-deploy-on-merge zgodnie z `tech-stack.md`
  - Użyj `cloudflare/wrangler-action@v3`
  - Secrets: `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit scope) i `CLOUDFLARE_ACCOUNT_ID`
  - Build: `npm ci && npm run build`
  - Deploy: `wrangler pages deploy ./dist --project-name=polygo`
  - Branches: `main` → production. Preview deploys świadomie wyłączone do momentu wpuszczenia pilotowych userów.

- [ ] Skonfiguruj Supabase env vars w Pages dashboard (Settings → Environment Variables)
  - Scope **Production**: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` → projekt **prod** Supabase
  - Scope **Preview**: nieaktywne (brak preview deploys). Wraca przy reaktywacji preview — patrz Risk Register.
  - Lokalny dev: `.env.local` z prod Supabase credentials (akceptowalne, bo prod jest pusty pre-pilot; **zmienić** zanim wpuścimy pierwszego usera).

- [ ] **Pre-pilot trigger checklist** (wykonać zanim pierwszy realny user dostanie zaproszenie):
  - [ ] Utworzyć osobny projekt Supabase "staging"
  - [ ] Wpisać staging credentials do scope "Preview" w Pages env vars
  - [ ] Włączyć preview deploys w `deploy.yml` (usunąć disable + przywrócić preview branches)
  - [ ] Przepiąć lokalny `.env.local` na staging credentials
  - [ ] Zaktualizować ten dokument: usunąć "świadomie wyłączone", zaktualizować Risk Register
  - [ ] Dodać do AGENTS.md regułę: "nie weryfikujemy na prod od dziś"
