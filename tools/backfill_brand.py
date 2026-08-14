import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import scraper

path = os.path.join(ROOT, 'second_chance_offers.json')
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

missing = 0
for p in data['products']:
    b = scraper.detect_brand(p.get('name', ''))
    if b:
        p['brand'] = b
    else:
        p['brand'] = None
        missing += 1

from collections import Counter
cnt = Counter(p.get('brand') for p in data['products'])
print('avec marque:', len(data['products']) - missing, '/', len(data['products']))
print('top marques:', cnt.most_common(12))

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print('sauvegarde OK')
