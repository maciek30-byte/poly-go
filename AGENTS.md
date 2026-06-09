# Agent Rules

Operating rules for AI agents (Claude Code, others) working in this repo. Read before making changes.

## Stan środowisk

- **Jedno środowisko Supabase**: `polygo-prod` (project ID `yaejbsodwhixywjpqhau`, region eu-central-1).
- Local dev, preview deploys (`<branch>.polygo.pages.dev`), and production (`polygo.pages.dev`) **all use the same Supabase credentials**.
- Świadoma decyzja, udokumentowana w `context/foundation/deployment-plan-v2.md` sekcja "Świadomie odroczone ryzyka". Trigger dodania staging: pierwszy pilot z zewnętrznym userem, schema migration wymagająca testu, lub incident.

## Deployment / Infrastructure DO NOTs

- **NEVER** udostępniaj preview URL (`*.polygo.pages.dev` non-prod) osobom spoza developera — preview hituje prod Supabase, każda interakcja zostaje w realnej bazie.
- **NEVER** rób destrukcyjnych testów (`delete from`, `truncate`, etc.) przez UI na preview deploy — to są realne dane prod.
- **NEVER** twórz tabel bez RLS — każda nowa tabela musi mieć `enable row level security` w migracji + przynajmniej jedną polisę. Przy współdzielonym Supabase RLS jest jedyną obroną między userami.
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

## Code conventions (compensating for vite-react not being convention-based)

`tech-stack.md` flagged vite-react as failing the convention-based gate. Until codified, defaults:

- **Path aliases**: relative imports `./` and `../` only (no `@/` alias) until tsconfig path mapping is set up explicitly.
- **Folder layout**:
  - `src/lib/` — pure modules, no React (e.g., `supabase.ts`, future `auth.ts`).
  - `src/components/` — reusable React components.
  - `src/routes/` — page-level components, one file per route.
  - `src/hooks/` — custom React hooks.
- **Filenames**: `kebab-case.ts` for `lib`/`hooks`, `PascalCase.tsx` for components and routes.
- **State**: React Router DOM for routing; no Redux/Zustand until concrete need.

## Known follow-ups (not blocking, but track)

- **Node 20 deprecation in GitHub Actions**: `actions/checkout@v4`, `setup-node@v4`, `wrangler-action@v3`, `pnpm/action-setup@v4` use Node 20 internally. GitHub forces Node 24 from **2026-06-16**. When upgrading actions, prefer waiting for `@v5` over `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` workaround.
- **RLS Force toggle**: enable "Force RLS on all new tables" in Supabase dashboard before creating the first table (Settings → Database → row level security defaults).
- **Cloudflare Pages strategic drift**: CF officially recommends Workers Static Assets for new projects since April 2025. Re-evaluate migration in Q4 2026 (audit `wrangler.jsonc` for Pages-only fields then).

## Documentation map

- `README.md` — project overview, dev workflow, deployment commands
- `context/foundation/` — shape-notes, PRD, tech-stack, infrastructure, deployment-plan (v2 active)
- `context/changes/bootstrap-verification/` — scaffold verification log
