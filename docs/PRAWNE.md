# Przegląd prawny serwisu „Łuska i Ciernie”

Stan na 2026-10-29. Dotyczy wersji polskiej (`/`) i angielskiej (`/en/`). Serwis jest kierowany do
czytelniczek w Polsce, więc punktem odniesienia jest prawo polskie i unijne.

> **To nie jest porada prawna.** Dokument porządkuje ryzyka i opisuje, co zrobiono w kodzie. Przed
> uruchomieniem produkcyjnym, a zwłaszcza przed jakimkolwiek zarobkowaniem (reklamy, afiliacja),
> warto skonsultować go z prawnikiem od prawa autorskiego i ochrony danych.

## Podsumowanie

| Obszar | Ryzyko | Stan | Co dalej |
|---|---|---|---|
| Okładki z Open Library | **wysokie** w produkcji | przełącznik `COVER_SOURCE=none` i własne generowane okładki | na produkcji `none`, dopóki nie ma licencji (§1) |
| Fonty Google | średnie (RODO) | **naprawione**: fonty z własnej domeny (`@fontsource`) | — |
| Połączenia do covers.openlibrary.org | średnie (RODO) | usunięty `preconnect`; przy `COVER_SOURCE=none` brak połączeń | — |
| Opisy, biogramy, ostrzeżenia | niskie | własne teksty, bez cytatów (SPEC §1) | utrzymać zasadę przy nowych danych |
| Tytuły, nazwy serii | niskie | użycie opisowe (oznaczenie książki) | nie robić z tytułów nazw własnych usług |
| Cookies | brak (obecnie żadnych) | — | przy logowaniu (etap Auth) i motywie: informacja, ew. zgoda (§3) |
| Konta użytkowników | — (jeszcze nie ma) | — | polityka prywatności, regulamin (§2, §4) |
| Dane usługodawcy, regulamin | średnie po dodaniu kont | brak | dodać przed publikacją (§4) |

---

## 1. Okładki książek

### Czy wolno je pokazywać?

Okładka to **utwór** w rozumieniu prawa autorskiego (ilustracja, fotografia, projekt graficzny).
Prawa mają zwykle ilustrator lub grafik i wydawca, a nie autorka książki. Okładki polskich wydań
często mają inne ilustracje niż oryginał, więc też innych uprawnionych.

W polskim prawie nie ma przepisu, który ogólnie pozwalałby pokazywać okładki w katalogu.
- Najbliższe jest **prawo cytatu (art. 29 pr. aut.)**. Pozwala przytoczyć cały utwór plastyczny w utworze samoistnym, ale tylko w uzasadnionym celu (wyjaśnianie, analiza krytyczna, nauczanie), w proporcji do własnej treści i z podaniem twórcy i źródła (art. 34).
- Okładka jako ilustracja przy karcie książki to przypadek graniczny: nie analizujemy okładki, tylko ją pokazujemy, a autora ilustracji zwykle nie znamy.
- Dozwolony użytek nie może też naruszać normalnego korzystania z utworu ani słusznych interesów twórcy (art. 35).

### A osadzanie (hotlinking) z Open Library?

Obrazy nie leżą na naszym serwerze, tylko ładuje je przeglądarka z `covers.openlibrary.org`.
Według TSUE:
- osadzenie treści **swobodnie dostępnej w sieci za zgodą uprawnionego** nie jest nowym publicznym udostępnieniem (*Svensson*, C‑466/12; *BestWater*, C‑348/13);
- obejście zabezpieczeń przed osadzaniem już nim jest (*VG Bild‑Kunst*, C‑392/19);
- kto linkuje w celach zarobkowych, ten **z założenia powinien wiedzieć**, czy źródło jest legalne (*GS Media*, C‑160/15).

Słaby punkt: Open Library nie jest uprawnionym do okładek i nie gwarantuje, że ma licencje od wydawców.
Osadzanie zmniejsza ryzyko, ale go nie usuwa, szczególnie po wprowadzeniu reklam lub afiliacji.

Open Library prosi też, by API służyło do niskiego, „ludzkiego” ruchu, z nagłówkiem `User-Agent`,
a nie do masowego pobierania. Nasze skrypty seed są z tym zgodne: kilkaset zapytań z przerwami.

### Lokalne okładki (pl)

Mechanizm jest gotowy. `covers.pl` w `seed/books.json` wskazuje okładkę polskiego wydania, a
`Catalog.coverUrl()` wybiera ją według języka. Prawnie nic to nie zmienia: te same zasady, tylko
inni uprawnieni. Okładki ma kilkanaście książek, tam gdzie Open Library zna polskie wydanie.
**Nie pobieraliśmy okładek z księgarń ani serwisów wydawców**, bo to zwielokrotnianie cudzych utworów.

### Co zrobiono w kodzie

- `COVER_SOURCE=none` (zmienna środowiskowa serwera): API zwraca `coverUrl: null`, a `<app-cover>` rysuje własną okładkę z kolorem krainy, runą tropu, tytułem i autorką (SPEC §2.9). Nikt nie ma do niej praw poza nami, a przeglądarka nie łączy się z zewnętrznym serwerem.
- Domyślnie (dev) okładki są włączone, żeby przyjemnie się pracowało.

### Rekomendacja

1. **Produkcja: `COVER_SOURCE=none`**, dopóki nie ma źródła z licencją.
2. Źródła z licencją, od najprostszego:
   - materiały prasowe wydawców z pisemną zgodą na użycie w katalogu (mail do działu promocji);
   - programy partnerskie księgarń, których warunki **wprost** pozwalają wyświetlać okładki (sprawdzić konkretny regulamin);
   - indywidualna zgoda wydawców dla najpopularniejszych tytułów.
3. Przy każdej licencji zapisać w seedzie źródło okładki i podstawę prawną (np. `coverSource`, `coverLicense`).

## 2. Ochrona danych (RODO)

- **Fonty — naprawione.** Wczytywanie Google Fonts z serwerów Google przekazuje Google adres IP odwiedzającego, a adres IP jest daną osobową. Bez zgody trudno to uzasadnić, skoro fonty można po prostu hostować u siebie. Fonty są teraz w buildzie (`@fontsource`, licencja OFL) i serwowane z naszej domeny.
- **Okładki z Open Library.** Analogicznie: przeglądarka łączy się z serwerem Internet Archive (USA) i przekazuje IP. Przy `COVER_SOURCE=none` to znika. Usunięto też `<link rel="preconnect">`, który łączył się z Open Library przy każdej wizycie, nawet bez okładek. Alternatywa „proxy okładek przez nasz serwer” rozwiązałaby kwestię IP, ale wtedy **sami** zwielokrotniamy i udostępniamy utwór, co jest gorsze pod kątem prawa autorskiego.
- **Logi serwera** (`[api] …` w konsoli) nie zapisują IP. Jeśli kiedyś będą (bezpieczeństwo), podstawą jest prawnie uzasadniony interes (art. 6 ust. 1 lit. f), z krótką retencją i wzmianką w polityce prywatności.
- **Konta (etap Auth):** obowiązek informacyjny (art. 13 RODO) w polityce prywatności, podstawa art. 6 ust. 1 lit. b (umowa: konto i półka), minimalizacja danych (e‑mail i hasło), hasła haszowane (argon2/bcrypt), możliwość usunięcia konta, umowy powierzenia z dostawcami (hosting, wysyłka maili).

## 3. Cookies i podobne technologie

Od 10.11.2024 obowiązuje **art. 399 Prawa komunikacji elektronicznej** (zastąpił art. 173 Prawa
telekomunikacyjnego). Zapis informacji na urządzeniu wymaga uprzedniej informacji i zgody, poza
wyjątkami: niezbędne do transmisji albo do usługi, której użytkownik wyraźnie żąda.

W praktyce dla nas:
- cookie sesji po zalogowaniu (etap Auth) to wyjątek „niezbędne”: tylko informacja w polityce prywatności, bez banera zgody;
- cookie z wybranym motywem (etap motywu) to preferencja ustawiona na wyraźne żądanie, raczej też wyjątek, ale warto o nim napisać;
- analityka, piksele reklamowe i osadzone media zewnętrzne **wymagają zgody** (baner z równorzędnym „odrzuć”).

Obecnie serwis nie zapisuje **żadnych** cookies ani `localStorage`.

## 4. Obowiązki informacyjne usługodawcy

- Ustawa o świadczeniu usług drogą elektroniczną: usługodawca podaje swoje dane (art. 5), a przy usługach takich jak konto i półka potrzebny jest **regulamin** (art. 8).
- **Do zrobienia przed publikacją:** strony „Regulamin” i „Polityka prywatności” z linkami w stopce, w obu wersjach językowych.

## 5. Treści katalogu

- **Opisy książek, tropów, biogramy:** pisane od zera, bez cytatów i bez streszczeń okładkowych wydawców (SPEC §1). Przy rozbudowie bazy **nie kopiować** blurbów z księgarń, Goodreads ani lubimyczytac.pl, bo to cudze utwory.
- **Tytuły:** sam tytuł zwykle nie jest utworem, bo jest zbyt krótki, by mieć twórczy charakter. Używamy go wyłącznie do wskazania tej książki. Nie należy natomiast nazywać tytułami własnych usług, domen ani produktów.
- **Nazwy serii i marki** (np. „Fourth Wing”, „Throne of Glass”) bywają znakami towarowymi. Użycie opisowe jest dozwolone (art. 14 rozporządzenia 2017/1001), o ile nie sugeruje współpracy z wydawcą.
- **Tytuły polskich wydań** to fakty bibliograficzne z katalogu Biblioteki Narodowej (`data.bn.org.pl`). Licencji danych BN nie zweryfikowałem, do sprawdzenia przed produkcją. Metadane Open Library są publicznie dostępne, z prośbą o umiarkowany ruch.
- **Pikanteria, tropy, ostrzeżenia** to oceny redakcyjne. Dobrze dopisać przy skali, że to subiektywna ocena redakcji.
- **Treści od użytkowników** (recenzje, komentarze), jeśli powstaną: obowiązki hostingodawcy z DSA (mechanizm zgłaszania treści, art. 16; uzasadnianie decyzji moderacyjnych).
- **Linki afiliacyjne** (jeśli powstaną) trzeba wyraźnie oznaczać jako reklamę (ustawa o przeciwdziałaniu nieuczciwym praktykom rynkowym, wytyczne UOKiK).

## 6. Licencje oprogramowania i zasobów

- Fonty **Cinzel Decorative, Cormorant Garamond, EB Garamond, Inter**: SIL Open Font License 1.1. Wolno je osadzać i serwować; licencja zostaje w `node_modules/@fontsource/*/LICENSE`.
- Angular, Express i pozostałe zależności to głównie MIT. Przed produkcją warto wygenerować zestawienie licencji (np. `npx license-checker --summary`).
- Runy, favicon i generowane okładki to własne grafiki projektu.

## 7. Dostępność

Europejski akt o dostępności (w PL ustawa z 26.04.2024, obowiązuje od 28.06.2025) obejmuje m.in.
e‑commerce. Katalog bez sprzedaży raczej nie podlega mu wprost. Gdyby doszła sprzedaż lub płatne
konta, trzeba to ocenić ponownie. Niezależnie od tego trzymamy się WCAG: kontrast, nawigacja
klawiaturą i teksty alternatywne są już w projekcie.

---

### Źródła

- Ustawa z 4.02.1994 o prawie autorskim i prawach pokrewnych, art. 29, 34, 35.
- Prawo cytatu w praktyce: [prawo.pl](https://www.prawo.pl/biznes/dozwolony-uzytek-w-prawie-autorskim-co-wolno-a-czego-nie,535807.html), [ifirma.pl](https://www.ifirma.pl/blog/prawo-cytatu/).
- TSUE C‑392/19 *VG Bild‑Kunst*: [curia.europa.eu](https://curia.europa.eu/jcms/jcms/p1_3453439), omówienie [Bristows](https://www.bristows.com/viewpoint/articles/the-eu-court-of-justices-decision-in-vg-bild-kunst-v-spk-on-framing).
- Art. 399 PKE: [standardyprawa.pl](https://standardyprawa.pl/akt/532/art/63604).
- Open Library, zasady API: [openlibrary.org/developers/api](https://openlibrary.org/developers/api).
