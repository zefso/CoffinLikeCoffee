# Wielopoziomowy cmentarz

Wielopoziomowy system zarządzania cmentarzem

Aplikacja internetowa do obsługi cmentarza: przeglądania miejsc pochówku, rezerwowania ich i zarządzania nimi. „Wielopoziomowy” oznacza, że system ma kilka ról użytkowników. Każda rola ma inne uprawnienia i widzi inną część aplikacji.

Role użytkowników

Klient może przeglądać dostępne miejsca na interaktywnej mapie i rezerwować miejsce pochówku. Zakres wyboru zależy od wykupionego pakietu: w podstawowym miejsce przydziela system, a w wyższych klient sam wybiera sektor, rząd, a nawet konkretne miejsce. Może też podglądać swoje rezerwacje.
Osoba zarządzająca nadzoruje wszystkie rezerwacje: może je przeglądać, dodawać, edytować i usuwać. Ma dostęp do pełnej mapy cmentarza i aktualnego stanu każdego miejsca.
Administrator zarządza kontami w systemie, a przede wszystkim nadaje i odbiera uprawnienia osób zarządzających.

Interaktywna mapa

Mapa przedstawia układ cmentarza w podziale na sektory, rzędy i pojedyncze miejsca. Pozwala odróżnić miejsca według ich cech, np.:

typ: dla dzieci lub dla dorosłych,
pojemność: jednoosobowe, dwuosobowe, rodzinne,
jakość gruntu,
dostępność: wolne, zarezerwowane, zajęte.

Klientowi mapa ułatwia wybór miejsca, a osobie zarządzającej daje szybki podgląd obłożenia cmentarza.

Logowanie i bezpieczeństwo

Dostęp do funkcji wymaga logowania. Po zalogowaniu użytkownik widzi tylko te widoki i operacje, które odpowiadają jego roli.

Jeśli chcesz, mogę dopisać do tego listę głównych widoków aplikacji albo przykładowe pakiety rezerwacji.

## Zespół

| Osoba | GitHub |
|---|---|
| Roman Horbach 58015 | `zefso` |
| Viktor Levchenko 58088 | `he4tegg` |
| Volodymyr Petruk 56086 | `ch1l1ntano` |

## Technologie

- Django 5
- HTML5
- CSS3
- JavaScript (menu mobilne i interakcje)
- SQLite (baza danych przygotowana pod kolejne moduły)

## Uruchomienie

### Docker (macOS, Windows, Linux)

Najprostszy sposób uruchomienia projektu na macOS to **Docker Desktop**:

1. Zainstaluj i uruchom [Docker Desktop](https://www.docker.com/products/docker-desktop/).
2. W terminalu przejdź do katalogu projektu i uruchom:

   ```bash
   docker compose up --build
   ```

3. Otwórz `http://localhost:8000/`.

Aby zatrzymać aplikację, użyj `Ctrl+C`. Kontener można uruchomić ponownie poleceniem `docker compose up`. Baza SQLite pozostaje w katalogu projektu.

### Uruchomienie bez Dockera

1. Utwórz i aktywuj środowisko wirtualne:

   ```bash
   python -m venv .venv
   ```

   Windows PowerShell:

   ```powershell
   .venv\Scripts\Activate.ps1
   ```

2. Zainstaluj zależności:

   ```bash
   pip install -r requirements.txt
   ```

3. Uruchom stronę:

   ```bash
   python manage.py runserver
   ```

   Następnie otwórz `http://127.0.0.1:8000/`.
