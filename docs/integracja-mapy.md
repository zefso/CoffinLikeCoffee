# Mapa: dane, integracja i weryfikacja

Stan lokalnej implementacji: **25.11.2026**. Właściciel F01–F04: Roman Horbach (@zefso). Zakres uwag prowadzącego: [Issue #4](https://github.com/zefso/CoffinLikeCoffee/issues/4). Dokument nie oznacza publikacji zmian w repozytorium.

## Uruchomienie

```bash
python manage.py migrate
python manage.py seed_places
python manage.py runserver 8080
```

W Dockerze: `docker compose exec web python manage.py seed_places` po uruchomieniu kontenera. Migracja 0004 dodaje piętro 0 do istniejących miejsc. Nie zmienia ich ID, kodów, statusów ani relacji rezerwacji.

Seeder tworzy brakujące miejsca na piętrach 0, −1, −2, −3 i −4. Każde piętro ma demonstracyjne 128/84/56 miejsc w strefach 1/2/3: 268 na piętro, 1340 łącznie w pustej bazie. `seed_places --floors 0` uzupełnia tylko powierzchnię. Polecenie można powtarzać; nie nadpisuje danych. Migracje nie dodają miejsc demonstracyjnych. Bez seedera piętra podziemne mogą być puste i mapa pokazuje właściwy komunikat.

## Wspólny model

`cemetery.models.Place` ma stabilny ID i unikalne położenie `(floor, level, sector, row, number)`. Baza dopuszcza piętra tylko od −4 do 0. Rezerwacja korzysta z FK `place` z `PROTECT`.

| Pole | Znaczenie |
|---|---|
| `id` | Identyfikator przekazywany do rezerwacji; niezależny od widoku mapy |
| `floor` | Fizyczne piętro: 0 = powierzchnia, −1 = ziemia, −2 = kamień, −3 = łupek, −4 = lawa |
| `level` | Dotychczasowa strefa cenowa: 1 = Ogród Pamięci, 2 = Taras Ciszy, 3 = Galeria Wspomnień |
| `sector` | Nazwa sektora z bazy; A–D to wyłącznie przykładowe dane |
| `row`, `number` | Numery rzędu i miejsca; mapa nie ogranicza ich do 4/8 |
| `kind` | `adult`, `child` |
| `capacity` | `single`, `double`, `family` |
| `ground` | `standard`, `reinforced`; cecha techniczna miejsca, niezależna od wyglądu piętra |
| `status` | `available`, `reserved`, `occupied` |

Kod powierzchni pozostaje np. `1-A-01-02`. To samo położenie na piętrze −1 ma osobny ID i kod `P-1/1-A-01-02`. **Nie zamieniamy `level` na `floor`**: dotychczasowy cennik i pakiety nadal korzystają ze stref 1–3. Piętro nie dodaje opłaty.

## API i stan w URL

- `GET /api/miejsca/` zwraca `{"places": [...]}` dla wszystkich pięter.
- Filtry API łączą się przez AND, np. `?floor=-2&level=1&sector=A&row=2&kind=adult&capacity=single&ground=standard&status=available`.
- Brak `floor` oznacza wszystkie piętra; `floor=0` wybiera tylko powierzchnię.
- Puste wartości są pomijane; niepoprawne liczby i wartości słownikowe zwracają 400 z polem `error`.
- Pusty wynik to 200 i `{"places": []}`. `GET /api/miejsca/<id>/` zwraca jeden obiekt albo 404. Zapis jest niedozwolony (405).
- Obiekt zawiera pola z tabeli, `code` i `level_name`; nie zawiera danych klientów. Odpowiedzi mają `Cache-Control: no-store`.

Pełna mapa pobiera cały demonstracyjny zbiór jednym `fetch` przy wejściu i przyciskiem „Odśwież”. Filtruje go lokalnie, dzięki czemu geometria sektora pozostaje stabilna: ukrycie miejsc nie przesuwa innych. Nie jest to aktualizacja w czasie rzeczywistym. Zapis rezerwacji ponownie sprawdza dostępność na serwerze.

Mapa zaczyna od piętra 0. URL zapisuje filtry, `floor`, `widok=2d` (domyślnie 3D) i `miejsce=<id>`. Przykład: `/mapa/?floor=-3&level=2&sector=A&widok=2d&miejsce=<id>`. Odświeżenie oraz Wstecz/Dalej przywracają stan. Link zawierający samo `miejsce` rozpoznaje piętro z danych miejsca. Po zmianie filtra lub piętra poprzedni wybór jest usuwany. Reset filtrów pozostawia oglądane piętro.

## Obsługa mapy

- **3D:** stylizowane bryły, przeciąganie obraca i zmienia nachylenie; strzałki robią to samo z klawiatury.
- **2D:** płaski plan prosto z góry. Brak perspektywy i pionowych ścian. Przeciąganie lub strzałki przesuwają plan, bez obracania.
- **Skala:** kółko myszy, przyciski +/− lub klawisze +/−; Home i „Reset widoku” przywracają kamerę.
- **Piętro:** okrąg w prawym dolnym rogu rozwija pięć opcji z łagodną animacją. Wybranie piętra zamyka listę i aktualizuje numer w okręgu, dane oraz otoczenie. Escape, kliknięcie poza listą lub przeniesienie fokusu poza przełącznik zamyka go. Opcje działają z Tab, strzałkami i Enter. Zamknięte opcje są `inert`.
- **Miejsce:** kliknięcie obiektu lub przycisku z rozwijanej „Listy miejsc” otwiera szczegóły. Status opisują także W/R/Z i tekst, a zaznaczenie jest złote. Rezerwacja jest dostępna tylko dla `available`.
- **Dostępność:** widoczne stany ładowania, pustych danych i błędu z ponowieniem; lista przycisków jako alternatywa dla Canvas; `prefers-reduced-motion` wyłącza animacje przejść.

Podział kodu: `map-layout.js` wylicza współrzędne, `map-3d.js` rysuje oba widoki i obsługuje kamerę, `map-floors.js` odpowiada za przełącznik pięter, `map.js` za dane, filtry, URL i szczegóły. Bez CDN, WebGL i nowych zależności aplikacji.

## Strona główna

Liczniki w `cemetery/views.py` korzystają z agregacji modelu `Place`; karty pokazują sumę miejsc danej strefy na wszystkich piętrach. Odnośniki kart ustawiają `?level=1/2/3`.

Mini-mapa SVG pokazuje powierzchnię z `/api/miejsca/?floor=0`, co zapobiega nakładaniu pięciu pięter. Startuje na środku placu pamięci. Kółko przybliża do kursora, przeciąganie przesuwa, dwa palce zmieniają skalę. Klawiatura: strzałki, +/−, Home. Kliknięcie miejsca otwiera pełną mapę z jego ID, strefą i sektorem. Tekst pomocy pozostaje poza skalowaną mapą. Pozostałe piętra są dostępne na pełnej mapie.

## Przejście do rezerwacji i zadania zespołu

1. Użytkownik wybiera wolne miejsce na `/mapa/`.
2. Link `/rezerwacje/nowa/?miejsce=<id>&mapa=<parametry>` ustawia typ, pojemność, strefę i sektor, zaznacza pakiet „Wybrane miejsce” i otwiera krok 3. Opcjonalne `mapa` zawiera wyłącznie filtry, tryb i wybór z mapy, bez danych osobowych i bez adresu przekierowania.
3. Formularz pokazuje to samo zaznaczone miejsce, wiersz „Miejsce z mapy” i piętro w podsumowaniu. Sektory w formularzu są rozdzielone według piętra; wybrane piętro jest pierwsze.
4. Krok 4 wymaga logowania. Parametry wyboru są zachowane w `next`, dane osobowe nie trafiają do URL.
5. Moduł F06 sprawdza dane i aktualną dostępność, zapisuje rezerwację z FK do właściwego miejsca i wyświetla wynik na liście klienta.
6. Link powrotu z formularza odtwarza cały wejściowy widok (również rząd, status, grunt i 2D/3D), dopóki klient nie zmieni miejsca lub pakietu. Stan pozostaje po odświeżeniu i przejściu przez logowanie. „Pokaż na mapie” z listy rezerwacji przywraca miejsce; mapa odczytuje z niego także piętro.

**Viktor:** pakiety z automatycznym przydziałem nadal wybierają z całej strefy/sektora/rzędu, również na różnych piętrach. Wybór konkretnego piętra jest obecnie gwarantowany przez pakiet konkretnego miejsca. Ewentualny filtr piętra dla pozostałych pakietów wymaga osobnego rozszerzenia formularza i reguł serwera; mapa nie zmienia cennika.

**Volodymyr:** panel powinien używać wspólnych `create_reservation` i `cancel_reservation`, identyfikować miejsce po ID i pokazywać piętro. Seedowane miejsca `reserved` nie mają rekordu rezerwacji.

**Znane blokady poza F01–F04:** w obecnym F07 anulowanie ma niezgodną trasę w trzech testach, błędnie sprawdza właściciela zamiast `customer_id` i zapisuje `free` zamiast `available`. Wymaga poprawy przed odbiorem pełnej ścieżki obejmującej anulowanie. Panele F10/F11 nie są gotowe.

## Weryfikacja 25.11.2026

Automatycznie: testy API, filtrów, pięter, ograniczeń bazy, powtarzalności seedera i zachowania miejsc powierzchni; liczniki i linki strony głównej; nagłówek według sesji; rezerwacja podziemnego ID bez zmiany ceny i statusu odpowiadającego miejsca na powierzchni. Testy Node obejmują nieregularne rzędy/numery, pusty sektor i rzut 2D niezależny od wysokości i obrotu.

```bash
python manage.py test cemetery.tests.MapTests
python manage.py test cemetery.tests.ReservationTests.test_place_from_underground_map_keeps_id_floor_and_price
node --test tests/map-layout.test.cjs
python manage.py check
python manage.py makemigrations --check --dry-run
```

W przeglądarce na kopii bazy: pięć pięter, menu i klawiatura, 2D/3D, kliknięcie Canvas przy DPR 2, stan po odświeżeniu i Wstecz/Dalej, przejście do formularza z tym samym podziemnym ID i powrót, pusty wynik i reset, błąd sieci i ponowienie, nowy sektor Z9/rząd 12/numer 16, ograniczenie animacji oraz mini-mapa powierzchni ze stabilnym tekstem pomocy podczas zoomu. Sprawdzono 1440 px i 375 px bez poziomego przewijania; brak błędów JavaScript. To emulacja rozmiaru ekranu, nie test na fizycznym telefonie. Porównanie kopii bazy przed i po migracji potwierdziło zachowanie 268 istniejących miejsc i 4 rezerwacji.

Pełny zestaw testów nadal zgłasza trzy wcześniejsze błędy anulowania wymienione wyżej. Zakończenie F01–F04 nie oznacza odbioru wszystkich modułów projektu ani zamknięcia Issue #4.
