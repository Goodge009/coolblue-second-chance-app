import requests, re, sys

h = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

candidates = [
    'mobile-phones/smartphones', 'mobile-phones', 'laptops', 'tablets', 'monitors',
    'televisions', 'smartwatches', 'earphones', 'headphones', 'game-consoles',
    'keyboards', 'mice', 'computer-components', 'graphics-cards', 'processors',
    'memory-ram', 'hard-drives', 'ssd', 'wifi-routers', 'network-equipment',
    'washing-machines', 'fridges', 'dryers', 'dishwashers', 'vacuum-cleaners',
    'coffee-machines', 'airfryers', 'microwaves', 'blenders', 'juicers',
    'food-processors', 'breadmakers', 'e-bikes', 'e-scooters', 'e-mobility',
    'smartphones', 'action-cameras', 'camera', 'cameras', 'photo-cameras',
    'printers', 'all-in-one-printers', 'dehumidifiers', 'heaters', 'airconditioners',
    'speakers', 'soundbars', 'home-cinema', 'turntables', 'receivers',
    'projectors', 'ereaders', 'audio', 'studio-equipment', 'guitars',
    'smart-home', 'security-cameras', 'thermostats', 'smart-plugs',
    'coffee-pads', 'espresso-machines', 'pressure-cookers', 'multicookers',
    'robots', 'sous-vide', 'dishwashers', 'steamers', 'ice-cream-machines',
    'toasters', 'electric-kettles', 'irons', 'clothes-steamers',
    'sewing-machines', 'shavers', 'hair-stylers', 'toothbrushes',
    'humidifiers', 'air-purifiers', 'fans', 'power-tools', 'drills',
    'garden', 'barbecues', 'cars-accessories', 'sports', 'fitness',
]

results = []
for slug in candidates:
    url = f'https://www.coolblue.be/en/{slug}/second-chance'
    try:
        r = requests.get(url, headers=h, timeout=20)
    except Exception as e:
        results.append((slug, 'ERR', str(e)[:40]))
        continue
    if r.status_code != 200:
        results.append((slug, r.status_code, ''))
        continue
    # count product cards
    n = r.text.count('product-card ')
    results.append((slug, 200, f'cards={n}'))

for slug, code, extra in results:
    print(f'{code}\t{extra}\t{slug}')
