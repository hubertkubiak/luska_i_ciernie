# Łuska i Ciernie — specyfikacja projektu

> Serwis dla miłośniczek romantasy: odkrywanie książek po tropach, śledzenie serii i premier, własna półka.
> Projekt edukacyjny do przećwiczenia **całego spektrum Angular SSR** (hybrid rendering, hydration, transfer state, SEO, auth po stronie serwera, Express).

---

## 1. Koncept

Czytelniczki romantasy szukają książek inaczej niż w zwykłej księgarni: po **tropach** („enemies to lovers”, „fated mates”, „jeźdźcy smoków”, „dwory fae”), po **poziomie pikanterii** i po tym, **czy seria jest już zakończona**. Łuska i Ciernie to katalog i wyszukiwarka zbudowane wokół tych potrzeb.

### Główne funkcje

| Funkcja | Opis |
|---|---|
| Katalog książek | Strona każdej książki: opis, tropy, pikanteria 🌶️ (0–5), seria, status serii, ostrzeżenia treści |
| Strony tropów | `/tropy/enemies-to-lovers` — opis tropu + lista książek |
| Wyszukiwarka z filtrami | Tropy (AND/OR), pikanteria, status serii, rok, liczba stron |
| Kalendarz premier | Nadchodzące premiery z odliczaniem |
| Strony autorek/autorów | Bibliografia, serie |
| Moja półka | TBR / czytam / przeczytane, oceny, notatki (po zalogowaniu) |
| Wyrocznia | Quiz „Jaki trop jest dla Ciebie?” → rekomendacje (client-only) |
| Trop dnia | Losowany codziennie na landingu (celowa pułapka hydracji, patrz §6) |

### Czego NIE robimy
- Brak cytatów z książek i fragmentów treści (prawa autorskie) — tylko metadane i własne opisy tropów.
- Brak postaci, nazw i grafik z konkretnych serii w identyfikacji wizualnej. Inspirujemy się **gatunkiem**, nie konkretnym uniwersum.

---

## 2. Wymogi stylistyczne

### 2.1 Kierunek artystyczny: „Grimoire o północy”

Serwis ma wyglądać jak **zakazana księga znaleziona w bibliotece dworu fae**: ciemna, aksamitna, pełna złoceń, cierni i światła świec. Ma być tajemniczo i zmysłowo, ale nie mrocznie-horrorowo i nie bajkowo-dziecięco.

**Słowa kluczowe nastroju:** obsydian, księżycowe srebro, żar, krew na płatkach róży, mgła nad lasem, złota filigrana, smocza łuska, gwiazdozbiory, pieczęć lakowa.

**Zasada nadrzędna:** inspirujemy się **gatunkiem** (smoki i ich jeźdźcy, dwory fae, pakty i targi, wojenne akademie, więzi przeznaczenia, runy), a nie konkretnymi seriami. Nie używamy nazw postaci, miejsc, herbów, okładek ani charakterystycznych elementów identyfikacji konkretnych książek. Czytelniczka ma czuć „klimat”, nie widzieć kopii.

### 2.2 Trzy krainy — motywy per sekcja

Serwis dzieli się na trzy „krainy” z własnym akcentem kolorystycznym. Kraina wynika z trasy lub z dominującego tropu książki i jest **ustalana na serwerze** (atrybut `data-realm` na `<body>` w SSR, bez mignięcia).

| Kraina | Gdzie | Nastrój | Akcent |
|---|---|---|---|
| **Smocze Turnie** | książki z tropami smoków, wojny, akademii; kalendarz premier | wulkaniczny żar, obsydian, popiół, metal | `--ember`, `--blood` |
| **Dwór Mgieł** | książki z tropami fae, magii, paktów; Wyrocznia | księżycowa poświata, fiolet, mgła, srebro, bioluminescencja | `--moonsilver`, `--fae` |
| **Skryptorium** | poradniki, strony tropów, tryb jasny | pergamin, atrament, złocenia, iluminowane rękopisy | `--gilt`, `--ink` |

### 2.3 Paleta (tokeny CSS)

**Baza (tryb nocny, domyślny):**

| Token | Kolor | Użycie |
|---|---|---|
| `--obsidian` | `#0b0910` | tło strony |
| `--midnight` | `#161226` | karty, panele |
| `--velvet` | `#2a1f3d` | hover, aktywne zakładki, obramowania |
| `--nightshade` | `#4b2a5e` | gradienty, tło hero |
| `--ember` | `#e8a33d` | CTA, linki, pikanteria |
| `--gilt` | `#c9a75a` | ornamenty, ramki, nagłówki ozdobne |
| `--blood` | `#9e1b32` | ostrzeżenia treści, akcent romansowy, „ulubione” |
| `--fae` | `#5fc4a8` | tagi tropów, sukces, bioluminescencja |
| `--moonsilver` | `#c7cde0` | tekst główny |
| `--mist` | `#8a84a3` | tekst drugorzędny, placeholdery |

**Tryb „pergamin” (jasny):** tło `#efe5cf`, karty `#f7f0df`, tekst `--ink: #1f1a2b`, akcenty przyciemnione (`--ember` → `#a8661a`, `--blood` → `#7d1426`).

**Gradienty sygnaturowe:**
- *Mgławica:* `radial-gradient(ellipse at top, var(--nightshade), var(--obsidian) 70%)` — tło hero.
- *Żar:* `linear-gradient(135deg, #f2c26b, var(--ember) 45%, #b4541f)` — przyciski główne.
- *Złocenie:* `linear-gradient(90deg, transparent, var(--gilt), transparent)` — separatory, ramki.

**Wymóg dostępności:** każda para tekst/tło spełnia **WCAG AA** (4.5:1 dla treści). Kolor nigdy nie jest jedynym nośnikiem znaczenia — pikanteria ma też liczbę, ostrzeżenia ikonę.

### 2.4 Typografia

| Rola | Font | Zasady |
|---|---|---|
| Logo, tytuły hero | **Cinzel Decorative** | tylko ≥ 32 px, nigdy w treści |
| Nagłówki H1–H3 | **Cormorant Garamond** (600/700) | lekko rozstrzelone (`letter-spacing: 0.02em`) |
| Opisy książek, poradniki | **EB Garamond** | 18–20 px, interlinia 1.65 |
| Interfejs (filtry, przyciski, formularze) | **Inter** | czytelność ponad klimat |
| Etykiety, metadane | Cormorant Garamond, `font-variant: small-caps` | np. „TOM II · SERIA ZAKOŃCZONA” |

- **Inicjał (drop cap)** w opisie książki i poradnikach: `::first-letter` w `--gilt`, Cinzel, wysokość 3 linii, opcjonalnie z cierniem w tle.
- Fonty ładowane przez `<link rel="preload">` z `font-display: swap`; podzbiór `latin-ext` (polskie znaki!).

### 2.5 Ornamentyka i motywy graficzne

Wszystkie grafiki to **własne SVG** (sprite w `assets/ornaments.svg`, `aria-hidden="true"`).

- **Separator cierni:** pozioma gałąź z cierniami i jednym pąkiem róży pośrodku.
- **Narożniki z filigranu:** złote ornamenty w rogach kart książek i modali.
- **Łuski:** tekstura smoczych łusek jako `mask-image` w tle hero i stopki (opacity 4–6%).
- **Gwiazdozbiory:** cienkie linie łączące punkty w tle sekcji Wyroczni; gwiazdy lekko migoczą.
- **Runy tropów:** każdy trop ma własny glif w stylu runicznym (np. dwa skrzyżowane ostrza dla *enemies to lovers*, splecione nici dla *fated mates*, skrzydło dla *jeźdźców smoków*, korona z gałązek dla *dworów fae*, dłoń z pieczęcią dla *paktów i targów*).
- **Pieczęć lakowa:** odznaka „Przeczytane” i potwierdzenia ważnych akcji (w `--blood`, z odciśniętym płomieniem).
- **Płomienie pikanterii:** zamiast papryczek — 0–5 płomieni w `--ember`.
- **Sylwetka smoka:** w hero raz na wejście przelatuje na tle księżyca (animacja CSS, ~6 s, tylko przy pierwszej wizycie w sesji).
- **Mapa:** strona autora ma tło stylizowane na starą mapę z różą wiatrów.

### 2.6 Nawiązania do książek — język i mikrocopy

Interfejs mówi **językiem gatunku**. Klimatyczna nazwa zawsze idzie w parze z jasnym znaczeniem (podtytuł, tooltip lub `aria-label`), żeby nie cierpiała użyteczność.

| Element | Nazwa w serwisie | Znaczenie (podpis / aria) |
|---|---|---|
| Rejestracja | **Zawrzyj pakt** | Załóż konto |
| Logowanie | **Przekrocz próg** | Zaloguj się |
| Wylogowanie | **Opuść dwór** | Wyloguj |
| Moja półka | **Skarbiec** | Twoje książki |
| TBR | **Stos przeznaczenia** | Do przeczytania |
| Czytam | **W trakcie wyprawy** | Czytam teraz |
| Przeczytane | **Zapieczętowane** | Przeczytane |
| Wyszukiwarka | **Przeszukaj archiwum** | Szukaj książek |
| Premiery | **Nadchodzące przepowiednie** | Kalendarz premier |
| Ostrzeżenia treści | **Zanim przekroczysz próg** | Ostrzeżenia treści |
| Quiz | **Wyrocznia** | Quiz rekomendacji |

**Skala pikanterii:**
0 — *Niewinny pocałunek* · 1 — *Iskra* · 2 — *Żar* · 3 — *Płomień* · 4 — *Pożoga* · 5 — *Smoczy ogień*

**Rangi czytelniczki** (wg liczby przeczytanych książek): *Nowicjuszka → Adeptka → Kadetka → Jeźdźczyni → Strażniczka Archiwum → Smocza Kronikarka*.

**Wyniki Wyroczni** — własne, oryginalne „dwory”, nie z żadnej serii: *Dwór Popiołu* (smoki, wojna, enemies to lovers), *Dwór Szronu* (zimne serca, slow burn), *Dwór Mgieł* (fae, intrygi, pakty), *Dwór Ciernia* (mroczny romans, morally grey), *Dwór Świtu* (found family, nadzieja).

**Stany systemowe:**
- Ładowanie: „Smok przeszukuje skarbiec…”
- Pusta półka: „Twój skarbiec jest pusty. Nawet smok musi od czegoś zacząć.”
- Brak wyników: „Archiwum milczy. Spróbuj innych run.”
- 404: „Ta ścieżka zarosła cierniami.” + link powrotny „Wróć na trakt”
- 500: „Coś przebudziło się w lochach. Próbujemy to uspokoić.”
- Toast sukcesu: „Kruk doręczył wiadomość.”
- Brak sieci: „Mgła odcięła drogę do archiwum.”

**Tropy w katalogu** opisane krótkim, klimatycznym akapitem w głosie „kronikarki”, np. *Fated mates — „Nici przeznaczenia splotły się, zanim którekolwiek z nich wiedziało o istnieniu drugiego.”* (wszystkie opisy pisane własnymi słowami, bez cytatów z książek).

### 2.7 Komponenty

| Komponent | Wygląd | Zachowanie |
|---|---|---|
| **Karta książki** | okładka z winietą, złote narożniki, runy tropów, płomienie pikanterii | hover: uniesienie o 4 px + ciepła poświata `--ember` wokół okładki |
| **Hero** | mgławica, sylwetka gór, księżyc, unoszące się iskry | nagłówek pojawia się z lekkim rozmyciem (fade + blur) |
| **Przycisk główny** | gradient *Żar*, Cormorant small-caps | hover: przebiegający błysk światła po powierzchni |
| **Przycisk drugorzędny** | przezroczysty, obramowanie `--gilt` 1 px | hover: wypełnienie `--velvet` |
| **Tag tropu** | pigułka z runą, tło `--velvet`, tekst `--fae` | aktywny filtr: świecąca obwódka |
| **Pole formularza** | tylko dolna linia jak atrament na pergaminie | focus: linia rozlewa się od środka w `--gilt` |
| **Modal** | stylizowany na zwój/list z pieczęcią lakową na górze | otwarcie: rozwinięcie w pionie |
| **Zakładki** | jak grzbiety ksiąg na półce | aktywna „wysuwa się” do przodu |
| **Toast** | mały pergamin w rogu z ikoną kruka | znika po 4 s |
| **Oś serii** | tomy jako gwiazdy połączone linią gwiazdozbioru | nieprzeczytane tomy przygaszone |

### 2.8 Ruch i animacje

- Tempo: **powolne i miękkie** (300–600 ms, `ease-out`), nic nie skacze.
- Przejścia między stronami: **View Transitions API** (`withViewTransitions()` w routerze) — okładka książki płynnie przechodzi z karty na stronę szczegółów.
- Iskry/świetliki w hero: lekki canvas lub CSS, uruchamiane **dopiero w `afterNextRender`** (nie istnieją w HTML z serwera).
- Wszystkie animacje dekoracyjne wyłączane przy `prefers-reduced-motion: reduce`.
- Animacje nie mogą powodować przesunięć układu (CLS = 0 od dekoracji).

### 2.9 Okładki i obrazy

- Okładki z Open Library Covers API (`https://covers.openlibrary.org/b/isbn/{isbn}-M.jpg`), wyświetlane przez `NgOptimizedImage` z zadeklarowanymi wymiarami (proporcje 2:3).
- Fallback: własna generowana karta — tło w kolorze krainy, tytuł w Cinzel, runa głównego tropu.
- Okładki to wyłącznie miniatury w katalogu. **Nie** używamy ich jako dekoracji, tła ani w identyfikacji serwisu.
- Obrazek hero: własna ilustracja/SVG, ładowana z `priority`.

### 2.10 Wymogi stylistyczne a SSR

- Motyw (noc/pergamin) i kraina ustalane **na serwerze** — zero mignięcia przy wejściu.
- Krytyczny CSS inline (domyślna optymalizacja buildu Angulara) — zweryfikować, że hero renderuje się poprawnie bez reszty arkusza.
- Sprite SVG z ornamentami wstawiany inline w `index.html`, żeby ornamenty były w HTML z serwera.
- Dekoracje wymagające JS (iskry, przelot smoka, migotanie gwiazd) **nie są** częścią hydratowanego DOM — dodawane wyłącznie po stronie klienta.
- Strona musi wyglądać „kompletnie” przy wyłączonym JS — klimat ma nieść CSS, nie skrypty.

---

## 3. Mapa tras i strategie renderowania

To serce projektu — każda trasa ma uzasadniony tryb.

| Trasa | RenderMode | Dlaczego |
|---|---|---|
| `/` | **Prerender** | Statyczny landing, maksymalne SEO i LCP |
| `/tropy` | **Prerender** | Lista tropów zmienia się rzadko |
| `/tropy/:slug` | **Prerender** + `getPrerenderParams` | Skończona lista tropów, znana w buildzie |
| `/poradnik/:slug` | **Prerender** | Artykuły typu „Od czego zacząć romantasy” |
| `/ksiazka/:slug` | **Server** | Tysiące pozycji, dane się zmieniają (oceny, status serii). Opcjonalnie: prerender top 50 |
| `/autor/:slug` | **Server** | j.w. |
| `/szukaj` | **Server** | Query params → wyniki indeksowalne (`/szukaj?trop=fated-mates&pikanteria=3`) |
| `/premiery` | **Server** | Musi być świeże; nagłówek `Cache-Control: s-maxage=3600` |
| `/moja-polka/**` | **Client** | Prywatne, bez SEO, za logowaniem |
| `/wyrocznia` | **Client** | Interaktywny quiz, zero wartości SEO |
| `/logowanie` | **Server** | Formularz działa bez JS (progressive enhancement) |
| `**` | **Server** | Prawdziwe **404** przez `RESPONSE_INIT` |

```ts
// app.routes.server.ts (szkic)
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'tropy', renderMode: RenderMode.Prerender },
  {
    path: 'tropy/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const tropes = inject(TropeService);
      return (await tropes.allSlugs()).map(slug => ({ slug }));
    },
  },
  { path: 'moja-polka/**', renderMode: RenderMode.Client },
  { path: 'wyrocznia', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server },
];
```

---

## 4. Architektura

```
┌──────────────── server.ts (Express + AngularNodeAppEngine) ────────────────┐
│  /api/*        → własne REST API (książki, tropy, półka, auth)             │
│  /sitemap.xml  → generowana dynamicznie                                    │
│  /rss/premiery → RSS                                                       │
│  /og/:slug.png → generowany obrazek Open Graph (opcjonalnie, etap 7)       │
│  *             → Angular SSR                                               │
└────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
   SQLite (better-sqlite3 / Drizzle)  ←  seed: ~100 książek + tropy
          ▲
          │ jednorazowy import metadanych
   Open Library API
```

- **Frontend:** Angular (standalone, signals, nowy control flow), SSR włączone od startu (`ng new --ssr`).
- **Backend:** Express w `server.ts` — świadomie ten sam proces, żeby ćwiczyć Node.js.
- **Baza:** SQLite na start (zero konfiguracji), z możliwością przejścia na Postgres.
- **Dane:** skrypt `scripts/seed.ts` pobiera metadane z Open Library po ISBN; tropy, pikanteria i ostrzeżenia uzupełniane ręcznie w pliku `seed/books.json`.

### Model danych (skrót)

```ts
Book      { id, slug, title, authorId, seriesId?, seriesIndex?, isbn, year, pages,
            description, spice: 0–5, contentWarnings: string[], coverUrl? }
Trope     { id, slug, name, description, icon }
BookTrope { bookId, tropeId }
Series    { id, slug, name, status: 'ongoing' | 'completed', plannedBooks? }
Author    { id, slug, name, bio }
Release   { id, bookId?, title, authorId, date }
User      { id, email, passwordHash, displayName, theme: 'night' | 'parchment' }
ShelfItem { userId, bookId, status: 'tbr' | 'reading' | 'read', rating?, note? }
```

---

## 5. Lista zagadnień SSR do przećwiczenia

Każdy punkt ma przypisane miejsce w aplikacji — odhaczaj w trakcie.

### Konfiguracja i renderowanie
- [ ] `provideServerRendering(withRoutes(serverRoutes))` i `AngularNodeAppEngine`
- [ ] Hybrid rendering: Prerender / Server / Client (§3)
- [ ] `getPrerenderParams` dla `/tropy/:slug` i top 50 książek
- [ ] Porównanie outputu buildu: co ląduje w `browser/` jako HTML, a co nie

### Dane
- [ ] `HttpClient` + `withFetch()` po stronie serwera
- [ ] Transfer cache: `withHttpTransferCacheOptions` — sprawdź w DevTools, że po hydracji nie ma podwójnych requestów
- [ ] Bezwzględne URL-e API na serwerze vs względne w przeglądarce (interceptor)
- [ ] Resolvery vs ładowanie w komponencie (`resource` / `httpResource`) — porównaj zachowanie na serwerze

### Hydracja
- [ ] `provideClientHydration(withEventReplay(), withIncrementalHydration())`
- [ ] Event replay: kliknięcie „Dodaj do półki” zanim JS się załaduje (throttling w DevTools)
- [ ] Incremental hydration: `@defer (on viewport; hydrate on viewport)` dla sekcji „Podobne książki” i „Recenzje”
- [ ] `@defer (hydrate never)` dla stopki i ozdobnych sekcji
- [ ] Celowe wywołanie i naprawa błędów **NG0500** (patrz §6)

### Kod zależny od platformy
- [ ] `afterNextRender` dla animacji świetlików i odliczania premier
- [ ] Zero bezpośrednich odwołań do `window` / `document` / `localStorage` poza wydzielonymi serwisami
- [ ] `DOCUMENT` z DI do manipulacji `<html data-theme>`

### Request / Response
- [ ] `REQUEST` — odczyt cookie sesji i motywu na serwerze
- [ ] `RESPONSE_INIT` — status **404** dla nieistniejącej książki, **301** dla starego sluga
- [ ] `REQUEST_CONTEXT` — przekazanie danych z Express (np. zalogowany user) do Angulara
- [ ] Nagłówki cache per trasa (Express middleware)

### Auth
- [ ] Sesja w **httpOnly cookie** (nie token w localStorage)
- [ ] Guard działający na serwerze → przekierowanie zamiast mignięcia treścią
- [ ] Formularz logowania działający bez JS (POST do Express)

### SEO
- [ ] `Title` / `Meta` z danych książki
- [ ] Open Graph + Twitter Card
- [ ] JSON-LD `schema.org/Book` na stronie książki
- [ ] `<link rel="canonical">` dla `/szukaj` z różną kolejnością parametrów
- [ ] `sitemap.xml` i `robots.txt` z Express
- [ ] Weryfikacja: `curl` strony bez JS pokazuje pełną treść

### Wydajność i deploy
- [ ] Lighthouse przed/po incremental hydration (LCP, TBT, INP)
- [ ] `NgOptimizedImage` z `priority` dla okładki na stronie książki
- [ ] Deploy na hosting z Node (Render / Fly.io / VPS) + zmienne środowiskowe
- [ ] (opcjonalnie) cache HTML dla tras Server w Express lub CDN

---

## 6. Celowe pułapki hydracji (ćwiczenia)

Te funkcje są zaprojektowane tak, żeby naiwna implementacja **psuła hydrację**. Najpierw zrób źle, zobacz błąd, potem napraw.

| Funkcja | Naiwna wersja | Problem | Docelowe rozwiązanie |
|---|---|---|---|
| **Trop dnia** | `Math.random()` w komponencie | Inny wynik na serwerze i kliencie → NG0500 | Deterministyczny seed z daty (UTC) liczony na serwerze + transfer state |
| **Odliczanie do premiery** | `Date.now()` w szablonie | Różnica czasu serwer/klient | Render daty na serwerze, odliczanie startuje w `afterNextRender` |
| **Motyw noc/pergamin** | Odczyt z `localStorage` | Serwer nie zna motywu → mignięcie (FOUC) i mismatch | Cookie `theme` czytane przez `REQUEST`, ustawiane na `<html>` już w SSR |
| **„Ostatnio oglądane”** | `localStorage` w `ngOnInit` | Crash na serwerze | Sekcja w `@defer` / `RenderMode.Client` lub `afterNextRender` |
| **Format daty i liczby** | Domyślne locale przeglądarki | Serwer ma inne locale | Jawne `LOCALE_ID = 'pl'` |

---

## 7. Etapy

| # | Etap | Zakres | Główne zagadnienia |
|---|---|---|---|
| 0 | Setup | `ng new --ssr`, tokeny CSS, fonty, layout, seed danych | Konfiguracja SSR, struktura `server.ts` |
| 1 | Katalog | `/ksiazka/:slug`, `/autor/:slug`, API w Express | Server rendering, transfer cache, 404 |
| 2 | Tropy i landing | `/`, `/tropy`, `/tropy/:slug`, trop dnia | Prerender, `getPrerenderParams`, pułapka #1 |
| 3 | Wyszukiwarka | `/szukaj` z filtrami w query params | SSR z parametrami, canonical, formularz bez JS |
| 4 | SEO | Meta, OG, JSON-LD, sitemap, robots | Meta services, endpointy w Express |
| 5 | Konta i półka | Logowanie, `/moja-polka`, motyw w cookie | Cookie auth, `REQUEST`, guardy, Client mode, pułapka #3 |
| 6 | Premiery i dopieszczenie | `/premiery`, RSS, incremental hydration, event replay | `@defer hydrate`, cache headers, pułapka #2 |
| 7 | Wyrocznia i deploy | Quiz, generowanie obrazków OG, deploy | Client-only route, Node (generowanie PNG), produkcja |

---

## 8. Kryteria akceptacji (całość)

- Każda publiczna strona zwraca pełny HTML z treścią przy wyłączonym JS.
- Brak błędów hydracji w konsoli na wszystkich trasach.
- Nieistniejąca książka zwraca HTTP 404 (sprawdzone `curl -I`).
- Po hydracji strony książki nie ma powtórnych requestów do `/api`.
- Motyw nie miga przy przeładowaniu strony.
- `/moja-polka` niezalogowanej osoby przekierowuje na `/logowanie` już z serwera (HTTP 302).
- Lighthouse SEO ≥ 95, LCP < 2,5 s na stronie książki (mobile, throttling).
- Kliknięcie „Dodaj do półki” przed pełną hydracją nie ginie (event replay).

---

## 9. Pomysły na później
- i18n (PL/EN) z prerenderem obu wersji
- Kluby czytelnicze z wątkami dyskusji
- Porównanie tropów dwóch książek („Jeśli lubisz X, spróbuj Y”)
- PWA i offline dla półki
- Migracja SQLite → Postgres i deploy z osobną bazą
