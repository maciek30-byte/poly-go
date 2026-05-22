Pierwsze wdrożenie polyGo na Cloudflare Pages

Plan opisany w tym pliku jest kopią roboczą — finalny artefakt deploy planu ląduje pod context/deployment/deploy-plan.md (zgodnie z instrukcją użytkownika i konwencją z CLAUDE.md § "Foundation paths used by
this lesson"). Treść poniżej i tam jest identyczna.

 ---
Context

PolyGo to invite-only B2B katalog + 1:1 messenger dla polskiej branży tworzyw sztucznych. Repo jest obecnie stockowym scaffoldem vite-react (React 19 + TS + Vite 8, pnpm).
context/foundation/infrastructure.md (2026-05-20) wskazuje Cloudflare Pages jako platformę MVP — wygrywa 5/5 na agent-friendly criteria, $0/mc, Warsaw POP, znana użytkownikowi, brak commercial-use clause.
context/foundation/tech-stack.md potwierdza deployment_target: cloudflare-pages + ci_provider: github-actions + ci_default_flow: auto-deploy-on-merge.

Cel pierwszego wdrożenia: udowodnić end-to-end pipeline (lokalny build → Cloudflare Pages → publiczny URL) z podłączonym projektem Supabase (Frankfurt). CI (GitHub Actions auto-deploy on merge) wpinamy
dopiero po udanym ręcznym deployu, żeby debugowanie pipeline'u nie nakładało się na debugowanie workflow YAML. Cloudflare Access i custom domain (app.polygo.pl) — odroczone do "przed otwarciem zamkniętej
bety".

Decyzje użytkownika (zebrane na etapie planowania):
- Supabase: tworzymy projekt razem z pierwszym deployem (region eu-central-1 / Frankfurt), VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY wpięte w Pages od pierwszego buildu.
- GitHub repo: już istnieje — użytkownik poda URL; plan dodaje git remote add origin <URL> + git push -u origin main.
- Cloudflare Access: odroczone — pierwszy deploy publiczny na polygo.pages.dev.
- Kolejność: najpierw ręcznie z CLI, potem CI.

Pre-flight (read-only) — stan obecny

- git remote -v puste → trzeba dodać origin.
- .github/ brak → workflow YAML nie istnieje.
- package.json nie zawiera wrangler ani @cloudflare/vite-plugin → instalujemy tylko wrangler@^4 (infra docs § 93 mówi wprost: nie używać pluginu, żeby ominąć base-option regression).
- vite.config.ts — stock, bez zmian potrzebnych.
- dist/ jest w .gitignore ✓.
- Konto Cloudflare i konto Supabase musi posiadać użytkownik — to gates manualne, agent ich nie utworzy.

Krytyczne pliki, których plan dotknie

- package.json — dodanie wrangler@^4 do devDependencies.
- pnpm-lock.yaml — aktualizacja po pnpm add.
- .github/workflows/deploy.yml — nowy, używa cloudflare/wrangler-action@v3 (NIE deprecated cloudflare/pages-action@v1 — Unknown Unknowns z infrastructure.md).
- .github/workflows/check-bundle-secrets.yml (lub krok w deploy.yml) — nowy, lint check: grep w dist/ na kształt service-role JWT (mitigation ryzyka "Service-role key prefixed with VITE_" z risk register).
- context/deployment/deploy-plan.md — nowy, finalny artefakt planu (audit trail dla "co miało się stać").
- .env.local.example — nowy, dokumentuje VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY dla lokalnego dev (.env.local w .gitignore przez *.local).
- CLAUDE.md — patch: udokumentować deploy command, post-Pages-to-Workers-migration env-var handoff (mitigation pre-mortem), zakaz VITE_-prefiksu na service-role key.

Recommended approach — pełna sekwencja kroków

Cztery fazy. Każda faza ma manual gate (operacja, którą wykonuje człowiek w panelu / przeglądarce) i agent-executable steps (komendy, które plan-mode agent może odpalić nieasystowanie po zatwierdzeniu).

Faza 0 — Setup zewnętrznych kont (manual gates only)

Nie da się zautomatyzować — wymaga interakcji z UI dostawców.

1. [USER] Cloudflare account — jeśli jeszcze nie ma: https://dash.cloudflare.com/sign-up. Zanotować Account ID (widoczny w prawym sidebarze po zalogowaniu).
2. [USER] Cloudflare API token — Dashboard → My Profile → API Tokens → Create Token → Custom token:
- Permissions: Account → Cloudflare Pages → Edit, Account → Account Settings → Read.
- Account Resources: Include → konkretne konto (nie all accounts).
- Zone Resources: opcjonalnie (potrzebne dopiero przy custom domain).
- TTL: bez limitu albo 1 rok (rotacja przy expiry).
- Zapisać token w bezpiecznym miejscu (1Password / Keychain). Token nie pojawia się ponownie po zamknięciu okna.
3. [USER] Supabase project — https://supabase.com/dashboard → New project:
- Name: polygo.
- Region: eu-central-1 (Frankfurt) (decyzja użytkownika; najniższa latencja dla single-region PL user base).
- Database password: silne hasło, zapisać w 1Password.
- Plan: Free (MVP).
4. [USER] Skopiować z Supabase Project Settings → API:
- Project URL (forma: https://<ref>.supabase.co) → to będzie VITE_SUPABASE_URL.
- anon public key (długi JWT) → to będzie VITE_SUPABASE_ANON_KEY.
- service_role key (drugi długi JWT) — NIE WYKORZYSTUJEMY teraz, zapisujemy do 1Password. NIGDY nie eksponować z prefiksem VITE_* — risk register, krytyczny.

Output fazy 0: 1 Cloudflare API token, 1 Cloudflare Account ID, 1 Supabase Project URL, 1 Supabase anon key, 1 Supabase service-role key (zapisany, niewykorzystany).

Faza 1 — Ręczny deploy (proof of pipeline)

Cel: dowieść, że build + auth + deploy z lokalnej maszyny działa. Bez CI. Bez automatyki.

1. [AGENT] Zainstalować Wrangler v4 w devDependencies (pin major w repo, nie globalnie):
   pnpm add -D wrangler@^4
2. [USER] Wrangler login (browser OAuth, agent nie obsłuży interaktywnego flow):
   pnpm exec wrangler login
3. [AGENT] Utworzyć projekt Pages (one-time, idempotent — drugi raz zwraca błąd "already exists" i to OK):
   pnpm exec wrangler pages project create polygo --production-branch main --compatibility-date 2026-05-21
4. [AGENT] Utworzyć .env.local lokalnie (lub [USER], jeśli woli ręcznie) z prawdziwymi wartościami Supabase. Plik ląduje pod .env.local (ignorowany przez *.local w .gitignore):
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-jwt>
4. Dodać równolegle .env.local.example (committable) z pustymi wartościami, jako dokumentacja.
5. [AGENT] Ustawić te same dwie zmienne w środowiskach Pages — Production i Preview (oba; build runs both w zależności od brancha):
   pnpm exec wrangler pages secret put VITE_SUPABASE_URL --project-name polygo
   pnpm exec wrangler pages secret put VITE_SUPABASE_ANON_KEY --project-name polygo
5. Uwaga: wrangler pages secret put pyta interaktywnie o wartość — ten krok wymaga obecności użytkownika albo paste przez stdin.
6. [AGENT] Build + ręczny deploy na preview branch (NIE main — pierwszy deploy ląduje na preview URL):
   pnpm build
   pnpm exec wrangler pages deploy ./dist --project-name=polygo --branch=preview
6. Wrangler zwróci publiczny URL kształtu https://<hash>.polygo.pages.dev. Gate: otworzyć URL w przeglądarce, sprawdzić, że stock Vite landing page wyświetla się poprawnie. Otworzyć DevTools → Network →
   upewnić się, że żadne odwołanie do Supabase nie zwraca błędu (na tym etapie kodu jeszcze nie ma logiki Supabase, ale jeśli zostanie dodana, env vary są obecne).

Output fazy 1: działający preview URL, potwierdzony pipeline lokalny → Cloudflare. Gdyby tu coś nie zadziałało, agent nie idzie dalej.

Faza 2 — CI (auto-deploy on merge)

Dopiero po udanej Fazie 1.

1. [USER] Dodać GitHub remote (URL istniejącego repo):
   git remote add origin <GITHUB_REPO_URL>
   git push -u origin main
1. Jeśli main ma nieskommitowane zmiany z fazy 1 (Wrangler w package.json, .env.local.example, ewentualne edycje CLAUDE.md), to one też pojadą.
2. [USER] Dodać dwa GitHub secrets w repo Settings → Secrets and variables → Actions:
- CLOUDFLARE_API_TOKEN = token z Fazy 0 kroku 2.
- CLOUDFLARE_ACCOUNT_ID = Account ID z Fazy 0 kroku 1.
  NIE dodawać VITE_SUPABASE_* jako GitHub secrets — one już żyją w Cloudflare Pages env (krok 1.5) i są injectowane przy buildzie w Cloudflare, nie w GitHubie. Trzymanie ich tylko w jednym miejscu redukuje
  powierzchnię błędu.
3. [AGENT] Utworzyć .github/workflows/deploy.yml — minimalny workflow oparty o cloudflare/wrangler-action@v3 (NIE cloudflare/pages-action@v1 — deprecated). Kontrakt:
- Trigger: push na main.
- Steps: actions/checkout@v4 → pnpm/action-setup@v4 (frozen lockfile) → actions/setup-node@v4 (node 20 LTS, cache pnpm) → pnpm install --frozen-lockfile → pnpm build → cloudflare/wrangler-action@v3 z
  command: pages deploy ./dist --project-name=polygo --branch=main.
- Env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID z secrets.
- Bundle leak check — krok przed deployem, który grepuje dist/ na kształt service-role JWT (eyJ.*"role":"service_role" po dekodowaniu nie sprawdzamy; sprawdzamy obecność charakterystycznej Supabase
  service-role frazy). Build fail jeśli match. Mitigation ryzyka z risk register row "Service-role Supabase key accidentally prefixed with VITE_".
4. [AGENT] Commit + push workflow:
   git add .github/workflows/deploy.yml
   git commit -m "ci: cloudflare pages auto-deploy on merge to main"
   git push origin main
5. [USER/AGENT] Obserwować GitHub Actions tab — workflow powinien zakończyć się sukcesem, deploy ląduje na https://polygo.pages.dev (production URL). Gate: otworzyć production URL, potwierdzić działanie.

Output fazy 2: każdy merge na main automatycznie wdraża na polygo.pages.dev. Każdy push na inny branch → preview URL kształtu <branch>.polygo.pages.dev.

Faza 3 — Dokumentacja runbookowa (mitigation pre-mortem)

Pre-mortem z infrastructure.md opisuje scenariusz: Cloudflare wymusza migrację Pages → Workers Static Assets, env vars nie przechodzą, build pojeździ z pustymi VITE_*. Mitigation = utrwalić post-migration
runbook zanim się przyda.

1. [AGENT] Patch CLAUDE.md — dodać sekcję "Deployment runbook" zawierającą:
- Aktualną deploy command (dla Pages): wrangler pages deploy ./dist --project-name=polygo.
- Hipotetyczną deploy command po migracji (dla Workers Static Assets): wrangler deploy z odpowiednim wrangler.toml — z notką "verify against wrangler --help and live docs, nie z blog tutorials" (Unknown
  Unknowns: Wrangler v3 vs v4 argument shape).
- Listę env vars i miejsce, w którym żyją (Cloudflare Pages dashboard / wrangler pages secret), z explicit-jak-cholera zakazem VITE_-prefiksu na service-role key.
- Procedurę rollbacku: wrangler pages deployment list --project-name=polygo → wrangler pages deployment rollback <ID> + ostrzeżenie "rollback nie cofa migracji Supabase".
- Skubskrypcja na Cloudflare changelog RSS — link, żeby user nie przegapił windowa migracji.
2. [AGENT] Commit + push dokumentacji.

Output fazy 3: trwały runbook w CLAUDE.md, czytany przez przyszłe sesje agentów.

Verification (end-to-end)

Po wszystkich fazach, lista kontrolna ostatniego sprawdzenia:

1. curl -I https://polygo.pages.dev/ → 200 OK.
2. pnpm exec wrangler pages deployment list --project-name=polygo → widać przynajmniej 2 deploye (manual preview z fazy 1 + CI deploy z fazy 2), oba success.
3. pnpm exec wrangler pages deployment tail --project-name=polygo przez ~30 s podczas otwierania URL w przeglądarce → log access requesta dla / i assetów.
4. W przeglądarce na polygo.pages.dev → DevTools → Application → Local Storage / Cookies — pusto (Supabase jeszcze niewywoływany w kodzie, anon key obecny tylko jako env var w bundle).
5. grep -o 'service_role' dist/**/*.js || echo OK — pusto = pass.
6. GitHub Actions tab → ostatni run deploy.yml = green check, sumaryczny czas < 3 min (sanity check budżetu CI).
7. Test rollbacku (smoke): wziąć przed-ostatni deployment ID z listy, wrangler pages deployment rollback <ID>, otworzyć URL — żaden visible change (bo to ten sam kod), ale w deployment list widać nowy
   deployment z tym samym hashem. Następnie rollback do najnowszego (lub push nowego commit) żeby przywrócić main.

Out of scope (świadomie odroczone)

- Cloudflare Access w przed produkcją — decyzja użytkownika, włączymy przed zamkniętą betą (osobny plan).
- Custom domain app.polygo.pl — to samo, przed betą.
- Supabase schema, RLS policies, auth flows — to /10x-implement / future skill territory, nie deploy.
- Email notifications — explicit non-goal z PRD (FR-019).
- Pages → Workers Static Assets migration runbook execution — utrwalony jako dokumentacja, ale wykonywany tylko gdy Cloudflare faktycznie zaplanuje window.
- Multi-region failover, dedicated DR plan — infrastructure.md § Out of Scope.
- Wrangler GA Pages "Direct upload" vs "Git integration" — wybieramy Direct upload przez wrangler pages deploy ./dist z CI, bez integracji Cloudflare-side z GitHubem (mniej powierzchni, jeden punkt
  kontroli). Git integration odroczona jeśli kiedykolwiek byłaby pożądana.

Risk register (z infrastructure.md, posortowane wg trafień w tym planie)

Wszystkie risks z infra docs są respektowane przez ten plan. Mapping:

- Pages → Workers auto-migration: faza 3 (runbook w CLAUDE.md) + faza 2 (zero zależności od Pages-specific features poza wrangler pages deploy).
- pages.dev discoverable: świadomie zaakceptowane na pierwszy deploy; Cloudflare Access + custom domain w follow-up planie.
- Service-role key in client bundle: faza 2 krok 3 (lint check w CI) + faza 3 (dokumentacja w CLAUDE.md).
- Cloudflare Access tier transition: nie aktywne (Access odroczony).
- Wrangler v3 tutorials: faza 1 krok 1 (pin wrangler@^4 w package.json) + faza 3 (notka w CLAUDE.md).
- @cloudflare/vite-plugin regression: nie używamy pluginu — plain wrangler pages deploy ./dist.
- cloudflare/pages-action@v1 deprecated: faza 2 krok 3 (standaryzacja na wrangler-action@v3).
- Fork-PR previews unavailable: zaakceptowane (no outside contributors).
- Edge cache invalidation: zaakceptowane (Cloudflare purguje auto per deploy).
- Pre-mortem composite: faza 3 (runbook) + faza 2 (lint check).

Kolejność wykonania (TL;DR dla post-plan-mode execution)

- Pages → Workers auto-migration: faza 3 (runbook w CLAUDE.md) + faza 2 (zero zależności od Pages-specific features poza wrangler pages deploy).
- pages.dev discoverable: świadomie zaakceptowane na pierwszy deploy; Cloudflare Access + custom domain w follow-up planie.
- Service-role key in client bundle: faza 2 krok 3 (lint check w CI) + faza 3 (dokumentacja w CLAUDE.md).
- Cloudflare Access tier transition: nie aktywne (Access odroczony).
- Wrangler v3 tutorials: faza 1 krok 1 (pin wrangler@^4 w package.json) + faza 3 (notka w CLAUDE.md).
- @cloudflare/vite-plugin regression: nie używamy pluginu — plain wrangler pages deploy ./dist.
- cloudflare/pages-action@v1 deprecated: faza 2 krok 3 (standaryzacja na wrangler-action@v3).
- Fork-PR previews unavailable: zaakceptowane (no outside contributors).
- Edge cache invalidation: zaakceptowane (Cloudflare purguje auto per deploy).
- Pre-mortem composite: faza 3 (runbook) + faza 2 (lint check).

Kolejność wykonania (TL;DR dla post-plan-mode execution)

1. Faza 0: user setup kont + tokenów (manual).
2. Faza 1: install Wrangler → wrangler login → utworzyć Pages project → wpiąć env vars → ręczny deploy na preview branch → otworzyć URL i potwierdzić.
3. Faza 2: git remote add origin <URL> + push → dodać GitHub secrets → napisać workflow → commit + push → potwierdzić zielony build i działający production URL.
4. Faza 3: patch CLAUDE.md → commit + push.
5. Verification checklist.
   ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌