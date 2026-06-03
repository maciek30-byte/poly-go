---
project: PolyGo
version: 1
status: draft
created: 2026-06-03
scope: MVP (~10 firm pilotażowych, 50–150 użytkowników)
stack_reference: tech-stack.md
---

## Cel dokumentu

Analiza kosztów hostingu i usług zewnętrznych dla MVP PolyGo przy skali startowej ~10 firm pilotażowych. Cel użytkownika: utrzymać $0/mies tak długo jak to możliwe, świadomie wiedząc kiedy i dlaczego wpadnie pierwszy koszt.

## Wybrany stos a darmowe plany

Stack ustalony w `tech-stack.md`:
- **Frontend hosting:** Cloudflare Pages
- **Backend / DB / Auth / Realtime / Storage:** Supabase
- **CI/CD:** GitHub Actions
- **Email transactional (poza Auth):** do dobrania — rekomendacja Resend
- **Płatności:** Stripe (gdy włączone)

## Supabase Free Tier — co dostajesz

Stan na 2026-06.

- 2 projekty równolegle
- 500 MB Postgres
- 1 GB storage (pliki w komunikatorze: specyfikacje, faktury proforma — patrz US-09)
- 5 GB egress / miesiąc
- **Realtime: 200 jednoczesnych połączeń, 2 mln messages / miesiąc** — komunikator + alarmy (US-08, US-09)
- **Auth: 50k Monthly Active Users**, włącznie z OAuth Google / Microsoft (PRD § Access Control)
- 500k wywołań Edge Functions / miesiąc — kanał do wysyłki powiadomień mailowych (US-08)
- `pg_cron` natywnie w Postgres — harmonogramowanie po stronie bazy bez dodatkowego serwisu
- Row Level Security (RLS) jako mechanizm autoryzacji — **kluczowe dla Reguły 1 z PRD**

## Mapowanie limitów na skalę PolyGo

Przy 10 firmach × 5–15 pracowników = 50–150 użytkowników:

| Zasób | Limit free | Szacowane zużycie | Margines |
|---|---|---|---|
| Postgres | 500 MB | ~50 MB (firmy + ogłoszenia + wiadomości tekstowe) | bardzo szeroki |
| Storage | 1 GB | ~200–500 MB (załączniki w komunikatorze) | komfortowy |
| Egress | 5 GB / mies | ~1–2 GB | komfortowy |
| Realtime — połączenia | 200 jednoczesnych | ~150–200 przy pełnym pilocie | **na granicy** |
| Realtime — messages | 2 mln / mies | dużo niżej | bardzo szeroki |
| Auth MAU | 50k | ≤ 150 | bardzo szeroki |
| Edge Functions wywołania | 500k / mies | ~10–50k (powiadomienia) | komfortowy |

## Trzy gwiazdki Supabase Free

**Gwiazdka #1 — pauza projektu po 7 dniach nieaktywności.**
Jeśli przez tydzień nikt nie tknie projektu, Supabase pauzuje bazę. Pierwsze żądanie po pauzie czeka 30–60s na wstanięcie. Dla aktywnego pilota bez znaczenia; dla okresów martwych (demo raz na miesiąc) — denerwujące.
*Mitigation:* cron raz dziennie pingujący prosty endpoint (np. Cloudflare cron triggers → HTTP GET na Supabase).

**Gwiazdka #2 — moment, w którym płacisz Pro plan ($25/mies).**
Wskoczysz na Pro gdy:
- przekroczysz któryś z limitów (mało prawdopodobne przy 10 firmach pilotażowych w pierwszych 6–12 miesiącach),
- potrzebujesz daily backups (free ma tylko PITR z ostatnich 7 dni),
- chcesz formalnego wsparcia,
- przekroczysz 200 jednoczesnych połączeń Realtime (Pro ma 500 + per-connection pricing).

**Gwiazdka #3 — Realtime balansuje na granicy przy pełnym pilocie.**
Każda otwarta karta z komunikatorem = jedno połączenie. 150 pracowników × ~1.3 karty ≈ 200 połączeń.
*Mitigation:*
- subskrybować Realtime tylko gdy karta jest aktywna (Page Visibility API),
- rozłączać po idle (np. 5 minut),
- monitorować w panelu Supabase od pierwszego tygodnia produkcji.

## Cloudflare Pages — co dostajesz

- 100k requestów / dzień (≈ 3M / mies) — dla pilota wielokrotny zapas
- Statyczny hosting + edge CDN globalnie
- Custom domeny + SSL gratis
- Cloudflare Workers (jeśli kiedyś potrzeba edge-compute przed Supabase) — 100k requestów / dzień free

Pierwszy koszt: dopiero gdy ruch przekroczy 100k req/dzień. Na pilocie nieosiągalne.

## Email transactional — czego Supabase NIE pokrywa

Auth maile (verification, password reset) wysyła Supabase z własnej infrastruktury — to działa od razu.

Powiadomienia produktowe z US-08 ("nowe ogłoszenie pasujące do Twojego alarmu PE-LD") musisz wysłać sam, ze swojej domeny. Opcje free:

| Provider | Free limit | Plus |
|---|---|---|
| **Resend** | 3 000 maili / mies (100 / dzień) | najprostszy DX, dobra dokumentacja, react-email templates |
| Postmark | 100 / dzień trial | bardzo dobra dostarczalność |
| AWS SES | praktycznie darmowe | tania skala, ale uciążliwa konfiguracja domeny i moderacji |

**Rekomendacja:** Resend Free na start. Wystarczy dla pilota (10 firm × kilka alarmów dziennie). Gdy przekroczysz 3k / mies — Resend Pro $20/mies za 50k.

## Stripe — koszt zerowy do pierwszej transakcji

Stripe nie ma "free limit" ani opłat abonamentowych. Płacisz prowizję od transakcji (~1.4% + 0.25 PLN dla EU cards na karty europejskie). Czyli koszt pojawia się dopiero gdy ktoś faktycznie kupuje plan PolyGo. Dla okresu pre-revenue MVP = $0.

## GitHub Actions — limit free

- 2000 minut / miesiąc dla prywatnych repo
- Nieograniczone dla publicznych
- Przy CI/CD vite-react (build + test) ~3–5 min na PR — wystarczy dla solo dewa z 50–100 commitami / mies

## Pełny obraz kosztów MVP

| Składnik | Koszt / mies |
|---|---|
| Supabase Free | $0 |
| Cloudflare Pages | $0 |
| Resend Free | $0 |
| GitHub Actions (prywatne repo) | $0 |
| Stripe (prowizja, gdy płatności włączone) | tylko od transakcji |
| Domena .com (amortyzacja ~$12/rok) | ~$1 |
| **Razem stały koszt MVP** | **~$1 / mies** |

## Ryzyka i zarządzanie nimi

### Ryzyko 1: vendor lock-in Supabase Realtime

Supabase Realtime to ich własna implementacja na Postgres replication. Migracja bazy gdzie indziej oznacza przepisanie komunikatora i alarmów od zera. Dla MVP akceptowalne; warto być świadomym przy decyzjach o v2.

### Ryzyko 2: RLS musi być skonfigurowane od pierwszego dnia

Reguła 1 z PRD ("kto co widzi" — kontrola widoczności) to w praktyce polityka RLS w Postgresie. Karta startera ostrzega wprost: *"Supabase RLS must be configured early or auth gaps creep in"*. Konsekwencje błędu: firmy widzą cudze dane — krytyczny incydent zaufania i potencjalne naruszenie RODO (NFR z PRD).

**Działanie:** od pierwszej migracji bazy każda tabela ma włączony RLS i jawne policies; testy integracyjne sprawdzają widoczność między firmami A i B w obu kierunkach.

### Ryzyko 3: Edge Functions to Deno, nie Node

Edge Functions w Supabase działają na Deno. Większość bibliotek npm zadziała (Deno ma kompatybilność), ale rzadkie wyjątki bywają. Dla powiadomień mailowych (Resend SDK) to nie problem — SDK działa na Deno.

### Ryzyko 4: pauza projektu po 7 dniach

Patrz Gwiazdka #1. Pingowanie cronem rozwiązuje.

## Werdykt

Supabase + Cloudflare Pages + Resend Free + GitHub Actions to najtańsza realistyczna ścieżka do działającego PolyGo MVP. Przy skali 10 firm pilotażowych można trzymać ~$1/mies (sama domena) przez 6–12 miesięcy. Pierwszy realny koszt wpadnie albo z Pro Supabase ($25/mies) gdy przekroczone Realtime / backupy / wsparcie, albo z Resend Pro ($20/mies) gdy maile > 3k/mies — oba sygnalizują, że produkt rośnie i koszt jest do uzasadnienia przed siebie samym.

## Sygnały do monitorowania w trakcie pilota

Od pierwszego tygodnia produkcji w panelu Supabase pilnować:
- Realtime concurrent connections — czy zbliża się do 200
- Database size — czy zbliża się do 500 MB (najpierw zapełni się tabela wiadomości)
- Storage size — czy załączniki nie idą szybciej niż przewidywano
- Egress — łatwo przeoczyć, a jest najsztywniejszym limitem przy storage'u plików

W panelu Resend pilnować dziennego throughput maili (limit 100/dzień, czyli ~3 alarmy na firmę dziennie przy 10 firmach).
