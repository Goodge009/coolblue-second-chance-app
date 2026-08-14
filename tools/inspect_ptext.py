import re

t = open('page.html', encoding='utf-8').read()

# All delivery texts in cards (p with that class) or any <p ...> with delivery-ish text
ps = re.findall(r'<p[^>]*>([^<]{2,60})</p>', t)
pset = {}
for p in ps:
    p = p.strip()
    pset[p] = pset.get(p, 0) + 1
print('=== distinct <p> texts (count) ===')
for p, n in sorted(pset.items(), key=lambda x: -x[1]):
    if n > 0:
        print(f'{n:4d}  {p}')
