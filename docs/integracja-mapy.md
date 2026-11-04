# Integracja mapy z rezerwacjami

Stan: 03.11.2026. Właściciel mapy: Roman (@zefso). Dokument opisuje zaimplementowany kontrakt dla Viktora i Volodymyra.

## Uruchomienie danych

```bash
python manage.py migrate
python manage.py seed_places
python manage.py runserver 8080
```

W Dockerze po uruchomieniu kontenera: `docker compose exec web python manage.py seed_places`.
Polecenie tworzy 268 demonstracyjnych miejsc (128/84/56 na poziomach 1/2/3). Ponowne uruchomienie nie zmienia istniejących miejsc ani ich statusu. Dane nie są dodawane automatycznie podczas migracji. Pusta baza daje pustą mapę.

## Model współdzielony

`from cemetery.models import Place`

Model ma stabilny `id` i unikalne położenie `(level, sector, row, number)`. Pole `code` jest wyliczane, np. `1-A-01-02`. Rezerwacja powinna przechowywać klucz obcy do `Place`, nie kopię miejsca. W module rezerwacji trzeba ustalić politykę usuwania relacji (np. PROTECT).

| Pole | Znaczenie / wartości |
|---|---|
| `id` | Identyfikator bazy, liczba całkowita |
| `level` | Poziom 1, 2 lub 3 w danych demonstracyjnych |
| `sector` | Litera sektora, obecnie A–D |
| `row`, `number` | Numer rzędu i miejsca; obecny układ: 4 rzędy po maks. 8 miejsc w sektorze |
| `kind` | `adult`, `child` |
| `capacity` | `single`, `double`, `family` |
| `ground` | `standard`, `reinforced` |
| `status` | `available`, `reserved`, `occupied` |

## API tylko do odczytu

- `GET /api/miejsca/` → `{"places": [...]}`.
- Filtry łączą się przez AND: `?level=1&sector=A&row=2&kind=adult&capacity=single&ground=standard&status=available`.
- Puste wartości są pomijane; niepoprawne liczby i wartości słownikowe zwracają HTTP 400 z polem `error`.
- Brak wyników: HTTP 200 i `{"places": []}`.
- `GET /api/miejsca/<id>/` → jeden obiekt; nieistniejący identyfikator: HTTP 404.
- Zapis do tych endpointów jest niedozwolony (HTTP 405).
- Obiekt ma pola modelu powyżej oraz `code` i `level_name`. Nie zawiera danych klientów.
- Odpowiedzi mają `Cache-Control: no-store`. Mapa odświeża stan po zmianie filtrów i przyciskiem „Odśwież”; nie jest aktualizowana w czasie rzeczywistym.

## Podłączenie formularza Viktora

1. Dodaj widok formularza z nazwą URL **`reservation_create`** (bez namespace), np. `path("rezerwacje/nowa/", views.reservation_create, name="reservation_create")`.
2. Mapa automatycznie pokaże przycisk dla wolnego miejsca. Link ma postać `/rezerwacje/nowa/?miejsce=42`.
3. Odczytaj `request.GET.get("miejsce")`, zweryfikuj identyfikator i pobierz `Place`. Nie zakładaj, że miejsce nadal jest wolne ani że pakiet pozwala na jego wybór.
4. Zachowaj parametr miejsca przy przejściu do logowania i powrocie. Sprawdzaj bezpieczeństwo adresu `next`.
5. Przy zapisie ponownie zweryfikuj rolę, pakiet i dostępność. To moduł rezerwacji musi atomowo chronić przed podwójnym zapisem i ustawić status `reserved`. Samo odczytanie `available` nie chroni przed równoległymi żądaniami.
6. Panel Volodymyra powinien używać tej samej logiki zmiany statusu, co rezerwacje klienta.

Dopóki trasa `reservation_create` nie istnieje, mapa wyświetla komunikat o przygotowywaniu modułu zamiast niedziałającego linku. Nie dodano zastępczego formularza ani logiki płatności.

## Rezerwacje: stan po integracji (04.11.2026)

Trasa `reservation_create` istnieje, więc mapa pokazuje link do `/rezerwacje/nowa/?miejsce=<id>`. Proces zawsze startuje od kroku 1. Miejsce z mapy tylko podpowiada typ, pojemność i poziom, a na planie jest zaznaczone dopiero po wyborze pakietu „Wybrane miejsce”.

Przy pakietach z przydziałem automatycznym ten sam plan jest podglądem puli: pokazuje poziom, sektor lub rząd i obramowuje miejsca, z których serwer może losować. Nie jest klikalny.

Kroki 1–3 są publiczne, a wybór jest w URL, więc przetrwa logowanie. Krok 4 linkuje do `LOGIN_URL` z parametrem `next`. **Volodymyr:** widok `/logowanie/` musi obsłużyć `next` i sprawdzić jego bezpieczeństwo.

**Panel F10** ma używać `create_reservation` i `cancel_reservation` z `cemetery/reservations.py`, a nie zmieniać `Place.status` bezpośrednio. Seedowane miejsca `reserved` nie mają rekordu `Reservation`.

Cennik demonstracyjny jest w `cemetery/reservations.py`. Punkt odniesienia: na warszawskim Cmentarzu Północnym grób tradycyjny na 20 lat to około 2 400 zł, murowany około 4 400 zł, a nisza w kolumbarium 4 150–4 790 zł.

## Stan frontendu i weryfikacja

`/mapa/` zapisuje filtry oraz zaznaczone miejsce (`miejsce`) w URL. Przeglądarka obsługuje Wstecz/Dalej. Dostępność oznaczono kolorem i tekstem (W/R/Z); wszystkie miejsca są przyciskami dostępnymi z klawiatury, również zajęte pozwalają obejrzeć szczegóły.

Automatyczne testy: `python manage.py test`. Obejmują kombinację filtrów, walidację, odpowiedzi puste i 404/405, publiczny zakres danych, powtarzalność inicjalizacji oraz podłączanie trasy rezerwacji.

## Widok 3D (03.11.2026)

Domyślny widok mapy to stylizowana scena 3D z boku pod kątem. Renderer w `static/js/map-3d.js` rzutuje przestrzenne bryły na Canvas 2D, sortuje powierzchnie według głębokości i wykrywa trafienie kursora. Nie wymaga CDN, WebGL ani dodatkowych bibliotek.

Scena pokazuje jeden sektor z aktualnych wyników filtrów. Użytkownik obraca ją przeciąganiem lub strzałkami, zmienia nachylenie przeciąganiem w pionie i powiększenie przyciskami +/−. Reset przywraca początkową kamerę. Numer na etykiecie oznacza rząd i miejsce, litera W/R/Z status. Złoty kolor wskazuje wybór, nie zmianę dostępności. Przyciski pod sceną zapewniają alternatywny wybór klawiaturą. Przełącznik „Mapa 2D” udostępnia dotychczasową mapę.

Oba widoki używają tych samych identyfikatorów i panelu szczegółów. Kontrakt rezerwacji pozostaje bez zmian. Kamera i tryb widoku nie są zapisywane w URL; filtry oraz wybrane miejsce są. Układ i bryły są demonstracyjne, bez realistycznych tekstur.

Sprawdzono w przeglądarce wybór bezpośrednio na scenie, wybór przyciskiem, powiększenie, obrot klawiaturą i przełączanie 2D/3D. Testy Django: 5/5.

## Miniaturowa mapa na stronie głównej

Sekcja „Znajdź miejsce” pobiera wszystkie miejsca z tego samego API i pokazuje plan 2D całego cmentarza w SVG. Początkowy widok jest wyśrodkowany na placu pamięci. Kółko myszy przybliża do kursora, przeciąganie przesuwa plan, dwa palce zmieniają skalę. Nie ma przycisków powiększania. Klawiatura: strzałki, +/−, Home (powrót do centrum). Kliknięcie miejsca otwiera główną mapę z jego identyfikatorem, poziomem i sektorem. Kolory odpowiadają statusom API. Układ jest demonstracyjny.

Weryfikacja w przeglądarce: 268 miejsc, zmiana skali kółkiem, przesuwanie i powrót do centrum; brak błędów konsoli. Gest dwóch palców zaimplementowano, ale nie sprawdzono na fizycznym telefonie.
