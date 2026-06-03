---
project: PolyGo
version: 1
status: draft
created: 2026-06-03
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
---

## Vision & Problem Statement

PolyGo to zamknięta platforma B2B SaaS dla branży tworzyw sztucznych (polimerów), łącząca w jednym miejscu giełdę ogłoszeniową, zarządzanie magazynem oraz wewnętrzny komunikator biznesowy między zweryfikowanymi firmami. Firmy z branży dziś rozpraszają działalność handlową między LinkedIn, WhatsAppy, telefony i horyzontalne marketplace'y B2B — bez kontroli nad tym, kto jest po drugiej stronie i bez śladu po ustaleniach handlowych.

Insight, który odróżnia PolyGo od istniejących kanałów: trzy fundamenty muszą działać razem w jednym środowisku — zweryfikowane firmy (onboarding firmowy z danymi rejestrowymi i deklaracją profilu działalności: producent surowca / recykler / dostawca maszyn / trader), marketplace ogłoszeniowy (oferty kupię / sprzedam / usługa z bezpośrednim kontaktem na platformie) oraz wbudowany komunikator (rozmowy biznesowe nie wychodzą poza platformę, brak handoffu na maile/telefon). Żaden ogólny kanał nie spina tych trzech warstw jednocześnie.

## User & Persona

**Klient (kupujący SaaS):** właściciel firmy z branży polimerów. Kupuje plan z określoną liczbą kont dla pracowników.

**Główny użytkownik (codzienna aktywność):** pracownik firmy — handlowiec, trader, magazynier lub administrator. To on operuje na platformie na co dzień: wystawia ogłoszenia, rozmawia z kontrahentami, zarządza magazynem, buduje listę kontrahentów.

### Secondary persona

**Administrator techniczny** — operator platformy PolyGo (zespół PolyGo, nie klient SaaS). Weryfikuje zgłaszające się firmy, rozstrzyga spory, ma wgląd w stan platformy.

**Typy profili działalności firm obsługiwane przez platformę:**
- Producenci i dostawcy surowców pierwotnych
- Firmy zajmujące się recyklingiem i zarządzaniem odpadami
- Dostawcy maszyn, komponentów i technologii (IT)
- Handlowcy (Traderzy)

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

**Reguła domeny:** PolyGo decyduje, kto i co widzi w ekosystemie — poprzez (1) kontrolę widoczności na podstawie weryfikacji firmy, wybranego trybu widoczności i relacji wynikających z zaproszeń oraz (2) dopasowanie ofert na podstawie alarmów na polimery, profili działalności firm i obserwowanych kontrahentów.

**Reguła 1: Kontrola widoczności (Trust gate).** Wejścia: status weryfikacji firmy (zatwierdzona / oczekująca / odrzucona), tryb widoczności (Pełna / Brak), aktywne relacje (zaakceptowane zaproszenia między firmami). Wyjście: dla każdej pary firm (A, B) decyzja, czy A widzi B (i odwrotnie) w wyszukiwarce firm, w ogłoszeniach i w komunikatorze. Doświadczenie użytkownika: pracownik widzi w wynikach wyszukiwania tylko te firmy, do których ma dostęp; ogłoszenia firm w trybie "Brak widoczności" są niewidoczne dla niezwiązanych firm; zaproszenie otwiera relację mimo ukrycia.

**Reguła 2: Dopasowanie ofert (Matching).** Wejścia: nowe ogłoszenie (polimer, typ kupię/sprzedam/usługa, parametry), alarmy ustawione przez pracowników (polimer + filtry), lista obserwowanych kontrahentów, profile działalności firm. Wyjście: lista pracowników (z firm, które widzą ogłoszenie wg Reguły 1), do których trafia powiadomienie o nowym ogłoszeniu. Doświadczenie użytkownika: handlowiec dostaje powiadomienie "nowe ogłoszenie pasujące do Twojego alarmu PE-LD" tylko wtedy, gdy firma wystawiająca jest widoczna dla jego firmy oraz ogłoszenie pasuje do jego alarmu lub jest od obserwowanego kontrahenta.

**Dlaczego to nie jest empty-CRUD:** bez Reguły 1 PolyGo byłoby publicznym katalogiem firm. Bez Reguły 2 byłoby tablicą ogłoszeń wymagającą ręcznego odświeżania. Razem te reguły dają wartość, której żaden pojedynczy istniejący kanał nie daje.

## Non-Functional Requirements

- Interfejs dostępny w języku polskim w MVP; produkt musi być przygotowany do wprowadzenia kolejnych języków bez przebudowy aplikacji (dodanie języka = dodanie tłumaczeń).
- Produkt działa jako aplikacja webowa na desktopie; musi pozostać użyteczny w ostatnich dwóch wersjach głównych przeglądarek (Chrome, Firefox, Safari, Edge). Wsparcie mobile poza zakresem MVP.
- Panel administratora technicznego (operatora platformy PolyGo) jest oddzielony od aplikacji klienta — administrator nigdy nie operuje z tej samej powierzchni co Właściciel czy Pracownik firmy.
- Przetwarzanie danych firm i pracowników z UE musi być zgodne z RODO. # TODO: doprecyzować konkretne zobowiązania RODO (retencja, prawo do bycia zapomnianym, DPA) — w shape-notes oznaczone "?????????".
- Treść wiadomości w komunikatorze oraz załączane pliki muszą być chronione przed odczytem z poziomu warstwy przechowywania danych. E2E poza zakresem MVP.
- Ogłoszenia oraz dane firm działających w trybie "Brak widoczności" muszą być niedostępne dla użytkowników spoza zatwierdzonej relacji oraz dla osób niezweryfikowanych.
- Każdy pracownik musi być wyraźnie poinformowany — przy logowaniu i w samym komunikatorze — że Właściciel firmy ma wgląd we wszystkie jego rozmowy biznesowe prowadzone na platformie.

## Access Control

Trzy role w MVP:

1. **Administrator techniczny** (operator platformy PolyGo, zespół PolyGo, nie klient SaaS) — weryfikuje zgłaszające się firmy, zarządza spornymi sprawami, ma wgląd w stan platformy. Operuje z oddzielnego panelu administratora.
2. **Właściciel firmy** (klient SaaS) — kupuje plan z określoną liczbą kont, konfiguruje firmę (dane rejestrowe, profil działalności, tryb widoczności), dodaje i usuwa pracowników, płaci za plan.
3. **Pracownik firmy** — codzienna aktywność operacyjna: wystawia ogłoszenia, prowadzi rozmowy w komunikatorze, zarządza magazynem, buduje listę kontrahentów.

**Logowanie:** email i hasło, z opcjonalną możliwością zalogowania kontem Google lub Microsoft (wygodne dla firm pracujących na Workspace / 365).

**Onboarding firmy:**
- Pierwszy użytkownik firmy zakłada konto i automatycznie zostaje Właścicielem firmy.
- Wprowadza dane rejestrowe firmy, dane kontaktowe, profil działalności i główne polimery, którymi operuje (lub inne dane specyficzne dla swojego biznesu).
- Zgłoszenie trafia do weryfikacji Administratora technicznego.
- Po pozytywnej weryfikacji firma staje się aktywna na platformie.

**Tryby widoczności firmy** (decyduje Właściciel):
- **Pełna widoczność** — firma i jej dane kontaktowe widoczne dla wszystkich zweryfikowanych użytkowników platformy.
- **Brak widoczności** — firma ukryta; kontakt nawiązywany wyłącznie przez dedykowane zaproszenia od innych firm lub przez zaproszenie kontrahenta przez Właściciela.

**Zaproszenia międzyfirmowe:** zarówno Właściciel firmy, jak i Pracownik firmy może wysłać zaproszenie do innej firmy (po nazwie / NIP) niezależnie od jej trybu widoczności. Po akceptacji obie firmy widzą się nawzajem mimo trybu "Brak widoczności".

**Wgląd Właściciela w komunikator firmy:** Właściciel firmy ma wgląd w każdą rozmowę prowadzoną przez pracowników jego firmy — zarówno listę wątków (tytuł i ID), jak i ich zawartość. Komunikator nie jest narzędziem do rozmów prywatnych pracowników — przy logowaniu i w samym komunikatorze widoczne jest ostrzeżenie dla pracowników o tym wglądzie. Pozostali pracownicy tej samej firmy NIE widzą wątków innych pracowników (tylko Właściciel). # TODO: otwarte pytanie z shape-notes — czy w przyszłości udostępnić drugi, prywatny tryb komunikatora, który użytkownik mógłby wybrać świadomie. Decyzja odłożona.

**Kryteria weryfikacji firmy:** w MVP brak ustalonych kryteriów. Administrator techniczny ocenia każde zgłoszenie case-by-case na podstawie własnego osądu. Reguły wyklarują się empirycznie z pierwszymi firmami i mogą zostać sformalizowane w v2.
