# Projekt odpowiedzi do Issue #1

Tekst do opublikowania po wypchnięciu zmian do GitHub. Obecnie opisuje zmiany przygotowane lokalnie.

---

Cześć! Uzupełniliśmy README o pełny opis 11 funkcji według wzoru: Co robi użytkownik / Widok / Dane / Najtrudniejsze / Gotowe, gdy. Każda funkcja ma jednego właściciela i etap realizacji. Opisy pozostawiliśmy w README, zgodnie z dopuszczonym wariantem.

Podział pracy:
- Roman Horbach (@zefso): interfejs, mapa, filtry i szczegóły miejsca.
- Viktor Levchenko (@he4tegg): pakiety, formularz rezerwacji i rezerwacje klienta.
- Volodymyr Petruk (@Petruk-Volodymyr): logowanie, role, panel zarządcy i konta użytkowników.

Dopisaliśmy odbiorców i cel aplikacji, architekturę, planowane widoki, sposób przechowywania danych oraz etapy prac. Mapa i formularz mają korzystać z JavaScript i fetch oraz własnego API JSON w Django. README rozróżnia obecną stronę demonstracyjną od funkcji do zaimplementowania.

Poprawiliśmy login Volodymyra, usunęliśmy zdanie z czatu AI i ujednoliciliśmy instrukcję uruchomienia na porcie 8080. Dodaliśmy .gitignore, wyłączyliśmy bazę i cache Pythona ze śledzenia, zachowując je lokalnie. CSS jest rozpisany na czytelne linie. Usunęliśmy przykładowy telefon, e-mail i informację „od 2024”, a rok w stopce jest dynamiczny. Konfiguracja zawiera teraz auth, sessions oraz middleware sesji, uwierzytelniania i CSRF.

Logowanie, role, mapa i rezerwacje pozostają zadaniami do realizacji. Każda osoba będzie commitować własną część z odniesieniem do zadania, a ustalenia i blokady będziemy zapisywać w Issues. Link do wdrożenia uzupełnimy najpóźniej na Demo Day.
