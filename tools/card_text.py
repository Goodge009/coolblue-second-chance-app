import re

t = open('card1.html', encoding='utf-8').read()

# Extract visible text: remove scripts/styles/svg, then tags
t2 = re.sub(r'<script.*?</script>', ' ', t, flags=re.S)
t2 = re.sub(r'<style.*?</style>', ' ', t2, flags=re.S)
t2 = re.sub(r'<svg.*?</svg>', ' ', t2, flags=re.S)
text = re.sub(r'<[^>]+>', '|', t2)
text = re.sub(r'\|+', ' | ', text)
text = re.sub(r'\s+', ' ', text)
print('===== CARD VISIBLE TEXT =====')
print(text)
