# Horyzont — CoffinLikeCoffee

Aplikacja dla klientów i pracowników cmentarza, która ma ułatwiać wybór miejsca pochówku, rezerwację oraz zarządzanie dostępnością miejsc w jednym systemie.

## O projekcie

Horyzont to projekt systemu zarządzania wielopoziomowym cmentarzem. Klient będzie przeglądać mapę i rezerwować miejsce zgodnie z wybranym pakietem. Zarządca będzie obsługiwać rezerwacje i aktualizować dostępność, a administrator zarządzać kontami i uprawnieniami. Cechą projektu jest połączenie mapy sektorów, rzędów i miejsc z pakietami określającymi zakres wyboru. Trzy przestrzenie pokazane na stronie są przykładowymi danymi demonstracyjnymi; role użytkowników stanowią osobny podział uprawnień.

## Zespół i podział pracy

| Osoba | GitHub | Część projektu | Zadania opisane poniżej |
|---|---|---|---|
| Roman Horbach (58015) | [@zefso](https://github.com/zefso) | Interfejs, mapa, filtry i szczegóły miejsca | [F01](#f01), [F02](#f02), [F03](#f03), [F04](#f04) |
| Viktor Levchenko (58088) | [@he4tegg](https://github.com/he4tegg) | Pakiety, rezerwacja i rezerwacje klienta | [F05](#f05), [F06](#f06), [F07](#f07) |
| Volodymyr Petruk (56086) | [@Petruk-Volodymyr](https://github.com/Petruk-Volodymyr) | Logowanie, role, konta i panel zarządcy | [F08](#f08), [F09](#f09), [F10](#f10), [F11](#f11) |

Każdy właściciel odpowiada również za walidację, obsługę błędów, testy i prezentację swojej części. Podział uzgodniono 27.10.2026.

## Technologia

- Backend i szablony: Python, Django 5.x (`Django>=5.0,<6.0`).
- Frontend: HTML5, CSS3 i JavaScript bez frameworka.
- Budowanie i uruchamianie: brak bundlera JS; Django oraz Docker Compose (Python 3.12 w obrazie).
- Dane: SQLite; obecnie treści strony pochodzą ze słowników w widoku.
- Planowane API: własne widoki Django zwracające JSON, pobierane przez `fetch`; brak zewnętrznego API biznesowego.
- Fonty: Google Fonts (DM Sans, Playfair Display), z fontami zastępczymi w CSS.

## Stan projektu i etapy

**[Mapa stron i podział pracy](docs/mapa-stron.md)** — schemat nawigacji, status każdej strony i checklisty osobno dla Romana, Viktora oraz Volodymyra.

Stan na 27.10.2026: działa strona główna, nawigacja kotwicowa i menu mobilne. Mapa jest makietą, a liczby miejsc są przykładowe. Brak modeli miejsc i rezerwacji, formularzy logowania, paneli ról oraz API. Konfiguracja auth i sessions jest przygotowana, ale nie oznacza gotowego logowania.

- **M1 — Podstawy:** interfejs, konta i role, model miejsc, mapa, filtry i szczegóły.
- **M2 — Obsługa rezerwacji:** pakiety, rezerwacje klienta, panel zarządcy i zarządzanie kontami.
- **M3 — Demo Day:** integracja, testy uprawnień i konfliktów rezerwacji, poprawki dostępności i responsywności, wdrożenie.

Daty M1–M3 zostaną ustalone w Issues zgodnie z harmonogramem zajęć. Wymaganie na 27.10 dotyczy opisu pełnego zakresu i podziału pracy; funkcje poniżej stanowią plan na semestr.

## Funkcjonalności

Opisy znajdują się w README zgodnie z wariantem dopuszczonym przez prowadzącego. Identyfikatory F01–F11 są identyfikatorami planu, nie numerami GitHub Issues.

| ID | Funkcja i opis | Właściciel | Etap | Stan |
|---|---|---|---|---|
| F01 | [Strona główna i nawigacja](#f01) | @zefso | M1 | Podstawowa wersja działa |
| F02 | [Interaktywna mapa](#f02) | @zefso | M1 | Makieta; logika do zrobienia |
| F03 | [Filtrowanie miejsc](#f03) | @zefso | M1 | Do zrobienia |
| F04 | [Szczegóły miejsca](#f04) | @zefso | M1 | Do zrobienia |
| F05 | [Pakiety rezerwacji](#f05) | @he4tegg | M2 | Do zrobienia |
| F06 | [Rezerwowanie miejsca](#f06) | @he4tegg | M2 | Do zrobienia |
| F07 | [Moje rezerwacje](#f07) | @he4tegg | M2 | Do zrobienia |
| F08 | [Logowanie i wylogowanie](#f08) | @Petruk-Volodymyr | M1 | Konfiguracja przygotowana; widoki do zrobienia |
| F09 | [Role i uprawnienia](#f09) | @Petruk-Volodymyr | M1 | Do zrobienia |
| F10 | [Panel zarządcy](#f10) | @Petruk-Volodymyr | M2 | Do zrobienia |
| F11 | [Zarządzanie kontami](#f11) | @Petruk-Volodymyr | M2 | Do zrobienia |

<a id="f01"></a>
### F01. Strona główna i nawigacja

**Właściciel:** Roman Horbach (@zefso).

**Co robi użytkownik:** poznaje projekt, przechodzi między sekcjami i rozwija menu na telefonie.

**Widok:** `/`.

**Dane:** treści szablonu i przykładowe poziomy oraz statystyki z `cemetery/views.py`.

**Najtrudniejsze:** czytelny układ na telefonie i obsługa menu klawiaturą.

**Gotowe, gdy:** sekcje i odnośniki działają, menu aktualizuje `aria-expanded`, a strona nie przewija się poziomo na małym ekranie.

<a id="f02"></a>
### F02. Interaktywna mapa cmentarza

**Właściciel:** Roman Horbach (@zefso).

**Co robi użytkownik:** wybiera poziom, sektor i rząd oraz sprawdza wolne, zarezerwowane i zajęte miejsca.

**Widok:** planowane `/mapa/`.

**Dane:** własne modele poziomu, sektora, rzędu i miejsca w SQLite; planowane `GET /api/miejsca/`.

**Najtrudniejsze:** pobieranie danych przez `fetch`, odwzorowanie układu i odświeżenie dostępności.

**Gotowe, gdy:** JavaScript renderuje miejsca z JSON, pokazuje legendę także tekstowo, obsługuje ładowanie, pusty wynik i błąd z ponowieniem; wybór miejsca otwiera jego szczegóły.

<a id="f03"></a>
### F03. Filtrowanie miejsc

**Właściciel:** Roman Horbach (@zefso).

**Co robi użytkownik:** łączy filtry poziomu, sektora, typu (dzieci/dorośli), pojemności (jednoosobowe/dwuosobowe/rodzinne), jakości gruntu i dostępności oraz resetuje wybór.

**Widok:** panel filtrów na `/mapa/`.

**Dane:** cechy miejsc z własnego API; aktywne filtry w parametrach URL.

**Najtrudniejsze:** łączenie filtrów i zachowanie ich po odświeżeniu.

**Gotowe, gdy:** wyniki spełniają wszystkie wybrane warunki, URL przywraca filtry, a brak wyników pokazuje komunikat i możliwość resetu.

<a id="f04"></a>
### F04. Szczegóły miejsca

**Właściciel:** Roman Horbach (@zefso).

**Co robi użytkownik:** otwiera informacje o miejscu i przechodzi do rezerwacji, jeśli jest dostępne.

**Widok:** panel szczegółów na `/mapa/`.

**Dane:** identyfikator, położenie, typ, pojemność, grunt i status miejsca z API.

**Najtrudniejsze:** synchronizacja zaznaczenia na mapie i aktualnego statusu.

**Gotowe, gdy:** panel pokazuje wybrane miejsce, nie udostępnia danych osobowych rezerwującego i blokuje rozpoczęcie rezerwacji miejsca zajętego lub zarezerwowanego.

<a id="f05"></a>
### F05. Wybór pakietu rezerwacji

**Właściciel:** Viktor Levchenko (@he4tegg).

**Co robi użytkownik:** wybiera pakiet: podstawowy (przydział automatyczny), sektor (wybór sektora), rząd (wybór sektora i rzędu) albo miejsce (wybór konkretnego miejsca).

**Widok:** planowane `/rezerwacje/nowa/`.

**Dane:** własna konfiguracja pakietów i dostępne miejsca.

**Najtrudniejsze:** dynamiczne pola formularza w JS oraz sprawdzenie tych samych ograniczeń na serwerze.

**Gotowe, gdy:** pakiet udostępnia właściwy zakres wyboru, a serwer odrzuca wybór spoza pakietu. Projekt obejmuje demonstracyjny wybór pakietu bez rzeczywistej płatności.

<a id="f06"></a>
### F06. Rezerwowanie miejsca

**Właściciel:** Viktor Levchenko (@he4tegg).

**Co robi użytkownik:** zalogowany klient wybiera pakiet, wypełnia formularz, zatwierdza rezerwację i otrzymuje potwierdzenie.

**Widok:** planowane `/rezerwacje/nowa/`.

**Dane:** SQLite: rezerwacja powiązana z klientem, miejscem, pakietem, datą i statusem; planowane `POST /api/rezerwacje/`.

**Najtrudniejsze:** niedopuszczenie do podwójnej rezerwacji i obsługa błędów `fetch` bez utraty formularza.

**Gotowe, gdy:** poprawny formularz zapisuje rezerwację i zmienia dostępność; błędy pól są czytelne, brak miejsc daje komunikat, a dwie próby rezerwacji tego samego miejsca kończą się najwyżej jednym aktywnym zapisem. Zapis jest chroniony transakcją i ograniczeniami bazy, a żądanie POST używa CSRF.

<a id="f07"></a>
### F07. Moje rezerwacje

**Właściciel:** Viktor Levchenko (@he4tegg).

**Co robi użytkownik:** przegląda własne rezerwacje, ich status, pakiet i lokalizację miejsca.

**Widok:** planowane `/moje-rezerwacje/`.

**Dane:** rezerwacje filtrowane na serwerze według zalogowanego klienta.

**Najtrudniejsze:** ochrona danych innych klientów i czytelny pusty stan.

**Gotowe, gdy:** lista pozostaje po odświeżeniu, klient widzi wyłącznie własne dane, a nowe konto otrzymuje komunikat o braku rezerwacji.

<a id="f08"></a>
### F08. Logowanie i wylogowanie

**Właściciel:** Volodymyr Petruk (@Petruk-Volodymyr).

**Co robi użytkownik:** loguje się istniejącym kontem, otrzymuje komunikat przy błędnych danych i wylogowuje się.

**Widok:** planowane `/logowanie/` oraz akcja POST `/wylogowanie/`.

**Dane:** Django auth, hasła haszowane przez Django i sesje serwerowe; konta tworzy administrator.

**Najtrudniejsze:** walidacja, utrzymanie sesji i przekierowanie do dozwolonego widoku.

**Gotowe, gdy:** poprawne dane rozpoczynają sesję, błędne jej nie tworzą, a wylogowanie odbiera dostęp do chronionych stron.

<a id="f09"></a>
### F09. Role i uprawnienia

**Właściciel:** Volodymyr Petruk (@Petruk-Volodymyr).

**Co robi użytkownik:** korzysta z funkcji klienta, zarządcy lub administratora zgodnie z przypisaną rolą.

**Widok:** nawigacja i wszystkie chronione widoki oraz API.

**Dane:** grupy i uprawnienia Django; klient ma własne rezerwacje, zarządca obsługuje wszystkie rezerwacje, administrator zarządza kontami i rolami.

**Najtrudniejsze:** weryfikacja uprawnień również dla ręcznych żądań, nie tylko ukrywanie przycisków.

**Gotowe, gdy:** niezalogowany użytkownik nie wykonuje operacji chronionych, klient nie otwiera paneli pracowników, a brak uprawnień blokuje również bezpośrednie żądania do API.

<a id="f10"></a>
### F10. Panel zarządcy — rezerwacje i dostępność

**Właściciel:** Volodymyr Petruk (@Petruk-Volodymyr).

**Co robi użytkownik:** zarządca przegląda, dodaje, edytuje i usuwa rezerwacje; na pełnej mapie sprawdza stan miejsc oraz oznacza miejsce jako zajęte.

**Widok:** planowane `/zarzadca/rezerwacje/` i formularze dodawania oraz edycji.

**Dane:** wspólne modele miejsc, klientów i rezerwacji; mapa korzysta z komponentu F02.

**Najtrudniejsze:** zachowanie spójności statusów i wykorzystanie reguł rezerwacji F06 również w panelu.

**Gotowe, gdy:** CRUD zapisuje dane, usunięcie wymaga potwierdzenia, zwolnienie rezerwacji aktualizuje dostępność i nie zwalnia miejsca oznaczonego jako zajęte, a konflikty nie tworzą podwójnych rezerwacji.

<a id="f11"></a>
### F11. Zarządzanie kontami i rolami

**Właściciel:** Volodymyr Petruk (@Petruk-Volodymyr).

**Co robi użytkownik:** administrator tworzy konta, dezaktywuje je oraz nadaje i odbiera rolę zarządcy.

**Widok:** planowane `/administracja/uzytkownicy/`.

**Dane:** użytkownicy, grupy i status aktywności w Django auth.

**Najtrudniejsze:** kontrola zmian uprawnień i ochrona ostatniego aktywnego administratora.

**Gotowe, gdy:** zmiana roli działa przy następnym żądaniu, nieaktywne konto traci dostęp, inni użytkownicy nie mogą zmieniać ról, a ostatni administrator nie może odebrać sobie dostępu.

## Architektura

**Obecnie:** jedyna strona to `/`, renderowana przez Django. Stan menu znajduje się w DOM; dane poziomów i statystyk są stałe w widoku. SQLite jest skonfigurowane, ale brak modeli domenowych.

**Planowane widoki:** `/mapa/`, `/rezerwacje/nowa/`, `/moje-rezerwacje/`, `/logowanie/`, `/zarzadca/rezerwacje/`, `/administracja/uzytkownicy/`. Akcja `/wylogowanie/` przyjmuje POST. Żaden z tych adresów nie jest jeszcze zaimplementowany.

**Planowane dane i stan:** SQLite przechowuje miejsca, pakiety, rezerwacje i konta. Serwer jest źródłem prawdy dla dostępności i uprawnień. JS obsługuje mapę, formularz, ładowanie i błędy; `fetch` pobiera JSON oraz wysyła rezerwacje. Filtry są w URL, sesja w mechanizmie Django, a hasła i dane rezerwacji nie trafiają do localStorage. F02 i F06 wymagają wspólnego modelu miejsca; F06 oraz F10 używają tej samej logiki zapisu.

```text
cemetery/                  widok strony i routing; docelowo modele, API i formularze
cemetery_site/             ustawienia Django, główny routing i WSGI
templates/cemetery/       szablony HTML
static/css/site.css       style strony
static/js/site.js         obecnie menu; docelowo osobne moduły mapy i rezerwacji
manage.py                 polecenia Django
requirements.txt          zależności Python
Dockerfile                obraz aplikacji
docker-compose.yml        lokalne uruchamianie w kontenerze
```

## Uruchomienie

### Docker

Wymagany działający Docker z Compose:

```bash
docker compose up --build
```

Otwórz http://localhost:8080/. Docker wykonuje migracje przed startem. Zatrzymanie: `Ctrl+C`; ponowny start: `docker compose up`. Baza pozostaje lokalnie dzięki montowaniu katalogu projektu.

### Bez Dockera

Zalecany Python 3.12, zgodny z obrazem Docker:

```bash
python -m venv .venv
```

PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Następnie:

```bash
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py check
python manage.py runserver 8080
```

Otwórz http://127.0.0.1:8080/.

### Zmienne środowiskowe

| Zmienna | Lokalnie | Znaczenie |
|---|---|---|
| `DJANGO_SECRET_KEY` | Domyślna wartość wyłącznie developerska | Na wdrożeniu ustaw własny sekret poza repo |
| `DJANGO_DEBUG` | `1` | Na wdrożeniu ustaw `0` |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Lista hostów oddzielona przecinkami |

Ustawienia czytają zmienne procesu; plik `.env` nie jest automatycznie ładowany. Nie commitujemy sekretów, środowiska wirtualnego, bazy ani plików `__pycache__`.

## Komunikacja i plan kolejnych zajęć

Pytania, problemy, blokady i ustalenia zapisujemy w [GitHub Issues](https://github.com/zefso/CoffinLikeCoffee/issues). Punktem odniesienia są [uwagi prowadzącego #1](https://github.com/zefso/CoffinLikeCoffee/issues/1). Opisy funkcji powyżej są pełnym planem; jeśli przeniesiemy je do Issues, każda funkcja otrzyma osobne zgłoszenie, jednego assignee, milestone M1/M2 oraz etykietę `funkcja`.

Każda osoba commituje własną pracę regularnie, z identyfikatorem funkcji i polskim opisem, np. `F03: dodaj filtrowanie miejsc według pojemności` (po utworzeniu Issue także z jego numerem).

Na kolejnych ćwiczeniach każda osoba przedstawia: co zrobiła i jak, które kryteria gotowości spełniła, co pozostało oraz co ją blokuje. Przed Demo Day właściciele sprawdzają swoje funkcje, wspólnie testujemy pełny przebieg rezerwacji i usuwamy błędy. Plan testów obejmuje również błędy sieci, brak miejsc, dostęp cudzym kontem, zmianę roli i równoczesne rezerwacje.

## Wdrożenie

Publiczna wersja demonstracyjna nie została jeszcze wdrożona. Link należy uzupełnić najpóźniej na Demo Day. Docker Compose służy obecnie do lokalnego uruchamiania serwera developerskiego; wdrożenie wymaga konfiguracji produkcyjnej i obsługi plików statycznych.
