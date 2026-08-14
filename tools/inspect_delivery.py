import requests, re

h = {'User-Agent': 'Mozilla/5.0 Chrome/120.0'}
t = requests.get('https://www.coolblue.be/en/mobile-phones/smartphones/second-chance', headers=h, timeout=30).text

# Delivery / availability text occurrences
for k in [r'[Dd]elivered', r'[Dd]elivery', r'[Ss]old out', r'[Tt]oday', r'[Tt]omorrow', r'[Dd]ays', r'[Ss]hipped', r'[Ii]n stock', r'[Oo]ut of stock', r'[Aa]vailable']:
    ms = re.findall(k, t)
    print(k, '->', len(ms), ms[:8])

print()
# unique condition-like tokens
conds = set(re.findall(r'(Undamaged|Lightly damaged|Visibly damaged|Heavily damaged|Second Chance|Refurbished)', t))
print('conditions found:', conds)
