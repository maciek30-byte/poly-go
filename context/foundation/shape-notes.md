---
project: PolyGo
context_type: greenfield
created: 2026-06-08
updated: 2026-06-08
version: 2
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
checkpoint:
  current_phase: 7
  phases_completed: [1, 2, 3, 4, 5, 6]
  gray_areas_resolved:
    - topic: pain_segment
      decision: Cały proces składania zamówienia jest rozproszony — nie ma jednego dominującego segmentu; ból ciągnie się od znalezienia kontrahenta przez negocjację po domknięcie.
    - topic: market_insight
      decision: OTWARTE — użytkownik świadomie nie zna jeszcze odpowiedzi "dlaczego ten problem nie jest rozwiązany". Do dopracowania w fazie 6 (challenge round) lub w trakcie pilotu z firmami.
    - topic: geography
      decision: Polska — firmy polskie obracające polimerami między sobą. PLN, język polski, polskie realia (NIP, VAT, JPK). Architektura przygotowana pod i18n od początku — dodanie kolejnego języka w przyszłości sprowadza się do dostarczenia tłumaczeń, bez refaktoru.
    - topic: auth_method
      decision: Email + hasło, plus OAuth Google/Microsoft. Konta tworzone ręcznie (seeding) — brak self-registration w MVP.
    - topic: role_model
      decision: BRAK RÓL w MVP. Wszyscy zalogowani użytkownicy mają te same uprawnienia. Trzy-rolowy model (super-admin / właściciel / pracownik) wcześniej rozważany został wycofany na rzecz prostoty pilota. Wraca jako potencjalna decyzja v2.
    - topic: company_onboarding
      decision: Firmy seedowane RĘCZNIE do bazy danych — operator (autor projektu) wprowadza firmy przed pilotem na podstawie wcześniej zebranej listy. Brak self-onboardingu, brak formularza rejestracji firmy, brak gatekeepingu w aplikacji. Gatekeeping zaufania dzieje się offline.
    - topic: user_onboarding
      decision: Konta użytkowników też seedowane ręcznie — operator dostaje od pilotowych firm listę osób, tworzy im konta i przekazuje login/hasło lub link aktywacyjny. Pilot 10 firm × ~5–15 osób = ~50–150 kont do seeda.
    - topic: matchmaking_vs_marketplace
      decision: Brak publicznej tablicy ogłoszeń (Kupię/Sprzedam). Zamiast tego — wyszukiwarka po wizytówkach firm z filtrami branżowymi (typ polimeru, frakcja, region, profil działalności). Inicjacja kontaktu odbywa się przez wyszukanie firmy → otwarcie czatu.
    - topic: messenger_scope_v1
      decision: Smart Messenger w MVP = ZWYKŁY CZAT 1:1 między firmami z historią. Actionable Messages (RFQ, draft zamówienia, dokument podsumowujący PDF) świadomie odłożone — kształt strukturyzacji wyklaruje się po obserwacji pilotu. Konsekwencja: w MVP "transakcyjność" komunikatora jest aspiracyjna, nie zaimplementowana.
    - topic: favorites_in_mvp
      decision: Ulubieni Kontrahenci w MVP — prosta lista, użytkownik może oznaczyć firmę jako ulubioną i mieć szybki dostęp.
    - topic: v2_offload
      decision: Świadomie poza MVP — moduł magazynu i produkcji, alarmy/powiadomienia mailowe, płatności Stripe, role i uprawnienia, gatekeeping firm w aplikacji, actionable messages (RFQ/draft/PDF).
    - topic: mvp_timeline
      decision: 3 tygodnie, solo, po godzinach. Bardzo lean MVP — przyjęte świadomie po pokazaniu trade-offu.
    - topic: domain_rule
      decision: BRAK REGUŁY DOMENOWEJ w MVP. PolyGo v1 to świadomie tooling layer (wyszukiwarka + czat + ulubieni) — aplikacja niczego sama nie decyduje. Logika domenowa (matchmaking, scoring, ranking, klasyfikacja firm) odłożona na v2 po obserwacji jak realne firmy używają narzędzia w pilocie. Operator akceptuje, że "empty-tooling-layer" jest ryzykiem PMF — pilot ma to zweryfikować.
    - topic: nfr_scope
      decision: Tylko dwa twarde NFR-y w MVP — RODO compliance i izolacja danych między firmami. Reszta (polski UI, responsywność mobile, accessibility WCAG, realtime <2s, browser support, uptime) świadomie NIE jest twardo wymagana. Operator akceptuje, że pomimo iż w praktyce większość z nich i tak będzie obecna, formalnie zobowiązanie ogranicza się do dwóch krytycznych.
    - topic: challenge_operator_persona
      decision: Operator PolyGo usunięty z User & Persona — działa POZA aplikacją (direct DB / skrypt seedingowy), nie jest użytkownikiem UI. Zostaje jedna primary persona (Handlowiec).
    - topic: challenge_chat_value
      decision: Czat bez strukturyzacji ŚWIADOMIE zostawiony jako baseline learning-MVP. Operator akceptuje ryzyko, że pilot pokaże niepełną wartość — celem pilotu jest uczenie się, JAK firmy chcą strukturyzować komunikację, żeby v2 (actionable messages) odpowiadało realnym potrzebom, a nie założeniom a priori. Dodana wzmianka o tym ryzyku w Vision.
    - topic: challenge_search_at_pilot_scale
      decision: Wyszukiwarka z filtrami zachowana w MVP mimo skali 10 firm. Architektura gotowa na skalowanie (200–500 polskich firm polimerowych docelowo). W pilocie filtry zwracają 1–3 wyniki, ale design jest skończony. Marginalny dodatkowy koszt vs build "tylko lista" — uznany za uzasadniony.
  user_stories_drafted: 7
  quality_check_status: accepted
---

## Vision & Problem Statement

Handlowiec w polskiej firmie obracającej polimerami (kupno-sprzedaż surowca pierwotnego, regranulatu, frakcji odpadowych) prowadzi proces składania zamówienia rozproszony pomiędzy mailem, WhatsAppem i telefonem. Cały ciąg — od zapytania o dostępność, przez negocjację specyfikacji (typ polimeru, frakcja, ilość, cena, termin), aż po potwierdzenie — żyje w kilku kanałach naraz. Wątki się gubią, specyfikacje krzyżują (zła frakcja, zła ilość, zły termin), na pytanie "co właściwie ustaliliśmy" nie ma jednego źródła prawdy, a gdy coś się sypnie — nie ma śladu kto co powiedział.

Insight, który uzasadnia "dlaczego teraz" i "dlaczego nikt jeszcze tego nie zrobił dobrze", jest świadomie pozostawiony jako otwarte pytanie — autor projektu rozpoznaje ból, ale nie ma jeszcze gotowej teorii rynku. Otwarta hipoteza to: branża jest hermetyczna, generyczne narzędzia (CRM-y, komunikatory) nie znają języka polimerów, a istniejące platformy B2B w tej branży są katalogami ogłoszeniowymi, nie operacyjnymi środowiskami obsługującymi cały proces transakcyjny. Hipoteza wymaga weryfikacji na pilocie.

**Świadome ryzyko learning-MVP:** rozpoznany ból dotyczy *rozproszenia komunikacji i braku audyt-trailu ustaleń*, ale MVP dostarcza zwykły czat bez strukturyzacji (actionable messages odłożone na v2). Możliwe, że pilot ze zwykłym czatem nie udowodni pełnej wartości — bo problemem była właśnie strukturyzacja. Operator akceptuje to ryzyko: pilot służy do nauczenia się, jaką strukturyzację firmy chcą w komunikatorze (RFQ? draft zamówienia? podsumowanie PDF? coś innego?), żeby v2 trafiło w realną potrzebę, a nie w założenie a priori.

## User & Persona

**Primary persona:** Handlowiec / trader w polskiej firmie obracającej polimerami. Codziennie składa lub przyjmuje wiele zamówień od/do różnych kontrahentów. Operuje na konkretnym słowniku branżowym (PE-LD, PE-HD, PP, PET, frakcje, MFI, kolor, czystość), zna swoich kontrahentów po imieniu, pracuje z telefonu i z biurka, ufa relacjom i podpisom — nie ufa generycznym narzędziom.

Jedyna persona aplikacji. Operator PolyGo (autor projektu / zespół) wykonuje seeding firm i kont bezpośrednio na bazie danych poza aplikacją i nie ma konta użytkownika w UI; nie jest personą produktu.

## Access Control

Aplikacja webowa, jedna powierzchnia (responsywny web). W MVP:

**Uwierzytelnianie:** Email + hasło, plus OAuth Google i Microsoft (Microsoft 365 jest popularny w polskim B2B). Każde konto użytkownika należy do dokładnie jednej firmy (przypisanie ustawiane podczas seedingu, nie przez użytkownika).

**Tworzenie kont:** w MVP brak self-registration. Konta firm i konta użytkowników są seedowane ręcznie przez Operatora PolyGo na podstawie wcześniej zebranej listy pilotowych firm. Użytkownik otrzymuje dane logowania (login/hasło lub link aktywacyjny) z zewnątrz aplikacji.

**Role:** brak. Wszyscy zalogowani użytkownicy mają te same uprawnienia operacyjne w obrębie swojej firmy: edycja wizytówki firmy, wyszukiwanie kontrahentów, komunikator, dodawanie do ulubionych. Trzy-rolowy model (super-admin / właściciel / pracownik) świadomie wycofany na rzecz prostoty MVP. Wraca jako otwarta decyzja v2.

**Widoczność firm:** każda zaseedowana firma jest widoczna w wyszukiwarce dla wszystkich zalogowanych użytkowników. Brak trybu "firma ukryta / tylko zaproszeni" w MVP — kontrola widoczności wraca na v2.

## MVP Scope (zakres pierwszej wersji)

W MVP dostarczamy CZTERY moduły, każdy w wersji minimalnej:

**1. Baza Danych firm i Wizytówki**
- Centralne repozytorium zweryfikowanych firm polimerowych zasilane ręcznie (seeding przez Operatora).
- Każda firma ma wizytówkę zawierającą: dane podstawowe (nazwa, NIP, adres), profil działalności (producent / dostawca surowca / recykler / dostawca maszyn / trader), główne polimery z jakimi operuje, możliwości technologiczne i operacyjne.

**2. Wyszukiwarka i Matchmaking**
- Filtrowanie wizytówek firm po branżowych kryteriach: typ polimeru (PE-LD, PE-HD, PP, PET, ...), profil działalności, region, ewentualnie wolumeny / możliwości operacyjne.
- Wyniki listowane jako wizytówki; klik wchodzi w pełny profil; z profilu można otworzyć czat.

**3. Smart Messenger — w MVP "zwykły" czat 1:1 między firmami**
- Komunikacja w czasie rzeczywistym między przedstawicielami firm.
- Historia rozmów per kontrahent.
- **Actionable Messages odłożone na v2** — kształt strukturyzacji (RFQ, draft zamówienia, dokument podsumowujący PDF) wyklaruje się po obserwacji pilotu. W MVP komunikator obsługuje tekst i ewentualne załączniki, bez sformalizowanych typów wiadomości.

**4. Ulubieni Kontrahenci**
- Prosta lista — użytkownik oznacza firmę jako ulubioną i ma do niej szybki dostęp z głównego widoku.

### Świadomie poza MVP (odkładamy na v2 lub później)

- Moduł magazynu i produkcji.
- Alarmy / powiadomienia mailowe o pasujących firmach lub ogłoszeniach.
- Płatności i abonamenty (Stripe).
- Role i uprawnienia w obrębie firmy.
- Gatekeeping firm wbudowany w aplikację (na pilot — gatekeeping offline przez Operatora).
- Actionable Messages w komunikatorze (RFQ, draft zamówienia, dokument podsumowujący).
- Publiczna tablica ogłoszeń (Kupię/Sprzedam).
- Tryb "firma ukryta / tylko zaproszeni".

### Timeline

3 tygodnie, solo, po godzinach. Przyjęte świadomie. Operator wie, że zakres jest agresywnie scope-downowany — gatekeeping, role, actionable messages, alarmy, magazyn, płatności wszystkie poza MVP.

## Timeline acknowledgment

Acknowledged on 2026-06-08: 3-tygodniowy MVP wymaga utrzymania świadomie zwężonego zakresu (tylko 4 minimalne moduły wymienione powyżej). Wszelkie dodatki — actionable messages, role, alarmy, gatekeeping w aplikacji — muszą być odrzucone w trakcie buildu, nawet jeśli pojawi się pokusa. Operator akceptuje ten koszt.

## User Stories

US-01: User loguje się do aplikacji (email+hasło lub OAuth Google/Microsoft).
US-02: User wyszukuje firmy z bazy po kryteriach branżowych (typ polimeru, profil działalności, region).
US-03: User przegląda pełną wizytówkę wybranej firmy.
US-04: User otwiera czat z wybraną firmą i prowadzi rozmowę w czasie rzeczywistym.
US-05: User widzi historię rozmów z każdym kontrahentem.
US-06: User oznacza firmę jako ulubioną i ma do niej szybki dostęp.
US-07: User edytuje wizytówkę własnej firmy (opis, profil polimerowy, możliwości technologiczne i operacyjne).

## Business Logic

**Brak reguły domenowej w MVP.** PolyGo v1 jest świadomie warstwą narzędziową (tooling layer): wyszukiwarka + komunikator + ulubieni kontrahenci. Aplikacja niczego sama nie decyduje — udostępnia użytkownikowi narzędzia, a wszystkie decyzje (kogo wyszukać, z kim rozmawiać, kogo dodać do ulubionych) podejmuje człowiek.

Operator świadomie akceptuje znaną pułapkę: produkt bez reguły domenowej jest podatny na ocenę "to mógł być spreadsheet + Messenger". Pilot ma odpowiedzieć na pytanie, **gdzie pojawia się największa wartość, w której aplikacja powinna zacząć decydować za użytkownika** — kandydaci na v2 to matchmaking (dopasowanie firm do zapytania), ranking wyników wyszukiwania, klasyfikacja wiarygodności firm, lub strukturyzacja komunikatora (actionable messages: RFQ → draft → potwierdzenie). Decyzja, którą z tych reguł wprowadzić jako pierwszą, ma być oparta na obserwacji realnych firm w pilocie, nie na założeniach a priori.

## Non-Functional Requirements

- Aplikacja musi przetwarzać dane firm i użytkowników zgodnie z RODO (Rozporządzenie 2016/679) — zgody, prawo do bycia zapomnianym, audyt dostępu do danych osobowych.
- Dane jednej firmy muszą być całkowicie odizolowane od innych firm. Wyjątkiem są wyłącznie pola jawnie zdefiniowane jako publiczne na wizytówce firmy. Jakikolwiek wyciek danych poza tę granicę jest krytycznym incydentem.

Pozostałe jakości (polski UI, responsywność mobile, accessibility WCAG, czas pojawienia się wiadomości w czacie, wsparcie przeglądarek, uptime) NIE są twardo wymagane w MVP. W praktyce większość z nich i tak będzie obecna (Vite+React = nowoczesne przeglądarki, Supabase Realtime = sub-secundowy delivery, persona PL = UI po polsku), ale formalne zobowiązanie ograniczone jest do RODO i izolacji danych.
