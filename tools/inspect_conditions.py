import requests, re

h = {'User-Agent': 'Mozilla/5.0 Chrome/120.0'}
t = requests.get('https://www.coolblue.be/en/mobile-phones/smartphones/second-chance', headers=h, timeout=30).text

patterns = [
    r'[Uu]ndamaged', r'[Ll]ightly damaged', r'[Vv]isibly damaged',
    r'In stock', r'Out of stock', r'Stock', r'Damaged', r'Delivery', r'condition',
]
for k in patterns:
    ms = re.findall(k, t)
    print('---', k, '->', len(ms), ms[:6])
