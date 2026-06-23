# Agent Rules

Operating rules for AI agents (Claude Code, others) working in this repo. Read before making changes.

## Stan środowisk

- **Jedno środowisko Supabase**: `polygo-prod` (project ID `yaejbsodwhixywjpqhau`, region eu-central-1).
- **Brak preview deploys**. GitHub Actions deploy odpala się WYŁĄCZNIE na push do `main`; PR-y nie tworzą `<branch>.polygo.pages.dev`. Solo dev → push-to-main, lokalny `pnpm dev` zastępuje preview.
- Local dev i production (`da9d2456.polygo.pages.dev`) **używają tych samych Supabase credentials**.
- **Weryfikujemy zmiany bezpośrednio na prod**. To jest OK, dopóki prod jest pusty / zawiera tylko dane testowe Operatora — brak realnych userów = brak cudzych danych do wycieku. Flow: `pnpm dev` lokalnie → merge do `main` → auto-deploy → weryfikacja na `da9d2456.polygo.pages.dev`.
- Świadoma decyzja, udokumentowana w `context/foundation/infrastructure.md` (sekcje "Environment model" + Risk Register #2) i `context/foundation/deployment-plan-v2.md` ("Świadomie odroczone ryzyka"). **Trigger reaktywacji preview + dodania staging Supabase**: zanim pierwszy realny user pilotowy dostanie zaproszenie. Od tego momentu "verify on prod" przestaje być dozwolone — pełna checklista w `infrastructure.md` → "Pre-pilot trigger checklist".

## Deployment / Infrastructure DO NOTs

- **NEVER** dodawaj `pull_request:` event do `.github/workflows/deploy.yml` — preview deploys są celowo wyłączone do momentu wpuszczenia pierwszego usera. Każdy PR build = zużyte build minutes i ad-hoc URL bez wartości dodanej (i tak weryfikujemy na prod). Test code change przez `pnpm dev` lokalnie → merge do `main` → weryfikacja na `da9d2456.polygo.pages.dev`.
- **NEVER** deployuj ręcznie z brancha innego niż `main` bez świadomej potrzeby — `wrangler pages deploy --branch=<inny>` utworzy ad-hoc preview URL który hituje prod Supabase. Jeśli MUSISZ (np. demo dla siebie), usuń ten deployment po teście: `wrangler pages deployment list --project-name=polygo` + delete via dashboard.
- **NEVER** twórz tabel bez RLS — każda nowa tabela musi mieć `enable row level security` w migracji + przynajmniej jedną polisę. Przy jedynym Supabase RLS jest jedyną obroną między userami.
- **NEVER** create `public/404.html` — Cloudflare Pages auto-fallback do `index.html` jest jedyną SPA routing strategy. Dodanie `404.html` SILENTLY breaks SPA routing on prod.
- **NEVER** write `_redirects` z `/* /index.html 200` — silently ignored przez CF Pages, fake security blanket.
- **NEVER** inline `redirectTo` w `signInWithOAuth` — używaj helpera `getAuthRedirect()` z `src/lib/auth.ts` (gdy zostanie utworzony). Inline string = fallback na preview URL = OAuth callback hijacking.
- **NEVER** commituj `.env.local` — gitignored, ale zawsze sprawdź `git status` przed `git add -A`.
- **NEVER** używaj `--no-verify` przy commit / push (gdy będą pre-commit hooks).
- **NEVER** używaj `git add -A` lub `git add .` bez sprawdzenia `git status` — `.env*` jest ignored, ale obce artefakty (np. `feedback.json` jeśli nie zignorowany) mogą się prześlizgnąć.

## Deployment DOs

- Pracuj w aplikacji na osobnym koncie testowym (osobny user w `auth.users`), nie na koncie pilota.
- Rollback prod: `pnpm exec wrangler pages deployment list --project-name=polygo` → wybierz target ID → `pnpm exec wrangler rollback <id> --project-name=polygo`. Pamiętaj że rollback NIE cofa Supabase migrations — schema changes wymagają osobnego rollbacku w Supabase.
- Logi po rollback: pobieraj z CF dashboard, NIE `wrangler pages deployment tail` (broken na ostatnim deploy po rollback — issue cloudflare/workers-sdk#2262).
- Rotacja `CLOUDFLARE_API_TOKEN`: ręcznie co 6 miesięcy, regenerate w CF dashboard → `gh secret set CLOUDFLARE_API_TOKEN` → re-run failed deploy jeśli stary token był aktywny w workflow.

## Operacje wykonywane ręcznie przez właściciela projektu

Niektóre operacje **zawsze wykonuje user, nie agent**. Agent przygotowuje precyzyjną listę poleceń / kroków, ale ich nie odpala ani nie edytuje plików, które są ich efektem.

- **Instalacje i aktualizacje pakietów npm** — `pnpm add`, `pnpm remove`, `pnpm update`, bezpośrednia edycja `package.json` / `pnpm-lock.yaml`. Agent dostarcza listę paczek (z wersjami i flagą `-D` jeśli devDep) — user uruchamia `pnpm add ...` ręcznie i commituje wynik.
- **Operacje w panelach Supabase** (Authentication, Database settings, Storage, Edge Functions config, project settings, RLS Force toggle) — agent opisuje co kliknąć i gdzie, user wykonuje w dashboardzie.
- **Operacje w Google Cloud Console / OAuth provider panels** (Google OAuth client config, Microsoft Azure AD app registration, redirect URIs, scopes) — j.w., agent dostarcza dokładną instrukcję, user klika.
- **Operacje w Cloudflare dashboard** (Pages project settings, custom domains, environment variables, API tokens, deployment delete/rollback przez UI) — j.w. Wyjątek: `wrangler` CLI calls jeśli user explicit poprosi.
- **Operacje w GitHub UI** (secrets, branch protection rules, repo settings) — j.w. `gh` CLI dozwolone tylko jeśli user explicit poprosi.
- **Jakiekolwiek panele admin / billing / quota** dowolnego dostawcy (Stripe, Sentry, itd.) — zawsze user.

Reguła: jeśli operacja wymaga zalogowania do zewnętrznego panelu UI albo zmienia stan poza repo / lokalnym środowiskiem deweloperskim — agent nie wykonuje, tylko spisuje precyzyjną instrukcję.

## Code conventions (compensating for vite-react not being convention-based)

`tech-stack.md` flagged vite-react as failing the convention-based gate. Until codified, defaults:

- **Path aliases**: relative imports `./` and `../` only (no `@/` alias) until tsconfig path mapping is set up explicitly.
- **Folder layout**:
  - `src/lib/` — pure modules, no React (e.g., `supabase.ts`, future `auth.ts`).
  - `src/components/` — reusable React components shared across slices.
  - `src/routes/` — page-level components, one file per route.
  - **Hooks live with the slice that owns them**, not in a global `src/hooks/`. Auth hooks → koło `auth-store.ts` w `src/lib/` (lub w katalogu auth slice'a). Hooki specyficzne dla jednej feature (np. wyszukiwarka, czat) → katalog tej feature (np. `src/routes/search/use-search.ts`). Tylko hooki naprawdę cross-cutting i bez ownera trafiają do `src/lib/`.
- **Filenames**: `kebab-case.ts` for `lib` / hooks, `PascalCase.tsx` for components and routes.
- **State**: React Router DOM for routing; no Redux/Zustand until concrete need.

## Known follow-ups (not blocking, but track)

- **Node 20 deprecation in GitHub Actions**: `actions/checkout@v4`, `setup-node@v4`, `wrangler-action@v3`, `pnpm/action-setup@v4` use Node 20 internally. GitHub forces Node 24 from **2026-06-16**. When upgrading actions, prefer waiting for `@v5` over `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` workaround.
- **RLS Force toggle**: enable "Force RLS on all new tables" in Supabase dashboard before creating the first table (Settings → Database → row level security defaults).
- **Cloudflare Pages strategic drift**: CF officially recommends Workers Static Assets for new projects since April 2025. Re-evaluate migration in Q4 2026 (audit `wrangler.jsonc` for Pages-only fields then).

## Documentation map

- `README.md` — project overview, dev workflow, deployment commands
- `context/foundation/` — shape-notes, PRD, tech-stack, infrastructure, deployment-plan (v2 active)
- `context/changes/bootstrap-verification/` — scaffold verification log
