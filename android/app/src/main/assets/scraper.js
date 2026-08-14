/* Scraper Second Chance Coolblue — portage JavaScript.
   Partage entre : application web (proxy local) et APK Android (pont natif).
   Miroir de scraper.py (meme logique, meme schema JSON). */
(function (global) {
    'use strict';

    var BASE_URL = 'https://www.coolblue.be';
    var CONDITIONS = ['Undamaged', 'Visibly damaged', 'Lightly damaged'];
    var COLORS = [
        'black', 'white', 'blue', 'silver', 'purple', 'gray', 'grey', 'green',
        'mint', 'gold', 'pink', 'rose', 'natural', 'titanium', 'midnight',
        'starlight', 'red', 'yellow', 'orange', 'coral', 'ink', 'graphite',
        'space', 'beige', 'sand', 'cream', 'onyx', 'phantom', 'flowy',
        'emerald', 'olive', 'navy', 'snow', 'sky', 'denim', 'cobalt', 'violet',
    ];

    function decodeEntities(s) {
        if (s === null || s === undefined) return '';
        s = String(s).replace(/&#x([0-9a-fA-F]+);/g, function (_, h) {
            return String.fromCharCode(parseInt(h, 16));
        }).replace(/&#([0-9]+);/g, function (_, d) {
            return String.fromCharCode(parseInt(d, 10));
        });
        var map = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
        return s.replace(/&([a-z]+);/g, function (_, e) {
            return Object.prototype.hasOwnProperty.call(map, e) ? map[e] : '&' + e + ';';
        });
    }

    function parsePrice(raw) {
        if (raw === null || raw === undefined) return null;
        var n = parseFloat(String(raw).replace(/\./g, ''));
        return isNaN(n) ? null : n;
    }

    function normalizeName(name) {
        var n = String(name || '').toLowerCase();
        for (var i = 0; i < COLORS.length; i++) n = n.split(COLORS[i]).join('');
        n = n.replace(/\s+/g, ' ').trim();
        return n;
    }

    function detectBrand(name, brands) {
        var low = String(name || '').toLowerCase();
        for (var i = 0; i < brands.length; i++) {
            if (low.indexOf(brands[i].toLowerCase()) === 0) return brands[i];
        }
        return null;
    }

    function extractCard(cardHtml, categoryLabel, brands) {
        var urlM = cardHtml.match(/<a href="([^"]*product-second-chance\/[^"]+)"/);
        if (!urlM) return null;
        var url = urlM[1].indexOf('http') === 0 ? urlM[1] : BASE_URL + urlM[1];
        url = url.replace('/en/product-second-chance/', '/fr/deuxieme-chance-produit/');

        var imageM = cardHtml.match(/<img alt="([^"]*)"[^>]*src="([^"]+)"/);
        var name = imageM ? decodeEntities(imageM[1]).trim() : null;
        var imageUrl = imageM ? imageM[2] : null;
        if (imageUrl && imageUrl.indexOf('/max/320xauto/') !== -1) {
            imageUrl = imageUrl.split('/max/320xauto/').join('/max/640xauto/');
        }

        var prices = [];
        var priceRe = />([0-9][0-9.]*)<!-- -->,-</g;
        var pm;
        while ((pm = priceRe.exec(cardHtml)) !== null) prices.push(pm[1]);
        if (prices.length < 2) return null;

        var newPrice = parsePrice(prices[0]);
        var secondChancePrice = parsePrice(prices[1]);
        if (newPrice === null || secondChancePrice === null) return null;

        var condition = null;
        for (var i = 0; i < CONDITIONS.length; i++) {
            if (cardHtml.indexOf(CONDITIONS[i]) !== -1) { condition = CONDITIONS[i]; break; }
        }
        if (condition === null) condition = 'Neuf';

        var stockStatus = 'En stock';
        if (cardHtml.indexOf('No longer available') !== -1) stockStatus = 'Plus disponible';
        else if (cardHtml.indexOf('Temporarily sold out') !== -1 || cardHtml.indexOf('Sold out') !== -1) {
            stockStatus = 'Rupture de stock';
        }

        var delivery = null;
        var delRe = /<p[^>]*>([^<]{2,60})<\/p>/g;
        var dm;
        while ((dm = delRe.exec(cardHtml)) !== null) {
            var text = dm[1].trim();
            if (/deliver|stock|available|today|tomorrow|days|week|order/i.test(text)) {
                delivery = text;
                break;
            }
        }

        var reviewScore = 0, reviewCount = 0;
        var reviewM = cardHtml.match(/Review is ([0-9,]+) out of 10, based on ([0-9]+) reviews/);
        if (reviewM) {
            reviewScore = parseFloat(reviewM[1].split(',').join('.'));
            reviewCount = parseInt(reviewM[2], 10);
        }

        var savings = Math.round((newPrice - secondChancePrice) * 100) / 100;
        var discountPercent = newPrice ? Math.round((savings / newPrice) * 1000) / 10 : 0;

        var idM = url.match(/\/product-second-chance\/(\d+)\/(\d+)/);
        var unitId = idM ? idM[1] + '-' + idM[2] : url;

        return {
            id: unitId,
            name: name || url,
            url: url,
            imageUrl: imageUrl,
            brand: detectBrand(name || url, brands || []),
            newPrice: newPrice,
            secondChancePrice: secondChancePrice,
            category: categoryLabel,
            condition: condition,
            stockStatus: stockStatus,
            delivery: delivery,
            reviewScore: reviewScore,
            reviewCount: reviewCount,
            savings: savings,
            discountPercent: discountPercent,
            type: 'Second Chance',
            isSecondChance: true,
        };
    }

    function splitCards(html) {
        return html.split('<div class="product-card ').slice(1).map(function (c) {
            return '<div class="product-card ' + c;
        });
    }

    /* Extrait la galerie d'images d'une page produit (best effort).
       Coolblue sert selon les pages soit /products/{id} (galerie Next.js)
       soit /secondchance/{id}. Retourne les URLs /transparent/max/640xauto/
       des ids distincts trouvés (hors vignettes transparentes "related"). */
    function extractGalleryImages(html) {
        if (!html) return [];
        var seen = {};
        var urls = [];
        var re = /image\.coolblue\.be\/max\/\d+xauto\/(products|secondchance)\/(\d+)/g;
        var m;
        while ((m = re.exec(html)) !== null) {
            var key = m[1] + '/' + m[2];
            if (seen[key]) continue;
            seen[key] = true;
            urls.push('https://image.coolblue.be/transparent/max/640xauto/' + key);
        }
        return urls;
    }

    function groupProducts(units) {
        var groups = {};
        units.forEach(function (unit) {
            var key = normalizeName(unit.name);
            (groups[key] = groups[key] || []).push(unit);
        });

        var products = [];
        var groupId = 0;
        Object.keys(groups).forEach(function (key) {
            var variants = groups[key];
            var best = variants.slice().sort(function (a, b) {
                var d = (b.discountPercent || 0) - (a.discountPercent || 0);
                if (d !== 0) return d;
                return (a.secondChancePrice || 0) - (b.secondChancePrice || 0);
            })[0];

            var variantsSorted = variants.slice().sort(function (a, b) {
                return (a.secondChancePrice || 0) - (b.secondChancePrice || 0);
            });

            products.push({
                id: best.id,
                groupId: groupId++,
                name: best.name,
                url: best.url,
                imageUrl: best.imageUrl,
                brand: best.brand || null,
                newPrice: best.newPrice,
                secondChancePrice: best.secondChancePrice,
                category: best.category,
                condition: best.condition,
                stockStatus: best.stockStatus,
                delivery: best.delivery || null,
                reviewScore: best.reviewScore,
                reviewCount: best.reviewCount,
                savings: best.savings,
                discountPercent: best.discountPercent,
                type: 'Second Chance',
                isSecondChance: true,
                variantsCount: variants.length,
                variants: variantsSorted.map(function (v) {
                    return {
                        id: v.id,
                        name: v.name,
                        url: v.url,
                        secondChancePrice: v.secondChancePrice,
                        condition: v.condition,
                        stockStatus: v.stockStatus,
                    };
                }),
            });
        });
        return products;
    }

    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    /* --- Abstraction de recuperation du HTML ---
       Android : pont natif -> fichier temporaire -> fetch()
       Web     : proxy local /api/proxy
       Tests   : injection manuelle via opts.fetchHtml */
    function makeFetcher() {
        if (typeof window !== 'undefined' && window.AndroidBridge) {
            return function fetchHtmlAndroid(url) {
                return new Promise(function (resolve, reject) {
                    var id = (window.__cbFetcherCounter = (window.__cbFetcherCounter || 0) + 1);
                    (window.__cbFetchCallbacks = window.__cbFetchCallbacks || {})[id] = {
                        resolve: resolve,
                        reject: reject,
                    };
                    window.AndroidBridge.fetchPage(url, id);
                });
            };
        }
        return async function fetchHtmlWeb(url) {
            var r = await fetch('/api/proxy?url=' + encodeURIComponent(url));
            if (!r.ok) throw new Error('proxy HTTP ' + r.status);
            return await r.text();
        };
    }

    function installAndroidCallback() {
        if (typeof window === 'undefined' || !window.AndroidBridge) return;
        window.__cbFetchResponse = function (id, fileUrl) {
            var cb = (window.__cbFetchCallbacks || {})[id];
            if (!cb) return;
            delete window.__cbFetchCallbacks[id];
            if (!fileUrl) {
                cb.reject(new Error('fetch failed (page ' + id + ')'));
                return;
            }
            fetch(fileUrl).then(function (r) { return r.text(); })
                .then(cb.resolve)
                .catch(cb.reject);
        };
    }

    /* Scrape toutes les categories avec retry + concurrence limitee.
       opts : { categories:[{slug,label}], brands:[], maxPages, concurrency,
               onProgress({done,total,category,units}), fetchHtml } */
    async function scrapeAll(opts) {
        opts = opts || {};
        var categories = opts.categories || [];
        var brands = opts.brands || [];
        var maxPages = opts.maxPages || 2;
        var concurrency = opts.concurrency || 2;
        var onProgress = opts.onProgress || function () {};
        var fetchHtml = opts.fetchHtml || makeFetcher();

        var tasks = [];
        categories.forEach(function (cat) {
            for (var p = 1; p <= maxPages; p++) {
                tasks.push({
                    slug: cat.slug,
                    label: cat.label,
                    page: p,
                    url: BASE_URL + '/en/' + cat.slug + '/second-chance' + (p > 1 ? '?page=' + p : ''),
                });
            }
        });

        var results = { units: [], failed: [], totalPages: tasks.length };
        var done = 0;
        var index = 0;

        async function worker() {
            while (index < tasks.length) {
                var task = tasks[index++];
                var html = null;
                for (var attempt = 0; attempt < 4; attempt++) {
                    try {
                        var r = await fetchHtml(task.url);
                        if (typeof r === 'object' && r && r.status) {
                            if (r.status !== 200) {
                                if (r.status === 503 || r.status === 429) {
                                    await sleep(4000 + attempt * 4000);
                                    continue;
                                }
                                break;
                            }
                            html = r.body;
                        } else {
                            html = r;
                        }
                        if (html.indexOf('<div class="product-card ') === -1) {
                            html = null;
                        }
                        break;
                    } catch (e) {
                        await sleep(3000 + attempt * 3000);
                    }
                }
                if (!html) {
                    if (task.page === 1) {
                        results.failed.push(task.slug + ' (p' + task.page + ')');
                    }
                } else {
                    var cards = splitCards(html);
                    for (var i = 0; i < cards.length; i++) {
                        var unit = extractCard(cards[i], task.label, brands);
                        if (unit) results.units.push(unit);
                    }
                    if (html.indexOf('<link rel="next"') === -1) {
                        // pas de page suivante : sauter les pages restantes de cette categorie
                        while (index < tasks.length && tasks[index].slug === task.slug) {
                            index++;
                            done++;
                        }
                    }
                }
                done++;
                onProgress({ done: done, total: tasks.length, category: task.label, units: results.units.length });
            }
        }

        var workers = [];
        for (var w = 0; w < concurrency; w++) workers.push(worker());
        await Promise.all(workers);

        // Deduplication par URL (la categorie la plus specifique scrapee en premier gagne)
        var seen = {}, unique = [];
        results.units.forEach(function (unit) {
            if (!seen[unit.url]) {
                seen[unit.url] = true;
                unique.push(unit);
            }
        });

        var products = groupProducts(unique);
        products.sort(function (a, b) { return (b.savings || 0) - (a.savings || 0); });

        results.uniqueUnits = unique;
        results.products = products;
        return results;
    }

    global.CBS = {
        BASE_URL: BASE_URL,
        CONDITIONS: CONDITIONS,
        COLORS: COLORS,
        decodeEntities: decodeEntities,
        parsePrice: parsePrice,
        normalizeName: normalizeName,
        detectBrand: detectBrand,
        extractCard: extractCard,
        groupProducts: groupProducts,
        extractGalleryImages: extractGalleryImages,
        makeFetcher: makeFetcher,
        installAndroidCallback: installAndroidCallback,
        scrapeAll: scrapeAll,
    };

    if (typeof global.CBS.init === 'undefined') {
        global.CBS.init = function () { installAndroidCallback(); };
    }
})(typeof window !== 'undefined' ? window : globalThis);
