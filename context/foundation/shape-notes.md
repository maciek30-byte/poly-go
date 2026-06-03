---
project: PolyGo
version: 1
status: draft
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
created: 2026-06-03
updated: 2026-06-03
checkpoint:
  current_phase: 7
  phases_completed:
    - 1
    - 2
    - 3
    - 4
    - 5
    - 6
  gray_areas_resolved:
    - topic: Zakres narracji produktowej
      decision: Pomijamy bóle/insighty/narrację — założenia biznesowe są już domknięte. Sekcje narracyjne PRD trzymane minimalistycznie.
    - topic: Auth
      decision: Email + hasło + opcjonalny OAuth Google/Microsoft.
    - topic: Role w MVP
      decision: "3 role: Administrator techniczny (operator platformy), Właściciel firmy (klient SaaS), Pracownik firmy. Bez działów i custom RBAC w MVP."
    - topic: Tryby widoczności firmy w MVP
      decision: "MVP zawiera: Pełna widoczność / Brak widoczności + system zaproszeń (kluczowe dla wartości produktu)."
    - topic: Zakres MVP — moduły
      decision: "IN: onboarding+weryfikacja, role, widoczność+zaproszenia, marketplace, alarmy na polimery, komunikator z plikami, transakcje (ręczne zatwierdzanie), moduł Kontrahenci. OUT (v2): Magazyn, działy/custom RBAC, automatyzacja transakcji."
    - topic: Timeline
      decision: "Brak deadline'u. Priorytet = dowieźć MVP w pełnej jakości. Szacunek roboczy: ~12 tygodni (do korekty po /10x-prd)."
    - topic: Język i i18n
      decision: MVP w języku polskim. Architektura przygotowana pod i18n od początku — dodawanie języków = dodawanie plików tłumaczeń.
    - topic: Platforma
      decision: Web app desktop-only w MVP. Osobny panel admina. Mobile poza MVP.
    - topic: NFR bezpieczeństwa
      decision: RODO + szyfrowanie wiadomości/plików w spoczynku. E2E poza MVP.
    - topic: Skala i tech-stack preference (forward note)
      decision: "Skala startowa ~10 firm (small). Preferencja Supabase (free tier) — zapisane w `## Forward: tech-stack` dla downstream stack selector."
    - topic: Zaproszenia — kto może wysyłać
      decision: Zarówno Właściciel firmy jak i Pracownik. Zaproszenie jest deklaracją relacji na poziomie firmy, ale każdy pracownik może je zainicjować.
    - topic: Wgląd Właściciela w komunikator
      decision: Właściciel firmy widzi WSZYSTKIE rozmowy pracowników swojej firmy (lista + treść). Pracownicy nawzajem NIE widzą swoich wątków. Pracownik dostaje ostrzeżenie o wglądzie.
    - topic: Weryfikacja firmy
      decision: Manualna decyzja Administratora technicznego, brak ustalonych kryteriów w MVP. Reguły wyklarują się empirycznie z pierwszymi firmami.
    - topic: Timeline budget — pola nieokreślone
      decision: mvp_weeks i after_hours_only ustawione na null (nie określone) — user nie chce się do nich wiązać.
  user_stories_drafted: 11
  quality_check_status: accepted
---

## Vision & Problem Statement

PolyGo to zamknięta platforma B2B SaaS dla branży tworzyw sztucznych (polimerów), łącząca w jednym miejscu giełdę ogłoszeniową, zarządzanie magazynem oraz wewnętrzny komunikator biznesowy między zweryfikowanymi firmami.

Trzy fundamenty produktu, które odróżniają go od ogólnych narzędzi (LinkedIn / WhatsApp / horyzontalne marketplace'y B2B):
- **Zweryfikowane firmy** — onboarding firmowy z danymi rejestrowymi i deklaracją profilu działalności (producent surowca / recykler / dostawca maszyn / trader).
- **Marketplace ogłoszeniowy** — firmy wystawiają oferty (sprzedaż / kup / usługa), inne widzą i nawiązują kontakt bezpośrednio na platformie.
- **Wbudowany komunikator** — rozmowy biznesowe nie wychodzą poza platformę (brak handoffu na maile/telefon).

## User & Persona

**Klient (kupujący SaaS):** właściciel firmy z branży polimerów. Kupuje plan z określoną liczbą kont dla pracowników.

**Główny użytkownik (codzienna aktywność):** pracownik firmy (handlowiec / trader / magazynier / administrator) — to oni operują na platformie na co dzień: wystawiają ogłoszenia, rozmawiają z kontrahentami, zarządzają magazynem.

**Typy profili działalności firm obsługiwane przez platformę:**
- Producenci i dostawcy surowców pierwotnych
- Firmy zajmujące się recyklingiem i zarządzaniem odpadami
- Dostawcy maszyn, komponentów i technologii (IT)
- Handlowcy (Traderzy)

## Access Control

**Trzy role w MVP:**

1. **Administrator techniczny** (operator platformy PolyGo) — weryfikuje zgłaszające się firmy, zarządza spornymi sprawami, ma wgląd w stan platformy. To NIE jest klient SaaS — to my, jako zespół PolyGo.
2. **Właściciel firmy** (klient SaaS) — kupuje plan z określoną liczbą kont. Konfiguruje firmę (dane rejestrowe, profil działalności, tryb widoczności). Dodaje pracowników. Płaci.
3. **Pracownik firmy** — codzienna aktywność operacyjna: wystawia ogłoszenia, prowadzi rozmowy w komunikatorze, zarządza magazynem, buduje listę kontrahentów.

**Logowanie:** email + hasło, z opcjonalnym OAuth Google / Microsoft (wygodne dla firm na Workspace / 365).

**Onboarding firmy:**
- Pierwszy użytkownik firmy zakłada konto → automatycznie zostaje Właścicielem firmy.
- Wprowadza dane rejestrowe firmy, dane kontaktowe, profil działalności i główne polimery którymi operuje, lub inne dane specyficzne dla swojego biznesu
- Zgłoszenie trafia do weryfikacji Administratora technicznego.
- Po pozytywnej weryfikacji firma staje się aktywna na platformie.

**Tryby widoczności firmy** (decyduje Właściciel):
- **Pełna widoczność** — firma i jej dane kontaktowe widoczne dla wszystkich zweryfikowanych użytkowników platformy.
- **Brak widoczności** — firma ukryta; kontakt nawiązywany wyłącznie przez dedykowane zaproszenia od innych firm lub przez zaproszenie kontrahenta przez Właściciela.

**Zaproszenia międzyfirmowe:** zarówno Właściciel firmy jak i Pracownik firmy może wysłać zaproszenie do innej firmy (po nazwie / NIP) niezależnie od ich trybu widoczności. Po akceptacji obie firmy widzą się nawzajem mimo trybu "Brak widoczności".

**Wgląd Właściciela w komunikator firmy:** Właściciel firmy ma wgląd w każdą rozmowę prowadzoną przez pracowników jego firmy (zarówno listę wątków — tytuł i ID — jak i ich zawartość). Komunikator NIE jest narzędziem do rozmów prywatnych pracowników — przy logowaniu i w samym komunikatorze widoczne jest ostrzeżenie dla pracowników o tym wglądzie. Pozostali pracownicy tej samej firmy NIE widzą wątków innych pracowników (tylko Właściciel).
Jesli widzimy potrzebe prywatnej komunikacji, mozemy stworzyc 2 rodzaje komunikatora i wtedy uzytkownicy beda sobie mogli wybrac, pozostawiam jako pytanie otwarte, do dalszej decyzji.
**Kryteria weryfikacji firmy przez Administratora technicznego:** w MVP brak ustalonych kryteriów. Administrator techniczny ocenia każde zgłoszenie case-by-case na podstawie własnego osądu. Reguły weryfikacji wyklarują się w trakcie pracy z pierwszymi firmami i mogą zostać sformalizowane w v2.

## MVP Flow (najmniejszy end-to-end)

1. Firma A rejestruje się → wprowadza dane rejestrowe + profil działalności + polimery, którymi operuje.
2. Administrator techniczny weryfikuje firmę A → firma A staje się aktywna.
3. Właściciel firmy A dodaje pracowników (do limitu z planu).
4. Pracownicy firmy A ustawiają alarmy na polimery, którymi handlują (np. "PE-LD").
5. Firma B (kupujący, po analogicznej rejestracji+weryfikacji) wystawia ogłoszenie "Kupię 5t PE-LD".
6. Firmy z aktywnym alarmem na PE-LD (w tym A) dostają powiadomienie o ogłoszeniu.
7. Pracownik firmy A pisze do pracownika firmy B przez wewnętrzny komunikator.
8. Wymieniają wiadomości i pliki (specyfikacja, faktura proforma, etc.) ustalając warunki.
9. Po dogadaniu warunków — jedna ze stron tworzy rekord transakcji w PolyGo.
10. Druga strona ręcznie potwierdza rekord.
11. Transakcja widnieje jako "zatwierdzona" w obu firmach. PolyGo NIE pośredniczy w płatności ani dostawie — jest tylko zapisem.

## Flow Manualne
- mozliwe jest tez wyszukiwanie reczne, bez marketplace i alarmow, po stronach ofertowych firmy.

## Zakres MVP

**IN MVP:**
- Onboarding firmy + weryfikacja przez Administratora technicznego
- Trzy role (Administrator techniczny / Właściciel firmy / Pracownik firmy)
- Tryby widoczności firmy + system zaproszeń międzyfirmowych
- Marketplace ogłoszeń (sekcje: kupię / sprzedam / usługa)
- Alarmy na polimery — powiadomienia push/in-app/mail przy nowych ogłoszeniach pasujących
- Komunikator wewnętrzny + wymiana plików (specyfikacje, faktury, dokumenty)
- Transakcje — rekord transakcji + ręczne zatwierdzanie obu stron (PolyGo NIE pośredniczy)
- Moduł Kontrahenci — własna baza kontaktów, ulubione, obserwowanie

**OUT MVP (v2):**
- Moduł Magazyn (zarządzanie zapasami + udostępnianie kontrahentom)
- Działy w firmie i custom RBAC
- Automatyzacja transakcji (płatności, escrow, dokumenty)


## User Stories

US-01: Właściciel firmy może zarejestrować firmę (dane rejestrowe, profil działalności, polimery) i wysłać do weryfikacji.
US-02: Administrator techniczny może weryfikować zgłoszenia firm — aktywować lub odrzucać.
US-03: Właściciel firmy może zarządzać pracownikami (dodawać, usuwać, do limitu z planu).
US-04: Właściciel firmy może ustawić tryb widoczności firmy (Pełna widoczność / Brak widoczności).
US-05: Pracownik firmy (Właściciel lub Pracownik) może wysyłać i przyjmować zaproszenia od innych firm — nawiązuje relację mimo trybu "Brak widoczności".
US-06: Pracownik firmy może wystawić ogłoszenie (kupię / sprzedam / usługa) z polimerem, ilością i warunkami.
US-07: Pracownik firmy może przeszukiwać i filtrować ogłoszenia innych firm.
US-08: Pracownik firmy może ustawiać alarmy na polimery i otrzymywać powiadomienia o nowych pasujących ogłoszeniach.
US-09: Pracownik firmy może prowadzić rozmowę w wewnętrznym komunikatorze z pracownikiem innej firmy — wiadomości tekstowe i wymiana plików.
US-10: Pracownicy mogą stworzyć rekord transakcji między firmami i zatwierdzić go obustronnie (PolyGo nie pośredniczy w płatności ani dostawie).
US-11: Pracownik firmy może budować bazę Kontrahentów — dodawać firmy, oznaczać ulubione, obserwować (powiadomienia o ich nowych ogłoszeniach).

## Business Logic

**Reguła domeny:** PolyGo decyduje, kto i co widzi w ekosystemie — poprzez (1) **kontrolę widoczności**: na podstawie weryfikacji firmy, wybranego trybu widoczności (Pełna / Brak) oraz relacji wynikających z zaproszeń — system dla każdej pary firm ustala, czy widzą się nawzajem; oraz (2) **dopasowanie ofert**: na podstawie alarmów na polimery, profili działalności firm i obserwowanych kontrahentów — system kieruje powiadomienia o nowych ogłoszeniach do właściwych pracowników właściwych firm.

**Reguła 1: Kontrola widoczności (Trust gate)**

- Wejścia: status weryfikacji firmy (zatwierdzona / oczekująca / odrzucona), tryb widoczności (Pełna / Brak), aktywne relacje (zaakceptowane zaproszenia między firmami).
- Wyjście: dla pary (firma A, firma B) decyzja czy A widzi B (i odwrotnie) w wyszukiwarce firm, ogłoszeniach, komunikatorze.
- Doświadczenie użytkownika: pracownik widzi w wynikach wyszukiwania tylko te firmy, do których ma dostęp; ogłoszenia firm "Brak widoczności" są niewidoczne dla niezwiązanych firm; zaproszenie otwiera relację mimo ukrycia.

**Reguła 2: Dopasowanie ofert (Matching/Recommendation)**

- Wejścia: nowe ogłoszenie (polimer, typ kupię/sprzedam/usługa, parametry), alarmy ustawione przez pracowników (polimer + filtry), lista obserwowanych kontrahentów, profile działalności firm.
- Wyjście: lista pracowników (z firm, które widzą ogłoszenie wg Reguły 1), do których trafia powiadomienie o nowym ogłoszeniu.
- Doświadczenie użytkownika: handlowiec dostaje powiadomienie "nowe ogłoszenie pasujące do Twojego alarmu PE-LD" tylko wtedy, gdy: (a) firma wystawiająca jest widoczna dla jego firmy, (b) ogłoszenie pasuje do jego alarmu lub jest od obserwowanego kontrahenta.

**Dlaczego to NIE jest empty-CRUD:** bez Reguły 1 PolyGo byłoby publicznym katalogiem firm (jak Panorama Firm). Bez Reguły 2 byłoby tablicą ogłoszeń, którą trzeba odświeżać ręcznie (jak grupa na WhatsAppie). Razem te reguły dają wartość, której żaden pojedynczy istniejący kanał nie daje.

## Non-Functional Requirements

- **Język:** interfejs w języku polskim w MVP, architektura przygotowana pod wielojęzyczność (i18n) — dodanie kolejnych języków sprowadza się do dodania plików tłumaczeń.
- **Platforma:** aplikacja webowa działająca na desktopie. Wspierane ostatnie 2 wersje głównych przeglądarek (Chrome, Firefox, Safari, Edge). Wsparcie mobile poza zakresem MVP.
- **Architektura dostępu:** osobny panel administratora technicznego (operator platformy PolyGo) oddzielony od web app klienta.
- **Zgodność prawna:** zgodność z RODO (przetwarzanie danych firm i pracowników z UE). ?????????
- **Bezpieczeństwo komunikatora:** wiadomości i pliki w komunikatorze szyfrowane w spoczynku (storage). E2E nie jest wymagane w MVP.
- **Widoczność wewnętrzna:** ogłoszenia i dane firm w trybie "Brak widoczności" niedostępne dla niezweryfikowanych użytkowników i niewidoczne poza relacją.
- **Transparentność wglądu Właściciela:** każdy pracownik widzi przy logowaniu i w komunikatorze ostrzeżenie, że Właściciel firmy ma wgląd we wszystkie jego rozmowy biznesowe na platformie.

## Forward: tech-stack

Notatki przekazywane do `/10x-tech-stack-selector` (NIE są częścią PRD):

- **Preferencja backend/db:** Supabase (free tier na start). User chce się zmieścić w darmowym planie dla pierwszych ~10 firm pilotażowych.
- **i18n:** wymóg techniczny — biblioteka i18n od początku, nawet jeśli MVP uruchamia tylko PL.
- **Skala startowa:** ~10 firm × kilku-kilkunastu pracowników (dziesiątki użytkowników w MVP).
