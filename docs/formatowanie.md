# Formatowanie kodu

- JavaScript i CSS: Prettier 3.6.2, ustawienia w `.prettierrc.json`.
- Python: Black, ustawienia w `pyproject.toml`.
- Szablony Django: djLint z profilem `django`, ustawienia w `pyproject.toml`.

Uruchamiaj polecenia z katalogu projektu, po aktywacji środowiska wirtualnego:

```bash
python -m pip install black==26.10.1 djlint==1.49.4
npx prettier@3.6.2 --write "static/js/*.js" "static/css/*.css"
python -m black --workers 1 cemetery cemetery_site manage.py
python -m djlint templates --reformat
python manage.py test
```

Formatery są narzędziami developerskimi i nie są wymagane do uruchamiania strony. Po formatowaniu sprawdzaj diff; nie mieszaj zmian zachowania aplikacji z samymi poprawkami stylu.
