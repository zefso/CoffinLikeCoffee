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
| Volodymyr Petryk 56086 | `ch1l1ntano` |

## Technologie

- django
- HTML5
- CSS3
- JavaScript
- planowane API do przechowywania i pobierania danych o poziomach, grobach oraz postaciach

