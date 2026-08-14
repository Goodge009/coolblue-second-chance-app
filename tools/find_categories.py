import requests, re

h = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}
r = requests.get('https://www.coolblue.be/en/second-chance', headers=h, timeout=30)
t = r.text
print('status', r.status_code, 'len', len(t))

links = set()
for m in re.finditer(r'href="([^"]*second-chance[^"]*)"', t):
    links.add(m.group(1))
print('found', len(links))
for u in sorted(links):
    print(u)
