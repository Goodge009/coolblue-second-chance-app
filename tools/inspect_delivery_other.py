import requests, re

h = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

cats = ['laptops', 'game-consoles', 'vacuum-cleaners', 'coffee-machines', 'headphones', 'televisions', 'gaming']
for slug in cats:
    url = f'https://www.coolblue.be/en/{slug}/second-chance'
    try:
        r = requests.get(url, headers=h, timeout=25)
        t = r.text
    except Exception as e:
        print(slug, 'ERR', e)
        continue
    if r.status_code != 200:
        print(slug, 'status', r.status_code)
        continue
    ps = re.findall(r'<p[^>]*>([^<]{2,60})</p>', t)
    deliverish = {}
    for p in ps:
        p = p.strip()
        if re.search(r'[Dd]eliver|[Ss]old out|[Aa]vailable|[Ss]tock|[Dd]ays|today|tomorrow|week', p):
            deliverish[p] = deliverish.get(p, 0) + 1
    cards = t.count('product-card ')
    print(slug, '| status', r.status_code, '| cards~', cards // 2, '| delivery texts:', deliverish)
