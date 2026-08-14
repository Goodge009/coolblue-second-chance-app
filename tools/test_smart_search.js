// Test de la recherche intelligente sur les données réelles (sans DOM)
const fs = require('fs');
const path = require('path');

const ACCENTS = {
    á: 'a', à: 'a', â: 'a', ä: 'a', ã: 'a', å: 'a', ā: 'a',
    é: 'e', è: 'e', ê: 'e', ë: 'e', ē: 'e',
    í: 'i', ì: 'i', î: 'i', ï: 'i', ī: 'i',
    ó: 'o', ò: 'o', ô: 'o', ö: 'o', õ: 'o', ō: 'o',
    ú: 'u', ù: 'u', û: 'u', ü: 'u', ū: 'u',
    ç: 'c', ñ: 'n', ÿ: 'y', ý: 'y', œ: 'oe', æ: 'ae', ß: 'ss',
};

const SYNONYMS = {
    tel: ['telephone', 'smartphone', 'mobile', 'phone', 'cellulaire'],
    tv: ['television', 'televiseur', 'televisions', 'televiseurs', 'ledtv'],
    pc: ['ordinateur', 'laptop', 'portable', 'computer', 'desktop', 'ordi', 'notebook'],
    ecran: ['moniteur', 'monitor', 'display', 'screen'],
    casque: ['headphone', 'headset', 'earphone', 'ecouteur', 'audio'],
    montre: ['watch', 'smartwatch'],
    tablette: ['tablet'],
    console: ['playstation', 'xbox', 'nintendo', 'gaming'],
    jeu: ['game', 'gaming', 'switch'],
    aspirateur: ['vacuum'],
    photo: ['camera', 'appareil', 'reflex'],
    smartphone: ['telephone', 'phone', 'mobile', 'cellulaire'],
    laptop: ['ordinateur', 'portable', 'notebook', 'computer'],
    ordinateur: ['laptop', 'portable', 'desktop', 'pc', 'computer'],
    headphone: ['casque', 'headset', 'earphone'],
    camera: ['photo', 'reflex', 'appareil'],
};

function normalizeText(s) {
    const out = [];
    const t = String(s || '').toLowerCase();
    for (let i = 0; i < t.length; i++) out.push(ACCENTS[t[i]] || t[i]);
    return out.join('');
}

function expandTerm(term) {
    const base = SYNONYMS[term];
    return base ? [term].concat(base) : [term];
}

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 1) return 2;
    let prev = new Array(n + 1);
    let cur = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
        cur[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        }
        const tmp = prev; prev = cur; cur = tmp;
    }
    return prev[n];
}

function matchTerm(hay, terms) {
    const direct = (str, score) => {
        for (const t of terms) if (str.indexOf(t) !== -1) return { score, term: t };
        return null;
    };
    let m = direct(hay.name, 6);
    if (m) return m;
    m = direct(hay.brand, 6);
    if (m) return m;
    m = direct(hay.cat, 4);
    if (m) return m;
    m = direct(hay.variants, 3);
    if (m) return m;
    for (const t of terms) {
        if (t.length < 3) continue;
        for (const w of hay.words) {
            if (w.indexOf(t) === 0 && w.length > t.length) return { score: 3, term: t };
            if (t.length >= 4 && w.length >= 4 && levenshtein(w, t) <= 1) return { score: 2, term: t };
        }
    }
    return { score: 0, term: null };
}

function smartSearch(allOffers, query) {
    const terms = normalizeText(query).split(/\s+/).filter(Boolean);
    const expanded = terms.map(expandTerm);
    const score = (anyMode) => {
        const results = [];
        const matches = new Map();
        for (const offer of allOffers) {
            const hay = {
                name: normalizeText(offer.name),
                brand: normalizeText(offer.brand || ''),
                cat: normalizeText(offer.category),
                variants: (offer.variants || []).map((v) => normalizeText(v.name)).join(' '),
                words: normalizeText(offer.name).split(/\s+/).filter((w) => w.length > 1),
            };
            let score = 0, ok = true;
            const matched = [];
            for (let i = 0; i < terms.length; i++) {
                const m = matchTerm(hay, expanded[i]);
                if (m.score === 0) { ok = false; if (!anyMode) break; }
                else { score += m.score; if (m.term) matched.push(m.term); }
            }
            if (ok && score > 0) { results.push({ offer, score }); matches.set(offer.id, matched); }
        }
        return { results, matches };
    };
    let { results, matches } = score(false);
    let fallback = false;
    if (!results.length) {
        const or = score(true);
        results = or.results; matches = or.matches; fallback = true;
    }
    results.sort((a, b) => b.score - a.score);
    if (fallback && results.length) results = results.slice(0, 60);
    return { list: results.map((r) => r.offer), matches, fallback };
}

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'second_chance_offers.json'), 'utf-8'));
const offers = data.products;

const tests = [
    ['iphone 15', 1],
    ['tv 65', 1],
    ['samsung', 1],
    ['dyson', 1],
    ['ecran 27', 1],
    ['robot aspirateur', 0], // aucune catégorie aspirateur dans les données
    ['tel samsung', 1],
    ['ps5', 0],
    ['lenovo legion', 1],
    ['montre garmin', 1],
];

let allOk = true;
for (const [q, min] of tests) {
    const r = smartSearch(offers, q);
    const names = r.list.slice(0, 5).map((o) => o.name);
    const ok = r.list.length >= min;
    if (!ok) allOk = false;
    console.log(`« ${q} » → ${r.list.length} résultats${r.fallback ? ' (repli OR)' : ''}`);
    names.forEach((n) => console.log(`    - ${n}`));
}

// vérif: recherche "iphone" trouve des iPhone en tête
const iphone = smartSearch(offers, 'iphone 15').list;
const firstIphone = iphone[0] && iphone[0].name;
if (iphone.length && /iphone 15/i.test(firstIphone)) {
    console.log('OK premier résultat « iphone 15 »:', firstIphone);
} else {
    allOk = false;
    console.log('ÉCHEC: premier résultat iphone 15 =', firstIphone);
}

const tv = smartSearch(offers, 'tv 65').list[0];
if (tv && /65/.test(tv.name)) console.log('OK « tv 65 »:', tv.name);
else { allOk = false; console.log('ÉCHEC tv 65:', tv && tv.name); }

const dyson = smartSearch(offers, 'dyson').list[0];
if (dyson && /dyson/i.test(dyson.name)) console.log('OK « dyson »:', dyson.name);
else { allOk = false; console.log('ÉCHEC dyson:', dyson && dyson.name); }

console.log(allOk ? '\nTOUS LES TESTS OK' : '\nÉCHECS DÉTECTÉS');
process.exit(allOk ? 0 : 1);
