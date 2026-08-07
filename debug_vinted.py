"""
debug_vinted.py
Uruchom ten skrypt i wklej mi caly output - dzieki temu naprawie scraper.
"""
import requests, json, sys

s = requests.Session()
s.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
    "Referer": "https://www.vinted.pl/",
})

print("Inicjalizuje sesje...")
r = s.get("https://www.vinted.pl", timeout=20)
print(f"Home: HTTP {r.status_code}, cookies: {list(s.cookies.keys())}")

print("\nWywoluje API dla 'Nike Elite Bag' (bez filtru stanu)...")
params = {
    "search_text": "Nike Elite Bag",
    "order": "price_low_to_high",
    "per_page": 3,
    "page": 1,
}
r2 = s.get("https://www.vinted.pl/api/v2/catalog/items", params=params, timeout=20)
print(f"API: HTTP {r2.status_code}")

if r2.status_code != 200:
    print("Tresc odpowiedzi:", r2.text[:500])
    sys.exit(1)

data = r2.json()
items = data.get("items", [])
print(f"Liczba wynikow: {len(items)}")

if not items:
    print("Klucze w odpowiedzi:", list(data.keys()))
    sys.exit(1)

print("\n" + "="*60)
print("PELNY JSON PIERWSZEGO PRODUKTU:")
print("="*60)
print(json.dumps(items[0], indent=2, ensure_ascii=False))

print("\n" + "="*60)
print("POLA Z 'price' LUB 'amount' - WSZYSTKIE 3 PRODUKTY:")
print("="*60)
for i, item in enumerate(items[:3]):
    print(f"\n--- Produkt {i+1}: {item.get('title','?')} ---")
    for k, v in item.items():
        if any(x in k.lower() for x in ['price', 'amount', 'cost', 'total', 'fee']):
            print(f"  {k}: {v}")

# Tez sprawdz z filtrem stanu
print("\n" + "="*60)
print("TEST Z FILTREM condition_ids[]=6 (Nowy z metka):")
print("="*60)
params2 = {
    "search_text": "Nike Elite Bag",
    "condition_ids[]": "6",
    "order": "price_low_to_high",
    "per_page": 3,
}
r3 = s.get("https://www.vinted.pl/api/v2/catalog/items", params=params2, timeout=20)
print(f"API z filtrem: HTTP {r3.status_code}")
if r3.status_code == 200:
    data3 = r3.json()
    items3 = data3.get("items", [])
    print(f"Wynikow z filtrem: {len(items3)}")
    for i, item in enumerate(items3[:3]):
        print(f"\n  Produkt {i+1}: {item.get('title','?')}")
        for k, v in item.items():
            if any(x in k.lower() for x in ['price', 'amount', 'condition']):
                print(f"    {k}: {v}")
