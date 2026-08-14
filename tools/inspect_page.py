import re

t = open('page.html', encoding='utf-8').read()
print('page len:', len(t))

for k in [r'[Dd]elivered', r'[Dd]elivery', r'[Ss]old out', r'[Tt]oday', r'[Tt]omorrow', r'[Dd]ays', r'[Ss]hipped', r'[Ii]n stock', r'[Oo]ut of stock', r'[Aa]vailable', r'[Oo]rder']:
    ms = re.findall(k, t)
    print(k, '->', len(ms), ms[:10])

conds = set(re.findall(r'(Undamaged|Lightly damaged|Visibly damaged|Heavily damaged|Second Chance|Refurbished)', t))
print('conditions:', conds)
