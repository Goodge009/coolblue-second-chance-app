const http = require('http');
require('../scraper.js');
const CBS = globalThis.CBS;

function proxyFetch(url) {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:8000/api/proxy?url=' + encodeURIComponent(url), (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => {
                if (res.statusCode === 200) resolve(body);
                else resolve({ status: res.statusCode, body: '' });
            });
        }).on('error', reject);
    });
}

async function main() {
    const categories = [
        { slug: 'espresso-machines', label: 'Machines espresso' },
        { slug: 'wifi-6', label: 'WiFi 6' },
        { slug: 'drones', label: 'Drones' },
    ];
    const result = await CBS.scrapeAll({
        categories,
        maxPages: 2,
        concurrency: 2,
        fetchHtml: proxyFetch,
        onProgress: (p) => console.log(`  ${p.done}/${p.total} — ${p.category} — ${p.units} unités`),
    });
    console.log('units:', result.units.length, '| unique:', result.uniqueUnits.length, '| products:', result.products.length);
    console.log('failed:', result.failed);
    const top = result.products.slice(0, 3);
    top.forEach((p) => console.log(`  -${p.discountPercent}%  ${p.name}  [${p.category}]`));
    console.log('valid sample:', top[0] && top[0].id && top[0].secondChancePrice ? 'OK' : 'BAD');
}

main().catch((e) => { console.error('ERR', e); process.exit(1); });
