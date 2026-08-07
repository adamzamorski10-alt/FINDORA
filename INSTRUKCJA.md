# 📦 Vinted Price Tracker — Instrukcja

Zestaw narzędzi do automatycznego sprawdzania cen rynkowych Vinted
dla produktów w Twojej aplikacji finanse.html.

---

## Co dostałeś

| Plik | Opis |
|------|------|
| `vinted_scraper.py` | Główny skrypt Python scrapujący Vinted |
| `uruchom_scraper.bat` | Skrypt Windows — instalacja + uruchamianie jednym kliknięciem |
| `finanse.html` | Zaktualizowana aplikacja z obsługą cen rynkowych |

---

## Wymagania

- **Windows 10/11** (Mac/Linux też działają — inne kroki instalacji)
- **Python 3.9+** — darmowy: https://www.python.org/downloads/
  - ⚠️ Podczas instalacji zaznacz **"Add Python to PATH"**

---

## Pierwsze uruchomienie (tylko raz)

### Krok 1 — Zainstaluj Python
Pobierz ze strony python.org i zainstaluj.
Koniecznie zaznacz „Add Python to PATH".

### Krok 2 — Umieść pliki razem
Wrzuć `vinted_scraper.py` i `uruchom_scraper.bat`
do dowolnego folderu, np. `C:\Users\TwojaNazwa\Vinted\`

### Krok 3 — Eksportuj listę produktów
1. Otwórz `finanse.html` w przeglądarce
2. Przejdź do zakładki **Resale → Produkty**
3. Kliknij przycisk **„Eksport → scraper"**
4. Pobierze się plik `products_export.json`
5. Przenieś go do tego samego folderu co skrypty

### Krok 4 — Uruchom scraper
Kliknij dwukrotnie `uruchom_scraper.bat`

Skrypt:
- Zainstaluje bibliotekę Playwright (automatycznie)
- Pobierze przeglądarkę Chromium (automatycznie, ~150 MB)
- Wyszuka każdy Twój produkt na Vinted
- Zbierze ceny dla 3 statusów (Nowy z metką, Nowy bez metki, Bardzo dobry)
- Zapisze wyniki do `vinted_prices.json`

Czas działania: **ok. 2–5 minut** (zależy od liczby produktów)

### Krok 5 — Załaduj ceny do aplikacji
1. Otwórz `finanse.html`
2. Przejdź do **Resale → Produkty**
3. Kliknij **„Załaduj ceny"**
4. Wybierz plik `vinted_prices.json`
5. Rozwiń dowolny produkt — zobaczysz sekcję **„Ceny rynkowe Vinted"**

---

## Codzienne używanie

Po pierwszej instalacji wystarczy:

1. Kliknij `uruchom_scraper.bat`
2. Poczekaj ~2–5 minut
3. W aplikacji kliknij **„Załaduj ceny"** i wybierz nowy `vinted_prices.json`

Jeśli dodałeś nowe produkty, kliknij ponownie **„Eksport → scraper"**
przed uruchomieniem, żeby zaktualizować listę produktów.

---

## Automatyczne uruchamianie co dzień (opcjonalnie)

### Windows — Task Scheduler
1. Otwórz **Harmonogram zadań** (wyszukaj w Start)
2. Kliknij **„Utwórz zadanie podstawowe"**
3. Nazwa: `Vinted Scraper`
4. Wyzwalacz: **Codziennie**, np. o **8:00**
5. Akcja: **Uruchom program**
6. Program: wpisz pełną ścieżkę do `uruchom_scraper.bat`
   np. `C:\Users\TwojaNazwa\Vinted\uruchom_scraper.bat`
7. Katalog startowy: `C:\Users\TwojaNazwa\Vinted\`
8. Kliknij Zakończ

Od teraz skrypt sam się odpali każdego ranka.
Wystarczy że raz dziennie klikniesz „Załaduj ceny" w aplikacji.

---

## Co widać w aplikacji po załadowaniu

Po rozwinięciu karty produktu pojawi się sekcja:

```
📊 Ceny rynkowe Vinted             Sprawdzono: 26.06.2026

Nowy z metką    89 zł śr.   65–120 zł   🏷 Suger.: 72 zł    8 ofert
Nowy bez metki  61 zł śr.   45–89 zł    🏷 Suger.: 52 zł   10 ofert
Bardzo dobry    43 zł śr.   28–67 zł    🏷 Suger.: 35 zł   10 ofert
```

**Sugerowana cena** = percentyl 25 z zebranych ofert,
czyli dolna ćwiartka cen → jesteś konkurencyjny, ale nie najgorszy.

---

## Rozwiązywanie problemów

**„Brak wyników" dla jakiegoś produktu**
Spróbuj skrócić nazwę produktu w aplikacji (np. „Nike Air Max 90" zamiast
„Nike Air Max 90 roz. 42 czarne"). Vinted szuka po tej nazwie dosłownie.

**Skrypt blokowany przez Vinted**
Vinted czasem blokuje po wielu zapytaniach. Poczekaj kilka godzin
i spróbuj ponownie. Możesz też zwiększyć opóźnienie w skrypcie:
`DELAY_BETWEEN_SEARCHES = (8, 15)` zamiast `(4, 9)`.

**Błąd „playwright not found"**
Uruchom ręcznie w wierszu poleceń:
```
pip install playwright
playwright install chromium
```

**Ceny wyglądają podejrzanie**
Otwórz `vinted_scraper.py` i zmień `HEADLESS = True` na `HEADLESS = False`
— wtedy zobaczysz co robi przeglądarka na żywo.

---

## Struktura pliku vinted_prices.json

```json
{
  "generatedAt": "2026-06-26T08:00:00",
  "products": {
    "prod_id_123": {
      "name": "Nike Air Max 90",
      "scrapedAt": "2026-06-26T08:02:14",
      "conditions": {
        "nowe_z_metka": {
          "label": "Nowy z metką",
          "prices": [65, 72, 79, 85, 89, 95, 99, 120],
          "stats": {
            "count": 8,
            "min": 65,
            "max": 120,
            "avg": 88.0,
            "median": 87.0,
            "suggested": 72.0
          }
        }
      }
    }
  }
}
```

---

*Dane są przechowywane lokalnie — nic nie trafia do internetu.*
*Scraper działa tylko na Twoim komputerze.*
