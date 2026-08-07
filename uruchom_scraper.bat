@echo off
chcp 65001 >nul 2>&1

python --version >nul 2>&1
if errorlevel 1 (
    echo BLAD: Python nie jest zainstalowany.
    echo Pobierz ze strony: https://www.python.org/downloads/
    echo Pamietaj zaznaczyc "Add Python to PATH"
    pause
    exit /b 1
)

echo [OK] Python znaleziony

python -c "import playwright" >nul 2>&1
if errorlevel 1 (
    echo Instaluje playwright...
    python -m pip install playwright
    if errorlevel 1 (
        echo BLAD: Nie udalo sie zainstalowac playwright
        pause
        exit /b 1
    )
)

echo Sprawdzam przegladarke Chromium...
python -m playwright install chromium
if errorlevel 1 (
    echo BLAD: Nie udalo sie zainstalowac Chromium
    pause
    exit /b 1
)

echo [OK] Srodowisko gotowe

if not exist "%~dp0products_export.json" (
    echo.
    echo BRAK PLIKU: products_export.json
    echo.
    echo Kroki:
    echo  1. Otworz finanse.html w przegladarce
    echo  2. Wejdz w Resale -^> Produkty
    echo  3. Kliknij "Eksport -^> scraper"
    echo  4. Skopiuj pobrany plik products_export.json do folderu:
    echo     %~dp0
    echo.
    pause
    exit /b 1
)

echo [OK] Znaleziono products_export.json
echo.
echo Uruchamiam scraper... (moze trwac kilka minut)
echo.

python "%~dp0vinted_scraper.py"

if errorlevel 1 (
    echo.
    echo BLAD: Scraper zakonczyl sie bledem.
    pause
    exit /b 1
)

echo.
echo ================================================
echo GOTOWE! Plik vinted_prices.json zostal zapisany.
echo.
echo Nastepny krok:
echo  Otworz finanse.html
echo  Resale -^> Produkty -^> "Zaladuj ceny"
echo  Wybierz plik vinted_prices.json
echo ================================================
echo.
pause