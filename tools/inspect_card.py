import requests, re

h = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}
r = requests.get('https://www.coolblue.be/en/mobile-phones/smartphones/second-chance', headers=h, timeout=30)
t = r.text

# split into cards
parts = re.split(r'<div class="product-card ', t)
print('cards found:', len(parts) - 1)
card = parts[1] if len(parts) > 1 else ''
print('===== CARD SAMPLE (first 4000 chars) =====')
print(card[:4000])
