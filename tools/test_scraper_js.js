const fs = require('fs');
require('../scraper.js');
const CBS = globalThis.CBS;

const html = fs.readFileSync('page.html', 'utf-8');

const cards = html.split('<div class="product-card ').slice(1).map(c => '<div class="product-card ' + c);
console.log('cards:', cards.length);

let ok = 0, fail = 0, noPrice = 0;
for (const c of cards) {
    const u = CBS.extractCard(c, 'Test');
    if (!u) { fail++; continue; }
    ok++;
    if (!u.secondChancePrice || !u.newPrice) noPrice++;
    if (u.name && u.name.includes('&#x27;')) {
        console.log('ENTITY NOT DECODED:', u.name);
    }
}
console.log('parsed ok:', ok, '| null:', fail, '| noPrice:', noPrice);

// sanity on first card
const first = CBS.extractCard(cards[0], 'Test');
console.log('sample:', JSON.stringify(first, null, 1).slice(0, 900));

// decodeEntities test
console.log('decode check:', CBS.decodeEntities("De&#x27;Longhi Magnifica S ECAM21.117.B"));

// normalization
console.log('normalize:', CBS.normalizeName('Apple iPhone 17 256GB Black'), '=>', CBS.normalizeName('Apple iPhone 17 256GB White') === CBS.normalizeName('Apple iPhone 17 256GB Black'));
