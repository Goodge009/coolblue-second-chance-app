#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scraper des produits Second Chance de Coolblue (Belgique).

Scrape les pages categorie https://www.coolblue.be/en/<categorie>/second-chance,
extrait les notes/avis, regroupe les variantes d'un meme produit et
enregistre le resultat dans second_chance_offers.json.

Usage :
    python scraper.py            # scrape et sauvegarde
    python scraper.py --pages 2  # limite a 2 pages par categorie
"""

import argparse
import html
import json
import os
import re
import time
from urllib.parse import urljoin

import requests

BASE_URL = "https://www.coolblue.be"
OUTPUT_FILE = "second_chance_offers.json"
CATEGORIES_FILE = "categories.json"
BRANDS_FILE = "brands.json"

# Categories scrapees : liste d'entrees {"slug": ..., "label": ...}
# chargee depuis categories.json (partagee avec le scraper JavaScript)
def load_categories():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), CATEGORIES_FILE)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


CATEGORIES = {c["slug"]: c["label"] for c in load_categories()}


def load_brands():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), BRANDS_FILE)
    with open(path, "r", encoding="utf-8") as f:
        return sorted(json.load(f), key=len, reverse=True)


BRANDS = load_brands()

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9,nl;q=0.8",
}

CARD_SPLIT_RE = re.compile(r'<div class="product-card ')
CARD_URL_RE = re.compile(r'<a href="([^"]*product-second-chance/[^"]+)"')
CARD_IMAGE_RE = re.compile(r'<img alt="([^"]*)"[^>]*src="([^"]+)"')
CARD_PRICES_RE = re.compile(r'>([0-9][0-9.]*)<!-- -->,-<')
CARD_REVIEW_RE = re.compile(r"Review is ([0-9,]+) out of 10, based on ([0-9]+) reviews")
CARD_DELIVERY_RE = re.compile(r"<p[^>]*>([^<]{2,60})</p>")
CONDITIONS = ("Undamaged", "Visibly damaged", "Lightly damaged")

# Couleurs retires du nom pour regrouper les variantes d'un meme modele
COLORS = [
    "black", "white", "blue", "silver", "purple", "gray", "grey", "green",
    "mint", "gold", "pink", "rose", "natural", "titanium", "midnight",
    "starlight", "red", "yellow", "orange", "coral", "ink", "graphite",
    "space", "beige", "sand", "cream", "onyx", "phantom", "flowy",
    "emerald", "olive", "navy", "snow", "sky", "denim", "cobalt", "violet",
]


def parse_price(raw):
    """Convertit '1.239' -> 1239.0"""
    try:
        return float(raw.replace(".", ""))
    except (ValueError, AttributeError):
        return None


def detect_brand(name):
    """Marque = premier terme de la liste present en debut de nom."""
    low = (name or "").lower()
    for brand in BRANDS:  # liste triee par longueur decroissante
        if low.startswith(brand.lower()):
            return brand
    return None


def normalize_name(name):
    """Nom normalise utilise comme cle de groupement des variantes."""
    n = name.lower()
    for color in COLORS:
        n = n.replace(color, "")
    n = re.sub(r"\s+", " ", n).strip()
    return n


def extract_card(card_html, category_label):
    """Extrait une unite (variante) d'une carte produit HTML."""
    url_m = CARD_URL_RE.search(card_html)
    if not url_m:
        return None
    url = urljoin(BASE_URL, url_m.group(1))
    url = url.replace("/en/product-second-chance/", "/fr/deuxieme-chance-produit/")

    image_m = CARD_IMAGE_RE.search(card_html)
    name = html.unescape(image_m.group(1)).strip() if image_m else None
    image_url = image_m.group(2) if image_m else None
    if image_url and "/max/320xauto/" in image_url:
        image_url = image_url.replace("/max/320xauto/", "/max/640xauto/")

    prices = CARD_PRICES_RE.findall(card_html)
    if len(prices) < 2:
        return None
    new_price = parse_price(prices[0])
    second_chance_price = parse_price(prices[1])
    if not new_price or not second_chance_price:
        return None

    condition = next((c for c in CONDITIONS if c in card_html), None)
    condition = "Neuf" if condition is None else condition

    if "No longer available" in card_html:
        stock_status = "Plus disponible"
    elif "Temporarily sold out" in card_html or "Sold out" in card_html:
        stock_status = "Rupture de stock"
    else:
        stock_status = "En stock"

    delivery = None
    for m in CARD_DELIVERY_RE.finditer(card_html):
        text = m.group(1).strip()
        if re.search(r"deliver|stock|available|today|tomorrow|days|week|order", text, re.I):
            delivery = text
            break

    review_m = CARD_REVIEW_RE.search(card_html)
    if review_m:
        review_score = float(review_m.group(1).replace(",", "."))
        review_count = int(review_m.group(2))
    else:
        review_score = 0.0
        review_count = 0

    savings = round(new_price - second_chance_price, 2)
    discount_percent = round((savings / new_price) * 100, 1) if new_price else 0.0

    id_m = re.search(r"/product-second-chance/(\d+)/(\d+)", url)
    unit_id = f"{id_m.group(1)}-{id_m.group(2)}" if id_m else url

    return {
        "id": unit_id,
        "name": name or url,
        "url": url,
        "imageUrl": image_url,
        "brand": detect_brand(name or url),
        "newPrice": new_price,
        "secondChancePrice": second_chance_price,
        "category": category_label,
        "condition": condition,
        "stockStatus": stock_status,
        "delivery": delivery,
        "reviewScore": review_score,
        "reviewCount": review_count,
        "savings": savings,
        "discountPercent": discount_percent,
        "type": "Second Chance",
        "isSecondChance": True,
    }


def fetch_page(session, url, max_retries=3):
    """Recupere une page avec retry et backoff sur les erreurs 503/429."""
    for attempt in range(max_retries):
        try:
            response = session.get(url, timeout=30)
            if response.status_code == 200:
                return response.text
            if response.status_code in (503, 429):
                wait = 5 + attempt * 5
                print(f"    [503/429] {url} - nouvel essai dans {wait}s")
                time.sleep(wait)
                continue
            print(f"    [HTTP {response.status_code}] {url}")
            return None
        except requests.RequestException as exc:
            print(f"    [ERREUR] {url} : {exc}")
            time.sleep(3 + attempt * 3)
    return None


def scrape_category(session, slug, max_pages):
    """Scrape une categorie et renvoie la liste des unites."""
    products = []
    for page in range(1, max_pages + 1):
        url = f"{BASE_URL}/en/{slug}/second-chance"
        if page > 1:
            url += f"?page={page}"
        print(f"  -> {url}")

        html = fetch_page(session, url)
        if not html:
            break

        cards = CARD_SPLIT_RE.split(html)[1:]
        if not cards:
            break

        for card in cards:
            product = extract_card(card, CATEGORIES[slug])
            if product:
                products.append(product)

        next_links = re.findall(r'<link rel="next" href="([^"]+)"', html)
        if not next_links:
            break

        time.sleep(1.0)

    return products


def group_products(units):
    """Regroupe les unites d'un meme produit et garde la meilleure offre."""
    groups = {}
    for unit in units:
        key = normalize_name(unit["name"])
        groups.setdefault(key, []).append(unit)

    products = []
    for group_id, variants in enumerate(groups.values()):
        best = max(
            variants,
            key=lambda v: (v["discountPercent"], -v["secondChancePrice"]),
        )
        products.append({
            "id": best["id"],
            "groupId": group_id,
            "name": best["name"],
            "url": best["url"],
            "imageUrl": best["imageUrl"],
            "brand": best.get("brand"),
            "newPrice": best["newPrice"],
            "secondChancePrice": best["secondChancePrice"],
            "category": best["category"],
            "condition": best["condition"],
            "stockStatus": best["stockStatus"],
            "delivery": best.get("delivery"),
            "reviewScore": best["reviewScore"],
            "reviewCount": best["reviewCount"],
            "savings": best["savings"],
            "discountPercent": best["discountPercent"],
            "type": "Second Chance",
            "isSecondChance": True,
            "variantsCount": len(variants),
            "variants": [
                {
                    "id": v["id"],
                    "name": v["name"],
                    "url": v["url"],
                    "secondChancePrice": v["secondChancePrice"],
                    "condition": v["condition"],
                    "stockStatus": v["stockStatus"],
                }
                for v in sorted(
                    variants, key=lambda v: v["secondChancePrice"]
                )
            ],
        })
    return products


def save_products(products, units_count):
    """Enregistre les produits (groupes) dans le fichier JSON."""
    data = {
        "metadata": {
            "scrapedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
            "totalProducts": len(products),
            "totalVariants": units_count,
            "categories": len(CATEGORIES),
            "source": "coolblue.be (second-chance)",
        },
        "products": products,
    }
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), OUTPUT_FILE)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n[OK] {len(products)} produits ({units_count} variantes) sauvegardes dans {OUTPUT_FILE}")


def main():
    parser = argparse.ArgumentParser(description="Scraper Second Chance Coolblue")
    parser.add_argument("--pages", type=int, default=3,
                        help="Nombre maximal de pages par categorie (defaut: 3)")
    args = parser.parse_args()

    print("=" * 60)
    print("COOLBLUE SECOND CHANCE - SCRAPER")
    print("=" * 60)

    session = requests.Session()
    session.headers.update(HEADERS)

    all_units = []
    for slug in CATEGORIES:
        print(f"\n[CATEGORIE] {CATEGORIES[slug]}")
        units = scrape_category(session, slug, args.pages)
        print(f"  {len(units)} unites trouvees")
        all_units.extend(units)
        time.sleep(1.5)

    # Deduplication par URL
    seen, unique = set(), []
    for unit in all_units:
        if unit["url"] not in seen:
            seen.add(unit["url"])
            unique.append(unit)

    products = group_products(unique)
    products.sort(key=lambda p: p["savings"], reverse=True)

    print(f"\nTotal unites: {len(unique)} | Produits (groupes): {len(products)}")

    save_products(products, len(unique))

    print("\n[TOP 10 DES MEILLEURES AFFAIRES]")
    for product in products[:10]:
        variants = f" ({product['variantsCount']} variantes)" if product["variantsCount"] > 1 else ""
        print(
            f"  {product['discountPercent']:5.1f}%  -{product['savings']:7.2f} EUR  "
            f"{product['name'][:50]}{variants}"
        )


if __name__ == "__main__":
    main()
