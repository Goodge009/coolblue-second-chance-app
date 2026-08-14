/* Enrichit second_chance_offers.json avec la galerie photo (champ "images")
   de chaque produit, via le proxy local (server.py doit tourner sur :8000).

   Usage : node tools/enrich_images.js
   - reprenable : ignore les produits ayant déjà un champ "images"
   - 4 téléchargements simultanés, plafond de 8 images par produit
   - sauvegarde atomique toutes les 25 produits et à la fin
*/
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JSON_FILE = path.join(ROOT, 'second_chance_offers.json');
const PROXY = 'http://127.0.0.1:8000/api/proxy';
const CONCURRENCY = 8;
const MAX_IMAGES = 8;
const TIMEOUT_MS = 60000;

require(path.join(ROOT, 'scraper.js'));
const extractGallery = global.CBS.extractGalleryImages;

const out = JSON.parse(fs.readFileSync(JSON_FILE, 'utf-8'));
const products = out.products;

function fetchViaProxy(url, timeoutMs) {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        fetch(PROXY + '?url=' + encodeURIComponent(url), { signal: controller.signal })
            .then((res) => {
                clearTimeout(timer);
                if (!res.ok) return reject(new Error('HTTP ' + res.status));
                return res.text().then(resolve);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

function mainImageKey(imageUrl) {
    const m = /image\.coolblue\.be\/transparent\/max\/\d+xauto\/(products|secondchance)\/(\d+)/.exec(imageUrl || '');
    return m ? m[1] + '/' + m[2] : null;
}

function dedupe(urls, excludeKey) {
    const seen = new Set();
    const result = [];
    for (const u of urls) {
        const key = /\/transparent\/max\/\d+xauto\/(products|secondchance)\/\d+/.exec(u);
        const k = key ? key[0] : u;
        if (seen.has(k)) continue;
        if (excludeKey && k.indexOf(excludeKey) !== -1) continue;
        seen.add(k);
        result.push(u);
        if (result.length >= MAX_IMAGES) break;
    }
    return result;
}

let index = 0;
let okCount = 0;
let failCount = 0;
let skipped = 0;

function save() {
    const tmp = JSON_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(out, null, 2), 'utf-8');
    fs.renameSync(tmp, JSON_FILE);
}

function saveStats() {
    console.log(
        `[${Date.now() % 100000}] ${index}/${products.length} traités | ` +
        `OK=${okCount} FAIL=${failCount} restants=${products.length - index - skipped - okCount - failCount}` +
        ` images=${out.products.filter((p) => (p.images || []).length > 0).length}`
    );
}

async function worker() {
    while (true) {
        const i = index++;
        if (i >= products.length) return;
        const p = products[i];
        if (Array.isArray(p.images) && p.images.length > 0) {
            skipped++;
            continue;
        }
        try {
            const html = await fetchViaProxy(p.url, TIMEOUT_MS);
            const gallery = extractGallery(html);
            const images = dedupe(gallery, mainImageKey(p.imageUrl));
            if (images.length > 0) {
                p.images = images;
                okCount++;
            } else {
                p.images = [];
                okCount++;
            }
        } catch (err) {
            failCount++;
        }
        if ((okCount + failCount) % 25 === 0) save();
        if (index % Math.max(1, Math.round(products.length / 20)) === 0) saveStats();
    }
}

(async () => {
    console.log(`Enrichissement de ${products.length} produits...`);
    const workers = [];
    for (let w = 0; w < CONCURRENCY; w++) workers.push(worker());
    await Promise.all(workers);
    save();
    const withImages = out.products.filter((p) => (p.images || []).length > 0).length;
    console.log(`Terminé : ${withImages}/${products.length} produits avec photos, ${failCount} en échec.`);
})().catch((err) => {
    console.error('ERREUR:', err);
    process.exit(1);
});
