---
project: PolyGo
version: 1
status: draft
created: 2026-06-08
context_type: greenfield
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

Handlowiec w polskiej firmie obracającej polimerami (kupno-sprzedaż surowca pierwotnego, regranulatu, frakcji odpadowych) prowadzi proces składania zamówienia rozproszony pomiędzy mailem, WhatsAppem i telefonem. Cały ciąg — od zapytania o dostępność, przez negocjację specyfikacji (typ polimeru, frakcja, ilość, cena, termin), aż po potwierdzenie — żyje w kilku kanałach naraz. Wątki się gubią, specyfikacje krzyżują (zła frakcja, zła ilość, zły termin), na pytanie "co właściwie ustaliliśmy" nie ma jednego źródła prawdy, a gdy coś się sypnie — nie ma śladu kto co powiedział.

Insight, który uzasadnia "dlaczego teraz" i "dlaczego nikt jeszcze tego nie zrobił dobrze", jest świadomie pozostawiony jako otwarte pytanie — autor projektu rozpoznaje ból, ale nie ma jeszcze gotowej teorii rynku. Otwarta hipoteza: branża jest hermetyczna, generyczne narzędzia nie znają języka polimerów, a istniejące platformy B2B w tej branży są katalogami ogłoszeniowymi, nie operacyjnymi środowiskami obsługującymi cały proces transakcyjny. Hipoteza wymaga weryfikacji na pilocie. Świadome ryzyko learning-MVP: rozpoznany ból dotyczy *rozproszenia komunikacji i braku audyt-trailu*, ale MVP dostarcza zwykły czat bez strukturyzacji (actionable messages odłożone na v2) — możliwe, że pilot nie udowodni pełnej wartości, bo problemem była właśnie strukturyzacja. Operator akceptuje to ryzyko: pilot służy do nauczenia się, jaką strukturyzację firmy chcą w komunikatorze.

## User & Persona

**Primary persona:** Handlowiec / trader w polskiej firmie obracającej polimerami. Codziennie składa lub przyjmuje wiele zamówień od/do różnych kontrahentów. Operuje na konkretnym słowniku branżowym (PE-LD, PE-HD, PP, PET, frakcje, MFI, kolor, czystość), zna swoich kontrahentów po imieniu, pracuje z telefonu i z biurka, ufa relacjom i podpisom — nie ufa generycznym narzędziom.

Jedyna persona aplikacji. Operator PolyGo (autor projektu / zespół) wykonuje seeding firm i kont bezpośrednio na bazie danych poza aplikacją i nie ma konta użytkownika w UI; nie jest personą produktu.

## User Stories

US-01: User loguje się do aplikacji (email i hasło lub OAuth Google).
US-02: User wyszukuje firmy z bazy po kryteriach branżowych (typ polimeru, profil działalności, region).
US-03: User przegląda pełną wizytówkę wybranej firmy.
US-04: User otwiera czat z wybraną firmą i prowadzi rozmowę w czasie rzeczywistym.
US-05: User widzi historię rozmów z każdym kontrahentem.
US-06: User oznacza firmę jako ulubioną i ma do niej szybki dostęp.
US-07: User edytuje wizytówkę własnej firmy (opis, profil polimerowy, możliwości technologiczne i operacyjne).

## Business Logic

**Brak reguły domenowej w MVP.** PolyGo v1 jest świadomie warstwą narzędziową (tooling layer): wyszukiwarka + komunikator + ulubieni kontrahenci. Aplikacja niczego sama nie decyduje — udostępnia użytkownikowi narzędzia, a wszystkie decyzje (kogo wyszukać, z kim rozmawiać, kogo dodać do ulubionych) podejmuje człowiek.

Operator świadomie akceptuje znaną pułapkę: produkt bez reguły domenowej jest podatny na ocenę "to mógł być spreadsheet plus komunikator". Pilot ma odpowiedzieć na pytanie, **gdzie pojawia się największa wartość, w której aplikacja powinna zacząć decydować za użytkownika** — kandydaci na v2 to matchmaking (dopasowanie firm do zapytania), ranking wyników wyszukiwania, klasyfikacja wiarygodności firm, lub strukturyzacja komunikatora (RFQ → draft → potwierdzenie). Decyzja, którą z tych reguł wprowadzić jako pierwszą, ma być oparta na obserwacji realnych firm w pilocie, nie na założeniach a priori.

# TODO: domain rule not captured — PRD is hollow until resolved (świadome odłożenie do v2 po pilocie)

## Non-Functional Requirements

- Aplikacja musi przetwarzać dane firm i użytkowników zgodnie z RODO (Rozporządzenie 2016/679) — zgody, prawo do bycia zapomnianym, audyt dostępu do danych osobowych.
- Dane jednej firmy muszą być całkowicie odizolowane od danych innych firm. Wyjątkiem są wyłącznie pola jawnie zdefiniowane jako publiczne na wizytówce firmy. Jakikolwiek wyciek danych poza tę granicę jest krytycznym incydentem.

Pozostałe jakości (polski UI, responsywność mobile, accessibility WCAG, czas pojawienia się wiadomości w czacie, wsparcie przeglądarek, uptime) NIE są twardo wymagane w MVP. W praktyce większość z nich i tak będzie obecna, ale formalne zobowiązanie ograniczone jest do RODO i izolacji danych.

## Access Control

Aplikacja webowa, jedna powierzchnia (responsywny web). Każde konto użytkownika należy do dokładnie jednej firmy (przypisanie ustawiane podczas seedingu, nie przez użytkownika).

**Uwierzytelnianie:** email i hasło, plus OAuth Google. Microsoft OAuth świadomie odłożony do v2 (zbyt mała wartość vs koszt setupu Azure AD app rejestracji dla MVP). W MVP brak self-registration — konta firm i konta użytkowników są seedowane ręcznie przez Operatora PolyGo poza aplikacją na podstawie wcześniej zebranej listy pilotowych firm. Użytkownik otrzymuje dane logowania (login/hasło lub link aktywacyjny) z zewnątrz aplikacji.

**Role:** brak. Wszyscy zalogowani użytkownicy mają te same uprawnienia operacyjne w obrębie swojej firmy: edycja wizytówki firmy, wyszukiwanie kontrahentów, komunikator, dodawanie do ulubionych. Trzy-rolowy model (super-admin / właściciel / pracownik) świadomie wycofany na rzecz prostoty MVP. Wraca jako otwarta decyzja v2.

**Widoczność firm:** każda zaseedowana firma jest widoczna w wyszukiwarce dla wszystkich zalogowanych użytkowników. Brak trybu "firma ukryta / tylko zaproszeni" w MVP — kontrola widoczności wraca na v2.
