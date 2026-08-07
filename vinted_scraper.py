"""
vinted_scraper.py - wersja 5 (Playwright + zalogowana sesja)
=============================================================
Rozwiazuje wszystkie poprzednie problemy:
1. Zalogowana sesja -> condition_ids dziala poprawnie
2. Playwright czyta rzeczywisty DOM po renderingu JS -> poprawne dane
3. Filtrowanie po cenie zakupu eliminuje akcesoria/czesci
4. Sesja zapisywana do pliku -> logujesz sie tylko raz
"""

import json, time, random, statistics, sys, re
from datetime import datetime
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    print("Instaluje playwright...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
    subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

# ── Konfiguracja ──────────────────────────────────────────────────────────────
SCRIPT_DIR     = Path(__file__).parent
PRODUCTS_FILE  = SCRIPT_DIR / "products_export.json"
OUTPUT_FILE    = SCRIPT_DIR / "vinted_prices.json"
SESSION_FILE   = SCRIPT_DIR / "vinted_session.json"   # zapisana sesja

RESULTS_PER_STATUS = 10
PRICE_MIN_FACTOR   = 0.4   # min = 40% ceny zakupu
PRICE_MAX_FACTOR   = 6.0   # max = 600% ceny zakupu
MIN_PRICE_FALLBACK = 15.0  # gdy brak ceny zakupu
MAX_PRICE_FALLBACK = 30000.0

# condition_id -> nazwa statusu na Vinted (do filtrowania DOM)
CONDITIONS = {
    "nowe_z_metka":   {"id": 6,  "label": "Nowy z metka",   "vinted_status": "Nowy z metk"},
    "nowe_bez_metki": {"id": 1,  "label": "Nowy bez metki", "vinted_status": "Nowy bez metki"},
    "bardzo_dobre":   {"id": 2,  "label": "Bardzo dobry",   "vinted_status": "Bardzo dobry"},
}

VINTED_BASE = "https://www.vinted.pl"


# ── Sesja ─────────────────────────────────────────────────────────────────────
def load_session(context):
    if SESSION_FILE.exists():
        try:
            state = json.loads(SESSION_FILE.read_text(encoding="utf-8"))
            context.add_cookies(state.get("cookies", []))
            print("[OK] Wczytano zapisana sesje")
            return True
        except Exception as e:
            print(f"[WARN] Nie udalo sie wczytac sesji: {e}")
    return False


def save_session(context):
    state = {"cookies": context.cookies()}
    SESSION_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    print("[OK] Sesja zapisana")


def is_logged_in(page) -> bool:
    """Sprawdza czy uzytkownik jest zalogowany."""
    try:
        page.goto(f"{VINTED_BASE}/account/settings", wait_until="domcontentloaded", timeout=15000)
        time.sleep(2)
        url = page.url
        return "/account/settings" in url or "/ustawienia" in url
    except Exception:
        return False


def do_login(page, context):
    """Otwiera Vinted i czeka az uzytkownik sie zaloguje."""
    print()
    print("=" * 60)
    print("WYMAGANE LOGOWANIE DO VINTED")
    print("=" * 60)
    print()
    print("Za chwile otworzy sie okno przegladarki.")
    print("Zaloguj sie do Vinted recznie.")
    print("Po zalogowaniu wróc do tego okna i nacisnij ENTER.")
    print()
    input("Nacisnij ENTER aby otworzyc przegladarke...")

    page.goto(VINTED_BASE, wait_until="domcontentloaded", timeout=20000)

    # Akceptuj cookies
    for sel in ['[data-testid="cookie-accept-all"]', '#onetrust-accept-btn-handler']:
        try:
            btn = page.wait_for_selector(sel, timeout=4000)
            if btn:
                btn.click()
                time.sleep(1)
                break
        except Exception:
            pass

    # Otworz strone logowania
    page.goto(f"{VINTED_BASE}/login", wait_until="domcontentloaded", timeout=15000)

    print()
    print("Okno przegladarki jest otwarte. Zaloguj sie do Vinted.")
    print("Gdy bedziesz zalogowany, wróc tutaj i nacisnij ENTER.")
    input("Nacisnij ENTER po zalogowaniu...")

    # Sprawdz czy logowanie sie udalo
    if is_logged_in(page):
        print("[OK] Logowanie potwierdzone!")
        save_session(context)
        return True
    else:
        print("[WARN] Nie udalo sie potwierdzic logowania, ale kontynuuje...")
        save_session(context)
        return True


# ── Scrapowanie przez API z ciasteczkami zalogowanej sesji ───────────────────
def fetch_via_api(page, query: str, condition_id: int) -> list[dict]:
    """
    Uzywa fetch() wewnatrz strony Vinted (omija CORS, ma pelek cookies).
    Zwraca liste surowych itemow z API.
    """
    from urllib.parse import urlencode
    qs = urlencode({
        "search_text": query,
        "order":       "relevance",
        "per_page":    96,
        "page":        1,
    }) + f"&condition_ids[]={condition_id}"

    api_url = f"/api/v2/catalog/items?{qs}"

    result = page.evaluate(f"""
        async () => {{
            try {{
                const resp = await fetch('{api_url}', {{
                    headers: {{
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    }}
                }});
                if (!resp.ok) return {{ error: resp.status }};
                return await resp.json();
            }} catch(e) {{
                return {{ error: e.toString() }};
            }}
        }}
    """)

    if not result or "error" in result:
        print(f"\n      [API error: {result}]")
        return []

    return result.get("items", [])


def extract_price(item: dict) -> float | None:
    try:
        return float(item.get("price", {}).get("amount", 0))
    except (ValueError, TypeError):
        return None


def get_item_status(item: dict) -> str:
    """Zwraca status przedmiotu z API."""
    # Vinted zwraca status w polu 'status' lub w item_box
    status = item.get("status", "")
    if not status:
        box = item.get("item_box", {})
        second_line = box.get("second_line", "")
        for s in ["Nowy z metk", "Nowy bez metki", "Bardzo dobry", "Dobry", "Zadowalający"]:
            if s.lower() in second_line.lower():
                return s
    return status


def filter_by_price(items: list[dict], buy_price: float | None,
                    needed: int) -> tuple[list[float], list[str], list[str]]:
    """Filtruje items po cenie i zwraca (ceny, OK_tytuly, odrzucone_tytuly)."""
    if buy_price and buy_price > 0:
        p_min = buy_price * PRICE_MIN_FACTOR
        p_max = buy_price * PRICE_MAX_FACTOR
    else:
        p_min = MIN_PRICE_FALLBACK
        p_max = MAX_PRICE_FALLBACK

    ok_prices  = []
    ok_titles  = []
    bad_titles = []

    for item in items:
        price = extract_price(item)
        title = item.get("title", "?")
        if price is None:
            continue
        if p_min <= price <= p_max:
            ok_prices.append(price)
            ok_titles.append(f"{title} ({price} zl)")
            if len(ok_prices) >= needed:
                break
        else:
            bad_titles.append(f"{title} ({price:.2f} zl)")

    return ok_prices, ok_titles, bad_titles


# ── Statystyki ────────────────────────────────────────────────────────────────
def calc_stats(prices: list[float]) -> dict:
    if not prices:
        return {"count": 0, "min": None, "max": None,
                "avg": None, "median": None, "suggested": None}
    sv     = sorted(prices)
    idx_25 = max(0, int(len(sv) * 0.25) - 1)
    return {
        "count":     len(sv),
        "min":       round(sv[0], 2),
        "max":       round(sv[-1], 2),
        "avg":       round(statistics.mean(sv), 2),
        "median":    round(statistics.median(sv), 2),
        "suggested": round(sv[idx_25], 2),
    }


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    if not PRODUCTS_FILE.exists():
        print(f"BLAD: Brak pliku {PRODUCTS_FILE}")
        sys.exit(1)

    with open(PRODUCTS_FILE, encoding="utf-8") as f:
        raw = json.load(f)
    products = raw if isinstance(raw, list) else raw.get("products", [])
    print(f"[OK] Wczytano {len(products)} produktow")

    results  = {}
    warnings = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=False,   # widoczna przeglądarka - potrzebna do logowania
            args=["--no-sandbox", "--disable-blink-features=AutomationControlled"]
        )
        context = browser.new_context(
            locale="pl-PL",
            timezone_id="Europe/Warsaw",
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
        )
        page = context.new_page()

        # Sprobuj wczytac zapisana sesje
        session_loaded = load_session(context)

        if session_loaded:
            # Sprawdz czy sesja jest wciaz wazna
            print("Sprawdzam czy sesja jest wazna...")
            page.goto(VINTED_BASE, wait_until="domcontentloaded", timeout=20000)
            time.sleep(3)
            logged = is_logged_in(page)
            if not logged:
                print("[INFO] Sesja wygasla - wymagane ponowne logowanie")
                do_login(page, context)
            else:
                print("[OK] Sesja wazna - nie trzeba sie logowac")
                page.goto(VINTED_BASE, wait_until="domcontentloaded", timeout=15000)
        else:
            do_login(page, context)

        # Upewnij sie ze jestesmy na stronie Vinted (potrzebne do fetch())
        if VINTED_BASE not in page.url:
            page.goto(VINTED_BASE, wait_until="domcontentloaded", timeout=15000)
            time.sleep(2)

        print(f"\nStart: {len(products)} produktow x {len(CONDITIONS)} statusy\n")
        print("=" * 60)

        for idx, product in enumerate(products, 1):
            prod_id   = product.get("id", f"prod_{idx}")
            prod_name = product.get("name", "").strip()
            buy_price = product.get("buyPrice")
            if not prod_name:
                continue

            if buy_price:
                p_lo = buy_price * PRICE_MIN_FACTOR
                p_hi = buy_price * PRICE_MAX_FACTOR
                price_info = f"zakup: {buy_price} zl  |  progi: {p_lo:.0f}-{p_hi:.0f} zl"
            else:
                price_info = f"brak ceny zakupu -> prog min: {MIN_PRICE_FALLBACK} zl"

            print(f"\n[{idx}/{len(products)}]  {prod_name}")
            print(f"      {price_info}")

            results[prod_id] = {
                "name":       prod_name,
                "scrapedAt":  None,
                "conditions": {}
            }

            for cond_key, cond_cfg in CONDITIONS.items():
                print(f"      {cond_cfg['label']}... ", end="", flush=True)

                # Pobierz przez wewnetrzny fetch (zalogowana sesja, dziala condition_ids)
                items = fetch_via_api(page, prod_name, cond_cfg["id"])

                prices, ok_titles, bad_titles = filter_by_price(
                    items, buy_price, RESULTS_PER_STATUS
                )
                stats = calc_stats(prices)

                results[prod_id]["conditions"][cond_key] = {
                    "label":  cond_cfg["label"],
                    "prices": prices,
                    "stats":  stats,
                }

                if stats["count"] > 0:
                    print(
                        f"{stats['count']} ofert | "
                        f"min {stats['min']} zl | "
                        f"sr. {stats['avg']} zl | "
                        f"max {stats['max']} zl | "
                        f"suger. {stats['suggested']} zl"
                    )
                    for t in ok_titles[:3]:
                        print(f"        [OK] {t}")
                else:
                    print("brak wynikow w przedziale cenowym")
                    warnings.append(f"{prod_name} / {cond_cfg['label']}")
                    if bad_titles:
                        print(f"        Odrzucono {len(bad_titles)} ofert poza progiem:")
                        for t in bad_titles[:3]:
                            print(f"        [X] {t}")

                # Krotkie opoznienie - nie przesadzamy z requestami
                time.sleep(random.uniform(2, 4))

            results[prod_id]["scrapedAt"] = datetime.now().isoformat()

        browser.close()

    # ── Zapis wynikow ─────────────────────────────────────────────────────────
    output = {
        "generatedAt": datetime.now().isoformat(),
        "products":    results,
    }
    OUTPUT_FILE.write_text(
        json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print("\n" + "=" * 60)
    print(f"[OK] Zapisano: {OUTPUT_FILE}")
    print(f"     Produktow: {len(results)}")
    print(f"     Czas: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    if warnings:
        print(f"\n[WARN] Brak wynikow dla {len(warnings)} kombinacji:")
        for w in warnings:
            print(f"  - {w}")
        print()
        print("Mozliwe przyczyny:")
        print("  1. Produkt rzadki na Vinted dla tego statusu")
        print("  2. Dodaj/popraw cene zakupu w aplikacji")
        print("  3. Skroc nazwe produktu (np. 'Nike Bag' zamiast 'Nike Elite Bag granatowy L')")

    print("\nGOTOWE - otworz finanse.html i kliknij 'Zaladuj ceny'\n")


if __name__ == "__main__":
    main()