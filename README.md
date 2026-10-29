# Łuska i Ciernie

> Archiwum romantasy czytane po tropach: od więzi przeznaczenia po jeźdźców smoków.

Łuska i Ciernie to katalog i wyszukiwarka książek romantasy. Czytelniczki tego gatunku szukają
inaczej niż w zwykłej księgarni: po **tropach** („enemies to lovers”, „fated mates”, „dwory fae”),
po **poziomie pikanterii** i po tym, **czy seria jest już zakończona**. Serwis jest zbudowany
właśnie wokół tych pytań.

Równocześnie to **projekt edukacyjny**: aplikacja powstawała etapami (każdy etap to jeden commit),
tak żeby przećwiczyć całe spektrum **Angular SSR** — od renderowania na serwerze, przez prerender,
hydrację i transfer state, po SEO, sesje po stronie serwera, i18n i hydrację przyrostową.
Pełna specyfikacja produktu i założenia wizualne są w [`SPEC.md`](SPEC.md).

---

## Spis treści

1. [Co potrafi serwis](#co-potrafi-serwis)
2. [Szybki start](#szybki-start)
3. [Stos technologiczny](#stos-technologiczny)
4. [Architektura](#architektura)
5. [Strategie renderowania](#strategie-renderowania)
6. [Dane i baza](#dane-i-baza)
7. [API](#api)
8. [Konta, sesja i bezpieczeństwo](#konta-sesja-i-bezpieczeństwo)
9. [Wersje językowe](#wersje-językowe)
10. [SEO i cache](#seo-i-cache)
11. [Hydracja: pułapki i rozwiązania](#hydracja-pułapki-i-rozwiązania)
12. [Testy](#testy)
13. [Konfiguracja (zmienne środowiskowe)](#konfiguracja-zmienne-środowiskowe)
14. [Struktura katalogów](#struktura-katalogów)
15. [Konwencje](#konwencje)
16. [Historia etapów](#historia-etapów)
17. [Kwestie prawne](#kwestie-prawne)

---

## Co potrafi serwis

| Funkcja | Adres | Opis |
|---|---|---|
| Strona główna | `/` | Hero z mgławicą i iskrami, **Trop dnia** (ten sam dla wszystkich przez całą dobę UTC) |
| Strona książki | `/ksiazka/:slug` | Opis, tropy z runami, pikanteria 0–5 („płomienie”), seria i jej status, ostrzeżenia treści, tomy serii, **Podobne ścieżki** (książki z największą liczbą wspólnych tropów), przycisk półki |
| Strona autorki/autora | `/autor/:slug` | Biogram i bibliografia |
| Tropy | `/tropy`, `/tropy/:slug` | Katalog tropów pogrupowany w trzy krainy (Turnie Smoków, Dwór Mgieł, Skryptorium) i lista książek danego tropu |
| Wyszukiwarka | `/szukaj` | Fraza (tytuł, autor, seria — bez względu na ogonki), tropy łączone AND/OR, maks. pikanteria, status serii. **Działa bez JavaScriptu** (formularz GET) |
| Premiery | `/premiery` | Kalendarz zapowiedzi z odliczaniem (dni → godziny, minuty, sekundy w ostatniej dobie) i kanał **RSS** `/rss/premiery` |
| Konto | `/logowanie`, `/rejestracja` | „Przekrocz próg” / „Zawrzyj pakt”. Formularze działają bez JS, po zalogowaniu powrót na stronę, z której się przyszło |
| Skarbiec | `/moja-polka` | Własna półka: do przeczytania / czytam / przeczytane, ocena 1–5, notatka |
| Motyw | przełącznik w nagłówku | Noc (ciemny) i pergamin (jasny), zapamiętany w ciasteczku — bez mignięcia przy ładowaniu |
| Wersje językowe | `/…` i `/en/…` | Polska (domyślna) i angielska, z tytułami książek w wersji danego rynku |

Katalog zawiera **91 książek**, **38 autorek i autorów** oraz **17 tropów**. To prawdziwe tytuły
romantasy, ale wyłącznie z metadanymi i własnymi opisami — **bez cytatów**. Premiery w
`seed/releases.json` są **fikcyjne** (dane przykładowe, strona to zaznacza).

Na kolejnych etapach: **Wyrocznia** (quiz „Jaki trop jest dla Ciebie?”, renderowany tylko w
przeglądarce) i **deploy** (Docker + hosting z trwałym dyskiem).

---

## Szybki start

Wymagania: **Node.js 24** (wbudowany moduł `node:sqlite`) i npm 11. Nie trzeba instalować żadnej
bazy danych ani zakładać kont — SQLite to zwykłe pliki w `data/`.

```bash
npm install

# Serwer deweloperski z SSR i hot reload (http://localhost:4200)
npm start            # wersja polska
npm run start:en     # wersja angielska

# Build produkcyjny obu wersji językowych i uruchomienie serwera Node (http://localhost:4000)
npm run build:i18n
npm run serve:ssr:luska-i-ciernie
```

`npm start`, `npm run build` i `npm run build:i18n` same odpalają wcześniej `npm run db:seed`,
który buduje bazę katalogu `data/luska.db` z plików JSON w `seed/`. Baza kont `data/users.db`
powstaje sama przy pierwszym uruchomieniu serwera.

| Skrypt | Co robi |
|---|---|
| `npm start` / `npm run start:en` | `ng serve` — dev server z SSR (pl / en) |
| `npm run build` | build wersji polskiej |
| `npm run build:i18n` | build obu wersji językowych (`--localize`) |
| `npm run serve:ssr:luska-i-ciernie` | produkcyjny serwer Express z `dist/` |
| `npm run db:seed` | przebudowa `data/luska.db` z `seed/*.json` (w miejscu, w jednej transakcji) |
| `npm test` | testy jednostkowe (Vitest) |
| `npm run cypress:run` | testy e2e (Cypress) — wymagają działającego serwera |
| `npx ng extract-i18n` | aktualizacja `src/locale/messages.json` po zmianie tekstów |

---

## Stos technologiczny

| Warstwa | Technologia | Po co |
|---|---|---|
| Framework | **Angular 22** (standalone, **zoneless**, sygnały) | `httpResource`, `linkedSignal`, `input()`, `@defer`, `@let`, control flow |
| SSR | **@angular/ssr** (`AngularNodeAppEngine`) | render per trasa: Server / Prerender / Client |
| Serwer | **Express 5** | API, sesje, formularze bez JS, sitemap, RSS, nagłówki cache — w tym samym procesie co SSR |
| Baza | **node:sqlite** (wbudowany w Node 24) | katalog tylko do odczytu + osobna baza kont i półek |
| i18n | **@angular/localize** | build per język (`/` i `/en/`), własne identyfikatory komunikatów |
| Style | SCSS, tokeny CSS (`src/styles/_tokens.scss`) | dwa motywy, krainy kolorystyczne, `color-mix()` |
| Fonty | `@fontsource` (Cinzel Decorative, Cormorant Garamond, EB Garamond, Inter) | serwowane z własnej domeny (RODO) |
| Obrazy | `NgOptimizedImage` | okładka LCP z `priority` i preloadem; na listach `loading="lazy"` |
| Testy | **Vitest** (`@angular/build:unit-test`), **Cypress 16** | jednostkowe + e2e na zbudowanym serwerze SSR |

---

## Architektura

Jeden proces Node obsługuje wszystko. Kolejność middleware w `src/server.ts` ma znaczenie:

```
żądanie
  │
  ├─ /api/me, /api/shelf/*   → sesja → JSON API półki (Origin, application/json)
  ├─ /api/*                  → katalog (SQLite, tylko odczyt)
  ├─ /robots.txt, /sitemap.xml, /rss/premiery
  ├─ pliki statyczne z dist/browser (+ prerenderowane HTML-e)
  ├─ sesja (ciasteczko sid → użytkownik)
  ├─ /auth/*, /polka, /motyw → formularze POST działające bez JavaScriptu (303 z powrotem)
  ├─ strażnicy: /moja-polka bez sesji → 302 na logowanie; /logowanie z sesją → 302 dalej
  └─ Angular SSR: angularApp.handle(req, { user })
        → motyw wstawiony do <html data-theme>
        → Cache-Control: private, no-store dla zalogowanych, Vary: Cookie
```

Po stronie Angulara:

- **`src/app/pages/*`** — strony (ładowane leniwie przez `loadComponent`).
- **`src/app/ui/*`** — komponenty wielokrotnego użytku (karta książki, okładka, runa, pikanteria…).
- **`src/app/layout/*`** — nagłówek z menu „Mapa” (hamburger na mobile), konto, przełącznik motywu, stopka.
- **`src/app/core/*`** — serwisy i interceptory: `Seo`, `Session`, `ServerResponse` (statusy HTTP z SSR),
  `daily` (deterministyczny „dzień renderu”), `forwardSessionInterceptor`, `apiLanguageInterceptor`, motyw.
- **`src/shared/models.ts`** — typy wspólne dla serwera i przeglądarki (jedno źródło prawdy o kształcie API).

Komponenty pobierają dane przez **względne URL-e** (`httpResource('/api/books/…')`). Podczas SSR
Angular rozwiązuje je względem adresu żądania, a odpowiedzi trafiają do **HTTP transfer cache**
w HTML-u — przeglądarka po hydracji nie pyta API drugi raz.

---

## Strategie renderowania

Zdefiniowane w `src/app/app.routes.server.ts`, każda z uzasadnieniem w komentarzu:

| Trasa | Tryb | Dlaczego |
|---|---|---|
| `/` | Server | Trop dnia zmienia się co dobę — prerender byłby nieaktualny |
| `/tropy`, `/tropy/:slug` | **Prerender** | rzadko się zmienia; `getPrerenderParams` pobiera listę slugów z API w czasie `ng build`; nieznany slug → render na żądanie z 404 |
| `/ksiazka/:slug`, `/autor/:slug` | Server | dużo stron, zmienne dane; strona sama ustawia 404 / 301 (`RESPONSE_INIT`) |
| `/szukaj` | Server | wynik zależy od query params |
| `/premiery` | Server + cache CDN | odliczanie w dniach → HTML ważny dobę (`s-maxage`) |
| `/logowanie`, `/rejestracja` | Server | komunikat błędu i wypełnione pola z query params |
| `/moja-polka/**` | **Client** | prywatne, bez SEO; niezalogowanych przekierowuje wcześniej Express |
| `**` | Server, status 404 | nieznane adresy |

---

## Dane i baza

- **`seed/*.json`** — źródło prawdy katalogu: książki, autorzy, serie, tropy, premiery. Tytuły i
  nazwy serii mają warianty per język (np. „Okrutny książę” / „The Cruel Prince”), podobnie okładki
  wydań lokalnych.
- **`scripts/seed.ts`** → **`data/luska.db`**: schemat w `src/server/db/database.ts` (książki, tytuły
  per język, okładki per język, tropy, ostrzeżenia, serie, premiery, stare slugi → przekierowania 301).
  Seed przebudowuje bazę **w miejscu, w jednej transakcji**, z kontrolą kluczy obcych — działa nawet
  wtedy, gdy uruchomiony serwer trzyma plik otwarty.
- **`data/users.db`**: konta, sesje i półki (zapisywalna, poza gitem). Półka kasuje się razem z
  kontem (`ON DELETE CASCADE`), reguły (np. ocena tylko dla „przeczytane”) pilnuje `CHECK`.
- **`src/server/catalog.ts`** — cała logika zapytań: filtry wyszukiwarki w SQL, sortowanie z polską
  kolejnością liter w JS (`localeCompare`), wyszukiwanie bez ogonków (kolumna `search_text`),
  „podobne książki” po liczbie wspólnych tropów.

Okładki: domyślnie z Open Library; `COVER_SOURCE=none` włącza **własne, generowane okładki**
(tło krainy, runa tropu, tytuł) — patrz [kwestie prawne](#kwestie-prawne).

---

## API

Wszystkie odpowiedzi to JSON. Język treści wybiera nagłówek dodawany przez `apiLanguageInterceptor`.

| Metoda i ścieżka | Opis |
|---|---|
| `GET /api/books?q=&trope=&match=any&maxSpice=&status=&author=` | lista książek po filtrach (`trope` można powtórzyć) |
| `GET /api/books/:slug` | szczegóły książki z tomami serii i `similar`; stary slug → 301 |
| `GET /api/authors/:slug` | autor z bibliografią |
| `GET /api/tropes`, `GET /api/tropes/:slug` | tropy z liczbą książek / trop z książkami |
| `GET /api/releases` | premiery od dziś |
| `GET /api/me` | zalogowana osoba (e-mail, imię) albo 401 |
| `GET /api/shelf` | cała półka (wymaga sesji) |
| `GET /api/shelf/:slug` | pozycja na półce albo `null`, gdy książki na niej nie ma |
| `PUT /api/shelf/:slug` | zapis statusu, oceny, notatki |
| `DELETE /api/shelf/:slug` | zdjęcie z półki |

Poza API: `/robots.txt`, `/sitemap.xml` (z `hreflang` dla obu języków), `/rss/premiery`
(+ `/en/rss/premiery`) oraz formularze `POST /auth/logowanie`, `/auth/rejestracja`,
`/auth/wyloguj`, `/polka`, `/motyw`.

---

## Konta, sesja i bezpieczeństwo

- Hasła hashowane **scryptem** z solą; tokeny sesji przechowywane w bazie **tylko jako hash**.
- Ciasteczko `sid`: `HttpOnly`, `SameSite=Lax`, `Secure` za HTTPS (lub `COOKIE_SECURE=true`).
- Zapisy (POST/PUT/DELETE) sprawdzają nagłówek **`Origin`**; JSON API przyjmuje tylko
  `application/json` (inaczej 415) — zwykły formularz z obcej strony go nie wywoła.
- Parametr powrotu `?next=` przechodzi przez `safeNext` (tylko ścieżki tej samej strony, żadnych `//evil.com`).
- Limity prób: 10 logowań na 15 minut i `REGISTER_LIMIT_PER_HOUR` rejestracji na godzinę (w pamięci procesu).
- Przy SSR `forwardSessionInterceptor` przekazuje do API **tylko** ciasteczko `sid` i **tylko** do
  `/api/shelf` — dzięki temu serwer renderuje stan półki, a nic więcej nie wycieka.
- Przeglądarka dostaje wyłącznie e-mail i imię; wewnętrzne `id` zostaje na serwerze
  (`REQUEST_CONTEXT` → serwis `Session`).
- HTML zalogowanej osoby ma `Cache-Control: private, no-store` i `Vary: Cookie` — żaden cache
  pośredni nie pokaże go komuś innemu.

---

## Wersje językowe

- Polski to język źródłowy (ścieżka `/`), angielski to tłumaczenie (`/en/`). Build `--localize`
  tworzy osobną aplikację per język; serwer wybiera ją po prefiksie ścieżki.
- Teksty w szablonach mają stałe identyfikatory (`i18n="@@book.similarTitle"`), tłumaczenia są w
  `src/locale/messages.en.json`. Po dodaniu tekstu: `npx ng extract-i18n` i uzupełnienie tłumaczenia.
- Liczebniki („1 tom / 2 tomy / 5 tomów”) liczą pipe'y na `Intl.PluralRules` — wyrażenia ICU
  w pętli `@for` psują hydrację i18n.
- Dodanie kolejnego języka: wpis w `i18n.locales` w `angular.json`, plik tłumaczeń, wpis w
  `LANGS`/`LANG_PREFIX` w `src/shared/models.ts` (stąd biorą się `hreflang`, sitemap i przełącznik).

---

## SEO i cache

- Serwis `Seo` ustawia w jednym miejscu: `<title>`, `description`, `robots`, `canonical`,
  `hreflang` (pl, en, x-default), Open Graph, Twitter Card, kanał RSS i **JSON-LD**
  (`WebSite` z `SearchAction`, `Book`, `BookSeries`, `Person`, `ItemList`). Wszystko powstaje już w HTML-u z serwera — roboty i podglądy
  linków w komunikatorach nie wykonują JavaScriptu.
- Prawdziwe kody HTTP z SSR: 404 dla nieistniejących książek i autorów, 301 ze starych slugów.
- Wyszukiwarka ma kanoniczny adres niezależny od kolejności parametrów.
- `Cache-Control`: API katalogu `public, max-age=300`; `/premiery` dla anonimów
  `public, max-age=300, s-maxage=3600, stale-while-revalidate=600`; zalogowani `private, no-store`.

---

## Hydracja: pułapki i rozwiązania

Projekt celowo przechodzi przez typowe problemy SSR (SPEC §6):

| Problem | Rozwiązanie w kodzie |
|---|---|
| `Math.random()` / `new Date()` daje inny wynik na serwerze i w przeglądarce (NG0500) | „dzień renderu” w UTC zapisany w `TransferState` (`core/daily.ts`), losowanie deterministyczne z daty |
| Mignięcie motywu (FOUC) | motyw z ciasteczka wstawiany do `<html data-theme>` przez SSR, a dla HTML-a z prerenderu — przez Express |
| Kliknięcie przed hydracją | **event replay**; formularze półki i logowania to natywne `<form method="post">`, więc działają nawet bez JS; `isReplayed()` zapobiega podwójnemu zapisowi |
| Podwójne żądania po hydracji | HTTP transfer cache (także dla prywatnych odpowiedzi półki). Stany „brak danych” to **200 z `null`**, nie 404 — transfer cache zapisuje tylko udane odpowiedzi |
| Komponenty z i18n renderowane od nowa | `withI18nSupport()` w `provideClientHydration` |
| Odliczanie zmieniające się co sekundę | `afterNextRender` — tykanie startuje dopiero w przeglądarce, po hydracji |
| Ciężkie fragmenty poniżej zgięcia | **hydracja przyrostowa**: „Podobne ścieżki” w `@defer (on viewport; hydrate on viewport)` — HTML z serwera, kod dopiero po przewinięciu |
| Statyczne fragmenty | stopka w `@defer (hydrate never)` — nigdy nie pobiera kodu |

Nawigacja korzysta z **View Transitions** (`withViewTransitions`): okładka płynnie „przelatuje”
z karty na stronę książki dzięki wspólnej `view-transition-name`; przy `prefers-reduced-motion`
animacje są wyłączone.

---

## Testy

```bash
npm test                                   # Vitest: katalog, sesje, hasła, SEO, motyw, daily…

npm run build:i18n
PORT=4123 node dist/luska-i-ciernie/server/server.mjs &
npx cypress run --config baseUrl=http://localhost:4123
```

Testy e2e (`cypress/e2e/`) sprawdzają to, czego nie widać w testach jednostkowych: kody HTTP,
HTML z serwera (`cy.request`), brak drugiego żądania po hydracji (transfer cache), działanie bez
JavaScriptu (`cy.disableJavaScript()`), kliknięcia przed hydracją, hydrację przyrostową (atrybut
`ngb` przed i po przewinięciu), SEO, i18n i motyw. Rejestracja ma limit na godzinę — przy wielu
przebiegach ustaw `REGISTER_LIMIT_PER_HOUR=1000`.

---

## Konfiguracja (zmienne środowiskowe)

| Zmienna | Domyślnie | Znaczenie |
|---|---|---|
| `PORT` | `4000` | port serwera Node |
| `DB_PATH` | `data/luska.db` | baza katalogu (tylko odczyt) |
| `USERS_DB_PATH` | `data/users.db` | baza kont, sesji i półek |
| `COVER_SOURCE` | `openlibrary` | `none` = tylko własne, generowane okładki |
| `PUBLIC_ORIGIN` | adres z żądania | publiczny adres serwisu do sitemap i RSS |
| `COOKIE_SECURE` | — | `true` wymusza `Secure` na ciasteczkach (np. za proxy z HTTPS) |
| `REGISTER_LIMIT_PER_HOUR` | `5` | limit rejestracji z jednego adresu |
| `API_DELAY_MS` | `0` | sztuczne opóźnienie API — do oglądania stanów ładowania |

---

## Struktura katalogów

```
seed/                  dane katalogu (JSON) — źródło prawdy
scripts/seed.ts        budowa data/luska.db
data/                  bazy SQLite (poza gitem)
docs/PRAWNE.md         przegląd prawny
cypress/e2e/           testy e2e
src/
  server.ts            Express: kolejność middleware, SSR, nagłówki
  server/              API, katalog, SEO (sitemap/robots/RSS), auth, półka, motyw, baza
  shared/models.ts     typy wspólne dla serwera i przeglądarki
  locale/              messages.json (pl, źródło) i messages.en.json
  styles/              tokeny, mixiny formularzy
  app/
    app.config.ts      providery: router, HttpClient, hydracja, transfer cache
    app.routes.ts      trasy (leniwe komponenty)
    app.routes.server.ts  tryby renderowania per trasa
    core/              serwisy i interceptory
    layout/            nagłówek, konto, przełącznik motywu, stopka
    pages/             strony
    ui/                komponenty wielokrotnego użytku
```

---

## Konwencje

- Każdy komponent ma **własny folder** z osobnymi plikami `.ts`, `.html` i `.scss`.
- Bez `window` / `localStorage` / `document` poza serwisami platformowymi i `afterNextRender` —
  kod musi działać także na serwerze.
- Daty jako dni kalendarzowe w UTC (`YYYY-MM-DD`), żeby serwer i przeglądarka liczyły tak samo.
- Komentarze w kodzie wyjaśniają **dlaczego** (zwłaszcza decyzje SSR), nie co.
- Teksty interfejsu w klimacie gatunku („Przekrocz próg”, „Skarbiec”, „Smok przeszukuje skarbiec…”),
  zawsze z czytelnym znaczeniem obok lub w etykiecie dostępności.

---

## Historia etapów

Każdy etap to jeden commit — `git log` prowadzi przez projekt jak kurs.

| # | Etap | Najważniejszy koncept |
|---|---|---|
| 1 | Szkielet SSR, tokeny, layout | anatomia aplikacji SSR, `ng build` + serwer Node |
| 2 | Mock API w Express | API i SSR w jednym procesie |
| 3 | Strona książki | `httpResource`, HTTP transfer cache |
| 4 | Autor, 404 i 301 | `RESPONSE_INIT`, prawdziwe kody HTTP |
| 5 | Tropy | `RenderMode.Prerender`, `getPrerenderParams` |
| 6 | Landing i Trop dnia | błąd hydracji NG0500 i `TransferState` |
| 7 | Wyszukiwarka | formularz GET bez JS, canonical |
| 8 | Polszczyzna i menu | `@angular/localize`, menu mobilne |
| 9 | Rozbudowa katalogu | 91 książek, generowane okładki, przegląd prawny |
| 10 | SEO | meta, OG, hreflang, JSON-LD, sitemap, robots |
| 11 | SQLite | `node:sqlite`, seed, warstwa danych bez zmian w Angularze |
| 12 | Konta i sesja | `REQUEST_CONTEXT`, ciasteczka httpOnly, guard + 302 z serwera |
| 13 | Skarbiec i motyw | `RenderMode.Client`, FOUC, event replay, prywatny transfer cache |
| 14 | Premiery i RSS | `afterNextRender`, `Cache-Control: s-maxage` |
| 15 | Hydracja przyrostowa | `@defer (hydrate …)`, View Transitions |
| 16 | Wyrocznia | *(planowany)* quiz client-only |
| 17 | Deploy | *(planowany)* Docker, trwały dysk, zmienne produkcyjne |

---

## Kwestie prawne

Serwis pokazuje wyłącznie metadane książek i własne opisy — żadnych cytatów. Najważniejsze ryzyko
to okładki (prawa autorskie wydawców): na produkcji zalecane jest `COVER_SOURCE=none`. Fonty są
serwowane z własnej domeny, a jedyne ciasteczka (`sid`, `theme`) są funkcjonalne. Szczegóły:
[`docs/PRAWNE.md`](docs/PRAWNE.md). To nie jest porada prawna.
