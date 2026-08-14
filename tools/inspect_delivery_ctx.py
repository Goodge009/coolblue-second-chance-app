import re

t = open('page.html', encoding='utf-8').read()

# context around 'sold out'
for m in re.finditer(r'sold out', t, re.I):
    s = max(0, m.start() - 250)
    print('=== SOLD OUT context ===')
    print(t[s:m.end() + 120].replace('\n', ' '))
    break

# context around 'Delivered tomorrow' (first)
m = re.search(r'Delivered tomorrow', t)
if m:
    s = max(0, m.start() - 300)
    print()
    print('=== DELIVERED TOMORROW context ===')
    print(t[s:m.end() + 80].replace('\n', ' '))

# check for "In stock" context
m = re.search(r'In stock', t)
if m:
    s = max(0, m.start() - 300)
    print()
    print('=== IN STOCK context ===')
    print(t[s:m.end() + 80].replace('\n', ' '))

# find delivery text patterns overall
print()
print('unique delivery-like phrases:')
phrases = set(re.findall(r'Delivered [^<>]{0,40}', t))
for p in sorted(phrases)[:20]:
    print(' *', p)
