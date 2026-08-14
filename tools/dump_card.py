import requests, re

h = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}
t = requests.get('https://www.coolblue.be/en/mobile-phones/smartphones/second-chance', headers=h, timeout=30).text
open('page.html', 'w', encoding='utf-8').write(t)
parts = re.split(r'<div class="product-card ', t)
print('cards:', len(parts) - 1)
for i in (1, 2):
    open(f'card{i}.html', 'w', encoding='utf-8').write('<div class="product-card ' + parts[i])
    print(f'wrote card{i}.html len=', len(parts[i]))
