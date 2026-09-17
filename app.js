/* Coolblue Second Chance — application web + Android */
if (typeof Element !== 'undefined' && !Element.prototype.closest) {
    Element.prototype.closest = function (s) {
        let el = this;
        const matches = (el.matches || el.msMatchesSelector).bind(el);
        while (el) {
            if (matches(s)) return el;
            el = el.parentElement;
        }
        return null;
    };
}

function debounce(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

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

class SecondChanceApp {
    constructor() {
        this.allOffers = [];
        this.filtered = [];
        this.visibleCount = 0;
        this.pageSize = 24;
        this.activeCategory = 'Toutes';
        this.searchTerm = '';
        this.sortMode = 'discount';
        this.sortAsc = false;
        this.categoryQuery = '';
        this.priceMin = null;
        this.priceMax = null;
        this.condition = 'Toutes';
        this.minDiscount = 0;
        this.inStockOnly = false;
        this.brand = 'Toutes';
        this.deliveryTomorrow = false;
        this.withReviews = false;
        this.multiVariants = false;
        this.favOnly = false;
        this.newArrivals = false;
        this.notificationsOn = localStorage.getItem('cb-notif') === '1';
        this.topBrands = [];
        this.searchMatches = new Map();
        this.categoryCounts = new Map();
        this.categorySlugs = new Map();
        this._searchCache = null;
        this.favs = new Set(this.safeParse(localStorage.getItem('cb-favs'), []).map(String));
        this.priceHistory = this.safeParse(localStorage.getItem('cb-prices'), {});
        this.priceDrops = new Map();
        this.compareList = [];
        this.recentSearches = this.safeParse(localStorage.getItem('cb-recent'), []);
        this.suggestIndex = -1;
        this.carouselIdx = new Map();
        this.carouselImgs = new Map();
        this.isAndroid = !!(window.AndroidBridge);

        this.$status = document.getElementById('statusBar');
        this.$statusText = document.getElementById('statusText');
        this.$toolbar = document.getElementById('toolbar');
        this.$stats = document.getElementById('statsGrid');
        this.$chips = document.getElementById('chips');
        this.$grid = document.getElementById('offersGrid');
        this.$empty = document.getElementById('emptyState');
        this.$loadMore = document.getElementById('loadMore');
        this.$headerMeta = document.getElementById('headerMeta');
        this.$search = document.getElementById('searchInput');
        this.$suggestions = document.getElementById('suggestions');
        this.$sort = document.getElementById('sortSelect');
        this.$sortDir = document.getElementById('sortDirBtn');
        this.$condition = document.getElementById('conditionSelect');
        this.$minDiscount = document.getElementById('minDiscount');
        this.$brand = document.getElementById('brandSelect');
        this.$inStock = document.getElementById('inStock');
        this.$deliveryTomorrow = document.getElementById('deliveryTomorrow');
        this.$withReviews = document.getElementById('withReviews');
        this.$multiVariants = document.getElementById('multiVariants');
        this.$favOnly = document.getElementById('favOnly');
        this.$newArrivals = document.getElementById('newArrivals');
        this.$notifBtn = document.getElementById('notifBtn');
        this.$alerts = document.getElementById('alerts');
        this.$statsPanel = document.getElementById('statsPanel');
        this.$export = document.getElementById('exportBtn');
        this.$statsBtn = document.getElementById('statsBtn');
        this.$compareBar = document.getElementById('compareBar');
        this.$compareCount = document.getElementById('compareCount');
        this.$compareOpen = document.getElementById('compareOpenBtn');
        this.$compareClear = document.getElementById('compareClearBtn');
        this.$compareModal = document.getElementById('compareModal');
        this.$compareClose = document.getElementById('compareCloseBtn');
        this.$compareBody = document.getElementById('compareBody');
        this.$priceModal = document.getElementById('priceModal');
        this.$priceClose = document.getElementById('priceCloseBtn');
        this.$priceCanvas = document.getElementById('priceChart');
        this.$priceTitle = document.getElementById('priceTitle');
        this.$priceSummary = document.getElementById('priceSummary');
        this.$categoryPanel = document.getElementById('categoryPanel');
        this.$categoryClose = document.getElementById('categoryCloseBtn');
        this.$categorySearch = document.getElementById('categorySearch');
        this.$categoryList = document.getElementById('categoryList');
        this.$priceMin = document.getElementById('priceMin');
        this.$priceMax = document.getElementById('priceMax');
        this.$refresh = document.getElementById('refreshBtn');
        this.$update = document.getElementById('updateBtn');
        this.$rebuild = document.getElementById('rebuildBtn');
        this.$clear = document.getElementById('clearFilters');
        this.$themeToggle = document.getElementById('themeToggle');
        this.$progressWrap = document.getElementById('progressWrap');
        this.$progressBar = document.getElementById('progressBar');
        this.$progressText = document.getElementById('progressText');
        this.$resultCount = document.getElementById('resultCount');
        this.$enrichImages = document.getElementById('enrichImages');

        if (this.notificationsOn
            && typeof Notification !== 'undefined'
            && Notification.permission === 'granted') {
            this.$notifBtn.classList.add('active');
            this.$notifBtn.innerHTML = '🔔 Alertes ON';
        }

        if (this.isAndroid && window.CBS) {
            CBS.init();
            this.$rebuild.hidden = true;
        }
        this.$sync = document.getElementById('syncBtn');
        if (this.isAndroid && window.CBS && this.$sync) {
            this.$sync.hidden = true;
        }
        this.initTheme();
        try {
            this.bindEvents();
        } catch (error) {
            console.error('bindEvents:', error);
        }
        this.loadOffers();
        this.ensureCategorySlugs();
    }

    /* ---------------- Theme ---------------- */
    initTheme() {
        const saved = localStorage.getItem('cb-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.setTheme(saved || (prefersDark ? 'dark' : 'light'), false);
    }

    setTheme(theme, save = true) {
        document.documentElement.dataset.theme = theme;
        this.$themeToggle.textContent = theme === 'dark' ? '☀️ Clair' : '🌙 Sombre';
        if (save) localStorage.setItem('cb-theme', theme);
    }

    /* ---------------- Events ---------------- */
    bindEvents() {
        this.$search.addEventListener('input', debounce(() => {
            this.searchTerm = this.$search.value.trim();
            this.renderSuggestions();
            this.applyFilters();
        }, 140));

        this.$search.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.moveSuggest(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.moveSuggest(-1);
            } else if (e.key === 'Enter') {
                if (this.suggestIndex >= 0) {
                    e.preventDefault();
                    this.pickSuggestion();
                } else {
                    this.commitSearch();
                }
            } else if (e.key === 'Escape') {
                this.hideSuggestions();
            }
        });

        this.$search.addEventListener('blur', () => setTimeout(() => this.hideSuggestions(), 150));

        this.$sort.addEventListener('change', () => {
            this.sortMode = this.$sort.value;
            this.applyFilters();
        });

        this.$sortDir.addEventListener('click', () => {
            this.sortAsc = !this.sortAsc;
            this.$sortDir.textContent = this.sortAsc ? '↑' : '↓';
            this.$sortDir.title = this.sortAsc ? 'Sens du tri : croissant' : 'Sens du tri : décroissant';
            this.applyFilters();
        });

        this.$condition.addEventListener('change', () => {
            this.condition = this.$condition.value;
            this.applyFilters();
        });

        this.$brand.addEventListener('change', () => {
            this.brand = this.$brand.value;
            this.applyFilters();
        });

        this.$minDiscount.addEventListener('change', () => {
            this.minDiscount = Number(this.$minDiscount.value);
            this.applyFilters();
        });

        const bindCheck = (el, prop) => {
            el.addEventListener('change', () => {
                this[prop] = el.checked;
                this.applyFilters();
            });
        };
        bindCheck(this.$inStock, 'inStockOnly');
        bindCheck(this.$deliveryTomorrow, 'deliveryTomorrow');
        bindCheck(this.$withReviews, 'withReviews');
        bindCheck(this.$multiVariants, 'multiVariants');
        bindCheck(this.$favOnly, 'favOnly');
        bindCheck(this.$newArrivals, 'newArrivals');

        // Actions des cartes (favori / comparer / partager / graphique) via délégation
        this.$grid.addEventListener('click', (e) => {
            const carBtn = e.target.closest ? e.target.closest('.carrow') : null;
            if (carBtn) {
                this.carouselNav(carBtn.dataset.car, Number(carBtn.dataset.dir), this.$grid);
                return;
            }
            const thumb = e.target.closest ? e.target.closest('.img-thumb') : null;
            if (thumb && e.target.tagName === 'IMG') {
                this.swapCardImage(thumb, this.$grid);
                return;
            }
            const btn = e.target.closest ? e.target.closest('[data-act]') : null;
            if (!btn) return;
            const id = btn.dataset.id;
            if (btn.dataset.act === 'fav') this.toggleFav(id);
            else if (btn.dataset.act === 'cmp') this.toggleCompare(id);
            else if (btn.dataset.act === 'share') {
                const offer = this.findOffer(id);
                if (offer) this.shareOffer(offer);
            } else if (btn.dataset.act === 'chart') this.openPriceChart(id);
        });

        this.$export.addEventListener('click', () => this.exportCsv());
        this.$statsBtn.addEventListener('click', () => this.toggleStats());
        this.$notifBtn.addEventListener('click', () => this.toggleNotifications());
        this.$compareOpen.addEventListener('click', () => this.openCompare());
        this.$compareClear.addEventListener('click', () => {
            this.compareList = [];
            this.renderCompareBar();
            this.applyFilters();
        });
        this.$compareClose.addEventListener('click', () => this.closeCompare());
        this.$compareModal.addEventListener('click', (e) => {
            if (e.target === this.$compareModal) this.closeCompare();
        });
        this.$compareBody.addEventListener('click', (e) => {
            const carBtn = e.target.closest ? e.target.closest('.carrow') : null;
            if (carBtn) {
                this.carouselNav(carBtn.dataset.car, Number(carBtn.dataset.dir), this.$compareBody);
                return;
            }
            const thumb = e.target.closest ? e.target.closest('.img-thumb') : null;
            if (thumb && e.target.tagName === 'IMG') {
                this.swapCardImage(thumb, this.$compareBody);
            }
        });

        this.$priceClose.addEventListener('click', () => this.closePriceChart());
        this.$priceModal.addEventListener('click', (e) => {
            if (e.target === this.$priceModal) this.closePriceChart();
        });

        this.$categoryClose.addEventListener('click', () => this.closeCategoryPanel());
        this.$categoryPanel.addEventListener('click', (e) => {
            if (e.target === this.$categoryPanel) this.closeCategoryPanel();
        });
        this.$categorySearch.addEventListener('input', debounce(() => {
            this.categoryQuery = this.$categorySearch.value.trim();
            this.renderCategoryPanel(this.categoryQuery);
        }, 150));

        const priceChanged = () => {
            this.priceMin = this.$priceMin.value === '' ? null : Number(this.$priceMin.value);
            this.priceMax = this.$priceMax.value === '' ? null : Number(this.$priceMax.value);
            this.applyFilters();
        };

        this.$priceMin.addEventListener('input', debounce(priceChanged, 300));
        this.$priceMax.addEventListener('input', debounce(priceChanged, 300));

        this.$refresh.addEventListener('click', () => this.loadOffers(true));
        this.$update.addEventListener('click', () => this.updateData());
        this.$rebuild.addEventListener('click', () => this.rebuildApk());
        if (this.$sync) {
            this.$sync.addEventListener('click', () => this.syncGithub());
        }

        this.$clear.addEventListener('click', () => this.clearFilters());

        this.$loadMore.addEventListener('click', () => {
            this.visibleCount += this.pageSize;
            this.renderGrid();
        });

        this.$themeToggle.addEventListener('click', () => {
            const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
            this.setTheme(next);
        });
    }

    /* ---------------- Data loading ---------------- */
    async loadOffers(force) {
        this.setStatus('loading', 'Chargement des offres…');
        this.$refresh.classList.add('loading');
        try {
            let data;
            if (this.isAndroid) {
                const stored = window.AndroidBridge.loadJson();
                if (stored) {
                    data = JSON.parse(stored);
                } else {
                    data = await (await fetch('second_chance_offers.json')).json();
                }
            } else {
                data = await this.fetchJsonWithRetry(force);
            }
            if (!data.products || data.products.length === 0) {
                throw new Error('Aucun produit dans les données');
            }
            this.allOffers = data.products;
            this.normalizeOfferUrls();
            this.populateBrandSelect();
            this.afterDataLoaded();
            this.applyFilters();
            this.$toolbar.style.display = 'block';
            this.setStatus('ok', `${data.products.length} offres chargées`);
            this.renderHeaderMeta(data.metadata);
        } catch (error) {
            console.error(error);
            this.setStatus('error',
                'Impossible de charger les données. Lancez "python scraper.py" puis rechargez la page.');
            this.$toolbar.style.display = 'none';
        } finally {
            this.$refresh.classList.remove('loading');
        }
    }

    async fetchJsonWithRetry(force, attempt = 0) {
        const url = force || attempt > 0
            ? `second_chance_offers.json?t=${Date.now()}`
            : 'second_chance_offers.json';
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.json();
        } catch (error) {
            clearTimeout(timer);
            if (attempt < 1) {
                return await this.fetchJsonWithRetry(true, attempt + 1);
            }
            throw error;
        }
    }

    /* ---------------- Update (scraping intégré) ---------------- */
    async updateData() {
        this.$update.disabled = true;
        this.$rebuild.disabled = true;
        this.$refresh.disabled = true;
        this.showProgress(true, 'Préparation du scraping…');
        try {
            const [categories, brands] = await Promise.all([
                (await fetch('categories.json')).json(),
                (await fetch('brands.json')).json(),
            ]);
            const result = await CBS.scrapeAll({
                categories,
                brands,
                maxPages: 2,
                concurrency: 2,
                onProgress: (p) => this.renderProgress(p),
            });

            if (!result.products.length) {
                throw new Error('Aucun produit récupéré (sites Coolblue injoignables ?)');
            }

            if (this.$enrichImages && this.$enrichImages.checked) {
                this.showProgress(true, 'Récupération des photos produits…');
                await this.enrichProductImages(result.products, (done, total, name) => {
                    const pct = Math.round((done / total) * 100);
                    this.$progressBar.style.width = `${pct}%`;
                    this.$progressText.textContent = `Photos : ${done}/${total} — ${name}`;
                });
            }

            const data = {
                metadata: {
                    scrapedAt: new Date().toLocaleString('fr-BE'),
                    totalProducts: result.products.length,
                    totalVariants: result.uniqueUnits.length,
                    categories: categories.length,
                    source: 'coolblue.be (second-chance) — scraping intégré',
                },
                products: result.products,
            };

            if (this.isAndroid) {
                window.AndroidBridge.saveJson(JSON.stringify(data));
            } else {
                const resp = await fetch('/api/save-json', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.error || `HTTP ${resp.status}`);
                }
            }

            this.allOffers = data.products;
            this.normalizeOfferUrls();
            this.populateBrandSelect();
            this.afterDataLoaded();
            this.applyFilters();
            this.$toolbar.style.display = 'block';
            this.renderHeaderMeta(data.metadata);
            this.showProgress(false);
            this.setStatus('ok',
                `✅ Mise à jour terminée : ${data.products.length} produits (${result.uniqueUnits.length} variantes)`);
        } catch (error) {
            console.error(error);
            this.showProgress(false);
            this.setStatus('error', `Mise à jour impossible : ${error.message}`);
        } finally {
            this.$update.disabled = false;
            this.$rebuild.disabled = false;
            this.$refresh.disabled = false;
        }
    }

    renderProgress(p) {
        const pct = Math.round((p.done / p.total) * 100);
        this.$progressBar.style.width = `${pct}%`;
        this.$progressText.textContent =
            `Scraping : ${p.done}/${p.total} pages — ${p.category} — ${p.units} produits trouvés`;
    }

    /* Enrichit chaque produit avec sa galerie d'images (page produit).
       Best effort : échecs ignorés, cache localStorage par URL produit. */
    async enrichProductImages(products, onProgress) {
        const fetcher = CBS.makeFetcher();
        const cacheKey = 'cb-gallery-v1';
        let cache = {};
        try { cache = JSON.parse(localStorage.getItem(cacheKey) || '{}') || {}; } catch (e) { cache = {}; }

        let index = 0;
        let done = 0;
        let dirty = false;
        const total = products.length;
        if (!total) return;

        const worker = async () => {
            while (index < total) {
                const p = products[index++];
                let imgs = null;
                try {
                    if (cache[p.url]) {
                        imgs = cache[p.url];
                    } else {
                        const html = await fetcher(p.url);
                        imgs = CBS.extractGalleryImages(html);
                        if (imgs.length > 8) imgs = imgs.slice(0, 8);
                        if (imgs.length) {
                            cache[p.url] = imgs;
                            dirty = true;
                        }
                    }
                    if (imgs && imgs.length) {
                        const mainId = (p.imageUrl || '').match(/\/(products|secondchance)\/(\d+)$/);
                        const mainKey = mainId ? mainId[1] + '/' + mainId[2] : null;
                        const seen = {};
                        p.images = [];
                        for (const u of imgs) {
                            const m = u.match(/\/(products|secondchance)\/(\d+)$/);
                            const key = m ? m[1] + '/' + m[2] : u;
                            if (key === mainKey || seen[key]) continue;
                            seen[key] = true;
                            p.images.push(u);
                            if (p.images.length >= 8) break;
                        }
                    }
                } catch (e) { /* page inaccessible : on garde l'image principale */ }
                done++;
                if (onProgress) onProgress(done, total, p.name || '');
            }
        };

        await Promise.all([worker(), worker(), worker()]);
        if (dirty) {
            try { localStorage.setItem(cacheKey, JSON.stringify(cache)); } catch (e) { /* stockage plein : ignorer */ }
        }
    }

    /* ---------------- Rebuild APK (web uniquement) ---------------- */
    async rebuildApk() {
        this.$rebuild.disabled = true;
        this.$update.disabled = true;
        this.showProgress(true, 'Compilation de l\'APK lancée (environ 1 minute)…');
        this.setStatus('loading', 'Compilation de l\'APK en cours…');

        try {
            const resp = await fetch('/api/rebuild-apk', { method: 'POST' });
            if (resp.status === 409) {
                this.setStatus('error', 'Une compilation est déjà en cours.');
                this.showProgress(false);
                return;
            }
            for (let i = 0; i < 180; i++) {
                await this.sleep(5000);
                const st = await this.fetchStatus();
                this.renderProgress({ done: Math.min(180, i + 1), total: 180, category: 'Compilation APK', units: 0 });
                if (st.build && st.build.finished) {
                    if (st.build.ok) {
                        this.setStatus('ok', '📦 APK recompilé avec succès — transférez-le sur votre téléphone.');
                    } else {
                        this.setStatus('error', `Compilation APK échouée : ${st.build.error || 'erreur inconnue'}`);
                    }
                    this.showProgress(false);
                    return;
                }
            }
            this.setStatus('error', 'Compilation trop longue — vérifiez la console du serveur.');
        } catch (error) {
            console.error(error);
            this.setStatus('error', `Recompilation impossible : ${error.message}`);
        } finally {
            this.showProgress(false);
            this.$rebuild.disabled = false;
            this.$update.disabled = false;
        }
    }

    async syncGithub() {
        if (this.$sync) this.$sync.disabled = true;
        this.showProgress(true, 'Synchronisation vers GitHub en cours…');
        this.setStatus('loading', 'Envoi vers GitHub en cours…');

        try {
            const resp = await fetch('/api/sync-github', { method: 'POST' });
            if (resp.status === 409) {
                this.setStatus('error', 'Une synchronisation est déjà en cours.');
                this.showProgress(false);
                return;
            }
            for (let i = 0; i < 60; i++) {
                await this.sleep(5000);
                const st = await this.fetchStatus();
                this.renderProgress({ done: Math.min(60, i + 1), total: 60, category: 'Sync GitHub', units: 0 });
                if (st.sync && st.sync.finished) {
                    if (st.sync.ok) {
                        this.setStatus('ok', '✅ Projet synchronisé avec GitHub.');
                    } else {
                        this.setStatus('error', `Synchronisation GitHub échouée : ${st.sync.error || 'erreur inconnue'}`);
                    }
                    this.showProgress(false);
                    return;
                }
            }
            this.setStatus('error', 'Synchronisation trop longue — vérifiez la console du serveur.');
        } catch (error) {
            console.error(error);
            this.setStatus('error', `Synchronisation impossible : ${error.message}`);
        } finally {
            this.showProgress(false);
            if (this.$sync) this.$sync.disabled = false;
        }
    }

    async fetchStatus() {
        try {
            return await (await fetch('/api/status')).json();
        } catch {
            return { apk: {} };
        }
    }

    formatBytes(bytes) {
        if (!bytes) return '?';
        return bytes > 1048576
            ? `${(bytes / 1048576).toFixed(1)} Mo`
            : `${Math.round(bytes / 1024)} Ko`;
    }

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    showProgress(visible, text) {
        this.$progressWrap.classList.toggle('visible', visible);
        if (text) this.$progressText.textContent = text;
        if (!visible) this.$progressBar.style.width = '0%';
    }

    setStatus(kind, message) {
        this.$status.className = `status ${kind}`;
        this.$status.innerHTML = kind === 'loading' ? '<div class="spinner"></div>' : '';
        this.$statusText.textContent = message;
        this.$status.appendChild(this.$statusText);
    }

    renderHeaderMeta(metadata) {
        if (metadata && metadata.scrapedAt) {
            const cats = metadata.categories ? ` · ${metadata.categories} catégories` : '';
            this.$headerMeta.textContent = `Mise à jour : ${metadata.scrapedAt}${cats}`;
        }
    }

    /* ---------------- Filters ---------------- */
    clearFilters() {
        this.activeCategory = 'Toutes';
        this.searchTerm = '';
        this.condition = 'Toutes';
        this.minDiscount = 0;
        this.inStockOnly = false;
        this.brand = 'Toutes';
        this.deliveryTomorrow = false;
        this.withReviews = false;
        this.multiVariants = false;
        this.favOnly = false;
        this.newArrivals = false;
        this.priceMin = null;
        this.priceMax = null;
        this.searchMatches = new Map();
        this.$search.value = '';
        this.$condition.value = 'Toutes';
        this.$minDiscount.value = '0';
        this.$brand.value = 'Toutes';
        this.$inStock.checked = false;
        this.$deliveryTomorrow.checked = false;
        this.$withReviews.checked = false;
        this.$multiVariants.checked = false;
        this.$favOnly.checked = false;
        this.$newArrivals.checked = false;
        this.$priceMin.value = '';
        this.$priceMax.value = '';
        this.hideSuggestions();
        this.applyFilters();
    }

    applyFilters() {
        let list;
        if (this.searchTerm) {
            const result = this.smartSearch(this.searchTerm);
            list = result.list;
            this.searchMatches = result.matches;
        } else {
            list = this.allOffers.slice();
            this.searchMatches = new Map();
        }

        if (this.activeCategory !== 'Toutes') {
            list = list.filter((o) => o.category === this.activeCategory);
        }

        if (this.brand !== 'Toutes') {
            const top = new Set(this.topBrands);
            if (this.brand === 'Autres') {
                list = list.filter((o) => !o.brand || !top.has(o.brand));
            } else {
                list = list.filter((o) => o.brand === this.brand);
            }
        }

        if (this.condition !== 'Toutes') {
            list = list.filter((o) => o.condition === this.condition);
        }

        if (this.minDiscount > 0) {
            list = list.filter((o) => (o.discountPercent || 0) >= this.minDiscount);
        }

        if (this.inStockOnly) {
            list = list.filter((o) => (o.stockStatus || '') === 'En stock');
        }

        if (this.deliveryTomorrow) {
            list = list.filter((o) => /demain|tomorrow/i.test(o.delivery || ''));
        }

        if (this.withReviews) {
            list = list.filter((o) => (o.reviewCount || 0) > 0);
        }

        if (this.multiVariants) {
            list = list.filter((o) => (o.variantsCount || 1) > 1);
        }

        if (this.favOnly) {
            list = list.filter((o) => this.favs.has(String(o.id)));
        }

        if (this.newArrivals) {
            list = list.filter((o) => o._isNew);
        }

        if (this.priceMin !== null) {
            list = list.filter((o) => o.secondChancePrice >= this.priceMin);
        }
        if (this.priceMax !== null) {
            list = list.filter((o) => o.secondChancePrice <= this.priceMax);
        }

        switch (this.sortMode) {
            case 'savings':
                list.sort((a, b) => (b.savings || 0) - (a.savings || 0));
                break;
            case 'priceAsc':
                list.sort((a, b) => (a.secondChancePrice || 0) - (b.secondChancePrice || 0));
                break;
            case 'priceDesc':
                list.sort((a, b) => (b.secondChancePrice || 0) - (a.secondChancePrice || 0));
                break;
            case 'rating':
                list.sort((a, b) =>
                    (b.reviewScore || 0) - (a.reviewScore || 0)
                    || (b.reviewCount || 0) - (a.reviewCount || 0)
                    || (b.discountPercent || 0) - (a.discountPercent || 0));
                break;
            case 'score':
                list.sort((a, b) => (this.dealScore(b) || 0) - (this.dealScore(a) || 0));
                break;
            case 'newest':
                list.sort((a, b) =>
                    (b._firstSeen || 0) - (a._firstSeen || 0)
                    || (b.discountPercent || 0) - (a.discountPercent || 0));
                break;
            case 'discount':
            default:
                list.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
                break;
        }

        if (this.sortAsc) list.reverse();

        this.filtered = list;
        this.visibleCount = Math.min(this.pageSize, this.filtered.length);
        this.renderStats();
        this.renderChips();
        this.renderGrid();
    }

    /* ---------------- Recherche intelligente ---------------- */
    normalizeText(s) {
        const out = [];
        const t = String(s || '').toLowerCase();
        for (let i = 0; i < t.length; i++) out.push(ACCENTS[t[i]] || t[i]);
        return out.join('');
    }

    expandTerm(term) {
        const base = SYNONYMS[term];
        return base ? [term].concat(base) : [term];
    }

    levenshtein(a, b) {
        const m = a.length;
        const n = b.length;
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

    matchTerm(hay, terms) {
        // hay = { name, brand, cat, variants, words }
        const direct = (str, score) => {
            for (const t of terms) {
                if (str.indexOf(t) !== -1) return { score, term: t };
            }
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
        // préfixe de mot (ex: "galaxy" → "galaxys21") + tolérance de frappe
        for (const t of terms) {
            if (t.length < 3) continue;
            for (const w of hay.words) {
                if (w.indexOf(t) === 0 && w.length > t.length) return { score: 3, term: t };
                if (t.length >= 4 && w.length >= 4 && this.levenshtein(w, t) <= 1) return { score: 2, term: t };
            }
        }
        return { score: 0, term: null };
    }

    smartSearch(query) {
        if (this._searchCache && this._searchCache.q === query) {
            return this._searchCache;
        }
        const terms = this.normalizeText(query).split(/\s+/).filter(Boolean);
        const expanded = terms.map((t) => this.expandTerm(t));

        const score = (anyMode) => {
            const results = [];
            const matches = new Map();
            for (const offer of this.allOffers) {
                const hay = {
                    name: this.normalizeText(offer.name),
                    brand: this.normalizeText(offer.brand || ''),
                    cat: this.normalizeText(offer.category),
                    variants: (offer.variants || []).map((v) => this.normalizeText(v.name)).join(' '),
                    words: this.normalizeText(offer.name).split(/\s+/).filter((w) => w.length > 1),
                };
                let score = 0;
                let ok = true;
                const matched = [];
                for (let i = 0; i < terms.length; i++) {
                    const m = this.matchTerm(hay, expanded[i]);
                    if (m.score === 0) {
                        ok = false;
                        if (!anyMode) break;
                    } else {
                        score += m.score;
                        if (m.term) matched.push(m.term);
                    }
                }
                if (ok && score > 0) {
                    results.push({ offer, score });
                    matches.set(offer.id, matched);
                }
            }
            return { results, matches };
        };

        // d'abord AND strict (tous les mots) puis repli OR
        let { results, matches } = score(false);
        let fallback = false;
        if (!results.length) {
            const or = score(true);
            results = or.results;
            matches = or.matches;
            fallback = true;
        }
        results.sort((a, b) => b.score - a.score);
        if (fallback && results.length) {
            results = results.slice(0, 60); // repli OR : ne garder que les meilleurs
        }
        const cache = {
            q: query,
            list: results.map((r) => r.offer),
            matches,
            fallback,
        };
        this._searchCache = cache;
        return cache;
    }

    /* ---------------- Suggestions ---------------- */
    renderSuggestions() {
        const q = this.$search.value.trim();
        if (!q) {
            this.hideSuggestions();
            return;
        }
        const nq = this.normalizeText(q);
        const parts = [];

        if (this.recentSearches.length) {
            const recent = this.recentSearches.filter((r) => this.normalizeText(r).indexOf(nq) !== -1).slice(0, 3);
            if (recent.length) {
                parts.push({ head: 'Recherches récentes', icon: '🕒', items: recent.map((r) => ({ text: r, value: r })) });
            }
        }

        const brandItems = [];
        for (const b of this.topBrands) {
            if (this.normalizeText(b).indexOf(nq) !== -1) {
                const count = this.allOffers.filter((o) => o.brand === b).length;
                brandItems.push({ text: b, value: b, count, icon: '🏷️' });
            }
            if (brandItems.length >= 4) break;
        }
        if (brandItems.length) parts.push({ head: 'Marques', items: brandItems });

        const catItems = [];
        for (const [cat, count] of this.categoryCounts) {
            if (this.normalizeText(cat).indexOf(nq) !== -1) {
                catItems.push({ text: cat, value: cat, count, icon: '📁' });
            }
            if (catItems.length >= 3) break;
        }
        if (catItems.length) parts.push({ head: 'Catégories', items: catItems });

        const search = this.smartSearch(q);
        const prodItems = search.list.slice(0, 5).map((o) => ({
            text: o.name,
            value: this.$search.value.trim(),
            icon: '🛍️',
        }));
        if (prodItems.length) parts.push({ head: 'Produits', items: prodItems });

        const flat = [];
        parts.forEach((p) => {
            flat.push({ type: 'head', text: p.head });
            p.items.forEach((it) => flat.push({ type: 'item', ...it }));
        });

        this.$suggestions.innerHTML = flat.map((it, i) =>
            it.type === 'head'
                ? `<div class="s-head">${this.escapeHtml(it.text)}</div>`
                : `<button type="button" class="s-item" data-idx="${i}" data-value="${this.escapeHtml(it.value)}" data-text="${this.escapeHtml(it.text)}">
                    <span class="s-icon">${it.icon || '🔎'}</span>
                    <span class="s-text">${this.highlightText(it.text, nq)}</span>
                    ${it.count != null ? `<span class="s-count">${it.count}</span>` : ''}
                  </button>`
        ).join('');
        this.$suggestions.classList.remove('hidden');
        this.suggestIndex = -1;

        this.$suggestions.querySelectorAll('.s-item').forEach((btn) => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.pickValue(btn.dataset.value, btn.dataset.text);
            });
        });
    }

    moveSuggest(dir) {
        const items = this.$suggestions.querySelectorAll('.s-item');
        if (!items.length) return;
        this.suggestIndex = (this.suggestIndex + dir + items.length) % items.length;
        items.forEach((el, i) => {
            el.style.background = i === this.suggestIndex ? 'var(--soft)' : '';
        });
    }

    pickSuggestion() {
        const items = this.$suggestions.querySelectorAll('.s-item');
        const el = items[this.suggestIndex];
        if (el) this.pickValue(el.dataset.value, el.dataset.text);
    }

    pickValue(value, text) {
        this.$search.value = value;
        this.searchTerm = value;
        this.saveRecentSearch(text || value);
        this.hideSuggestions();
        this.applyFilters();
        this.$search.focus();
    }

    commitSearch() {
        if (!this.searchTerm) return;
        this.saveRecentSearch(this.searchTerm);
        this.hideSuggestions();
    }

    saveRecentSearch(text) {
        const list = this.recentSearches.filter((r) => r.toLowerCase() !== text.toLowerCase());
        list.unshift(text);
        this.recentSearches = list.slice(0, 6);
        localStorage.setItem('cb-recent', JSON.stringify(this.recentSearches));
    }

    hideSuggestions() {
        this.$suggestions.classList.add('hidden');
        this.$suggestions.innerHTML = '';
        this.suggestIndex = -1;
    }

    highlightText(text, nq) {
        const esc = this.escapeHtml(text);
        const norm = this.normalizeText(text);
        const idx = norm.indexOf(nq);
        if (idx === -1) return esc;
        return `${esc.slice(0, idx)}<mark>${esc.slice(idx, idx + nq.length)}</mark>${esc.slice(idx + nq.length)}`;
    }

    populateBrandSelect() {
        const counts = new Map();
        const catCounts = new Map();
        for (const o of this.allOffers) {
            const b = o.brand;
            if (b) counts.set(b, (counts.get(b) || 0) + 1);
            catCounts.set(o.category, (catCounts.get(o.category) || 0) + 1);
        }
        this.categoryCounts = catCounts;
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
        this.topBrands = top.map(([b]) => b);
        this._searchCache = null;
        this.$brand.innerHTML = '<option value="Toutes">Toutes les marques</option>'
            + top.map(([b, c]) => `<option value="${this.escapeHtml(b)}">${this.escapeHtml(b)} (${c})</option>`).join('')
            + '<option value="Autres">Autres / sans marque</option>';
    }

    /* ---------------- Helpers ---------------- */
    safeParse(raw, fallback) {
        try {
            const v = JSON.parse(raw);
            return v === null || v === undefined ? fallback : v;
        } catch {
            return fallback;
        }
    }

    findOffer(id) {
        return this.allOffers.find((o) => String(o.id) === String(id)) || null;
    }

    toast(message) {
        const el = document.createElement('div');
        el.textContent = message;
        el.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);' +
            'background:#232323;color:#fff;padding:10px 18px;border-radius:999px;font-size:0.9rem;' +
            'z-index:200;box-shadow:0 8px 24px rgba(0,0,0,0.3);opacity:0;transition:opacity .25s;';
        document.body.appendChild(el);
        const raf = window.requestAnimationFrame || ((cb) => setTimeout(cb, 16));
        raf(() => { el.style.opacity = '1'; });
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }, 2200);
    }

    /* ---------------- Favoris + suivi des prix ---------------- */
    normalizeOfferUrls() {
        const fix = (u) => u
            .replace('/en/product-second-chance/', '/fr/deuxieme-chance-produit/')
            .replace('/fr/product-second-chance/', '/fr/deuxieme-chance-produit/');
        for (const offer of this.allOffers) {
            if (offer.url) offer.url = fix(offer.url);
            if (Array.isArray(offer.variants)) {
                for (const v of offer.variants) {
                    if (v.url) v.url = fix(v.url);
                }
            }
        }
    }

    afterDataLoaded() {
        this.recordPrices();
        this.computePriceDrops();
        this.markNewArrivals();
        this.notifyWebDrops();
        this.persistWatchlist();
        this.renderCompareBar();
    }

    /* ---------------- Score « meilleures affaires » ---------------- */
    dealScore(offer) {
        if (offer._score !== undefined) return offer._score;
        const pct = Number(offer.discountPercent || 0);
        const newP = Number(offer.newPrice || 0);
        const rel = newP > 0 ? (Number(offer.savings || 0) / newP) : 0;
        const rev = Number(offer.reviewScore || 0);
        const stock = (offer.stockStatus || '') === 'En stock' ? 8 : 0;
        offer._score = Math.round(pct + rel * 50 + rev + stock);
        return offer._score;
    }

    /* ---------------- Nouveautés ---------------- */
    markNewArrivals() {
        let seen = {};
        try {
            seen = this.safeParse(localStorage.getItem('cb-seen'), {});
        } catch (e) { /* ignore */ }
        const seeded = localStorage.getItem('cb-seen-seeded') === '1';
        const now = Date.now();
        const week = 7 * 24 * 3600 * 1000;
        const seedOffset = week + 24 * 3600 * 1000;
        for (const offer of this.allOffers) {
            const id = String(offer.id);
            let first = seen[id];
            if (first === undefined) {
                first = seeded ? now : now - seedOffset;
                seen[id] = first;
            }
            offer._firstSeen = first;
            offer._isNew = seeded && (now - first < week);
        }
        if (!seeded) localStorage.setItem('cb-seen-seeded', '1');
        try {
            localStorage.setItem('cb-seen', JSON.stringify(seen));
        } catch (e) { /* quota plein : ignore */ }
    }

    /* ---------------- Notifications web ---------------- */
    toggleNotifications() {
        if (!('Notification' in window)) {
            this.toast('Les notifications ne sont pas supportées ici');
            return;
        }
        if (this.notificationsOn) {
            this.notificationsOn = false;
            localStorage.setItem('cb-notif', '0');
            this.$notifBtn.classList.remove('active');
            this.$notifBtn.innerHTML = '🔔 Alertes';
            this.toast('Notifications désactivées');
            return;
        }
        if (Notification.permission === 'granted') {
            this.notificationsOn = true;
            localStorage.setItem('cb-notif', '1');
            this.$notifBtn.classList.add('active');
            this.$notifBtn.innerHTML = '🔔 Alertes ON';
            this.toast('Notifications activées');
            this.notifyWebDrops();
        } else if (Notification.permission === 'default') {
            Notification.requestPermission().then((perm) => {
                if (perm === 'granted') {
                    this.notificationsOn = true;
                    localStorage.setItem('cb-notif', '1');
                    this.$notifBtn.classList.add('active');
                    this.$notifBtn.innerHTML = '🔔 Alertes ON';
                    this.toast('Notifications activées 🎉');
                } else {
                    this.toast('Notifications refusées par le navigateur');
                }
            });
        } else {
            this.toast('Notifications bloquées — autorisez-les dans les réglages du navigateur');
        }
    }

    notifyWebDrops() {
        if (this.priceDrops.size === 0) return;
        if (typeof Notification === 'undefined') return;
        if (Notification.permission !== 'granted') return;
        if (!this.notificationsOn) return;
        const drops = Array.from(this.priceDrops.values()).slice(0, 5);
        const title = drops.length > 1
            ? `${drops.length} favoris en baisse de prix 📉`
            : 'Un favori en baisse de prix 📉';
        const body = drops.map((d) => `−${d.amount.toFixed(2)} € · ${d.name}`).join('\n');
        try {
            new Notification(title, { body });
        } catch (e) { /* ignore */ }
    }

    /* ---------------- Graphique d'historique de prix ---------------- */
    openPriceChart(id) {
        const offer = this.findOffer(id);
        if (!offer) return;
        const hist = (this.priceHistory[String(id)] || []).filter((h) => Number(h.p) > 0);
        this.$priceTitle.textContent = offer.name;
        if (hist.length < 2) {
            this.$priceSummary.textContent = 'Pas encore d\'historique : le prix sera suivi au fil des mises à jour.';
            this.renderPriceChart(offer, hist);
            this.$priceModal.classList.remove('hidden');
            return;
        }
        const first = hist[0].p;
        const last = hist[hist.length - 1].p;
        const min = Math.min(...hist.map((h) => h.p));
        const max = Math.max(...hist.map((h) => h.p));
        const drop = last < first ? `📉 Baisse de ${(first - last).toFixed(2)} € (−${(((first - last) / first) * 100).toFixed(1)} %)` : '📈 Prix stable ou en hausse';
        this.$priceSummary.innerHTML =
            `<span>Premier prix : <b>${first.toFixed(2)} €</b></span>
             <span>Minimum : <b>${min.toFixed(2)} €</b></span>
             <span>Maximum : <b>${max.toFixed(2)} €</b></span>
             <span>Actuel : <b>${last.toFixed(2)} €</b></span>
             <span class="chart-drop">${drop}</span>`;
        this.renderPriceChart(offer, hist);
        this.$priceModal.classList.remove('hidden');
    }

    closePriceChart() {
        this.$priceModal.classList.add('hidden');
    }

    renderPriceChart(offer, hist) {
        const canvas = this.$priceCanvas;
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = (window.devicePixelRatio || 1);
        const w = canvas.clientWidth || canvas.parentNode.clientWidth || 600;
        const h = canvas.clientHeight || 240;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        const padL = 52, padR = 14, padT = 16, padB = 26;
        const cw = w - padL - padR;
        const ch = h - padT - padB;
        if (cw <= 10 || ch <= 10) return;

        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        let min = Math.min(...hist.map((h) => h.p));
        let max = Math.max(...hist.map((h) => h.p));
        if (min === max) { min -= 5; max += 5; }
        const range = max - min;
        min -= range * 0.08;
        max += range * 0.08;
        const y = (p) => padT + ch - ((p - min) / (max - min)) * ch;

        const ticks = 5;
        for (let i = 0; i <= ticks; i++) {
            const p = min + ((max - min) / ticks) * i;
            const yy = y(p);
            ctx.strokeStyle = 'rgba(128,128,128,0.18)';
            ctx.beginPath();
            ctx.moveTo(padL, yy);
            ctx.lineTo(w - padR, yy);
            ctx.stroke();
            ctx.fillStyle = '#999';
            ctx.fillText(p.toFixed(0) + ' €', padL - 6, yy);
        }

        const t0 = hist[0].t;
        const t1 = hist[hist.length - 1].t;
        const span = Math.max(1, t1 - t0);
        const x = (h) => padL + ((h.t - t0) / span) * cw;

        const pts = hist.map((h) => [x(h), y(h.p)]);

        ctx.strokeStyle = 'rgba(0,144,227,0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], ch + padT);
        for (const p of pts) ctx.lineTo(p[0], p[1]);
        ctx.lineTo(pts[pts.length - 1][0], ch + padT);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0,144,227,0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,144,227,0.18)';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts) ctx.lineTo(p[0], p[1]);
        ctx.strokeStyle = '#0090e3';
        ctx.lineWidth = 2;
        ctx.stroke();

        for (const p of pts) {
            ctx.beginPath();
            ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
            ctx.fillStyle = '#0090e3';
            ctx.fill();
        }

        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        if (hist.length > 1) {
            const fmt = new Date(t0).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' });
            const fmt2 = new Date(t1).toLocaleDateString('fr-BE', { day: 'numeric', month: 'short' });
            ctx.fillText(fmt, padL, h - 8);
            ctx.fillText(fmt2, w - padR, h - 8);
        }
    }

    recordPrices() {
        const now = Date.now();
        let changed = false;
        for (const offer of this.allOffers) {
            const id = String(offer.id);
            const price = Number(offer.secondChancePrice || 0);
            const hist = this.priceHistory[id] || [];
            const last = hist.length ? hist[hist.length - 1].p : null;
            if (last === null || Math.abs(last - price) > 0.001) {
                hist.push({ t: now, p: price });
                if (hist.length > 60) hist.shift();
                this.priceHistory[id] = hist;
                changed = true;
            }
        }
        if (changed) {
            try {
                localStorage.setItem('cb-prices', JSON.stringify(this.priceHistory));
            } catch (e) { /* quota plein : ignore */ }
        }
    }

    computePriceDrops() {
        this.priceDrops = new Map();
        for (const id of this.favs) {
            const offer = this.findOffer(id);
            if (!offer) continue;
            const hist = this.priceHistory[id];
            if (!hist || hist.length < 2) continue;
            const current = Number(offer.secondChancePrice || 0);
            let baseline = null;
            for (let i = 0; i < hist.length - 1; i++) {
                if (baseline === null || hist[i].p < baseline) baseline = hist[i].p;
            }
            if (baseline !== null && current < baseline) {
                this.priceDrops.set(id, {
                    amount: baseline - current,
                    pct: (baseline - current) / baseline * 100,
                });
            }
        }
    }

    priceDropFor(id) {
        return this.priceDrops.get(String(id)) || null;
    }

    toggleFav(id) {
        id = String(id);
        if (this.favs.has(id)) {
            this.favs.delete(id);
            this.toast('Retiré des favoris');
        } else {
            this.favs.add(id);
            const offer = this.findOffer(id);
            this.toast(offer ? `⭐ ${offer.name.slice(0, 40)}… ajouté aux favoris` : '⭐ Ajouté aux favoris');
        }
        try {
            localStorage.setItem('cb-favs', JSON.stringify([...this.favs]));
        } catch (e) { /* ignore */ }
        this.persistWatchlist();
        this.computePriceDrops();
        this.applyFilters();
        this.showAlerts();
    }

    isFav(id) {
        return this.favs.has(String(id));
    }

    persistWatchlist() {
        if (!this.isAndroid || !this.favs.size) return;
        const list = [];
        for (const id of this.favs) {
            const offer = this.findOffer(id);
            if (offer) list.push({ id, name: offer.name, url: offer.url, price: offer.secondChancePrice });
        }
        window.AndroidBridge.saveWatchlist(JSON.stringify(list));
    }

    showAlerts() {
        const drops = [];
        for (const [id, d] of this.priceDrops) {
            const offer = this.findOffer(id);
            if (offer) drops.push({ offer, drop: d });
        }
        if (!drops.length) {
            this.hideAlerts();
            return;
        }
        const total = drops.reduce((s, x) => s + x.drop.amount, 0);
        this.$alerts.classList.remove('hidden');
        this.$alerts.innerHTML = `
            <span>📉 ${drops.length} favori${drops.length > 1 ? 's' : ''} en baisse de prix
            (${total.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € d'économie cumulée)</span>
            <button type="button" id="alertsClose" title="Fermer">✕</button>`;
        const closeBtn = this.$alerts.querySelector('#alertsClose');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hideAlerts());
    }

    hideAlerts() {
        this.$alerts.classList.add('hidden');
        this.$alerts.innerHTML = '';
    }

    /* ---------------- Comparateur ---------------- */
    toggleCompare(id) {
        id = String(id);
        const idx = this.compareList.indexOf(id);
        if (idx !== -1) {
            this.compareList.splice(idx, 1);
            this.toast('Retiré de la comparaison');
        } else {
            if (this.compareList.length >= 4) {
                this.toast('Comparateur plein (4 produits maximum)');
                return;
            }
            this.compareList.push(id);
            this.toast('Ajouté à la comparaison');
        }
        this.renderCompareBar();
        this.applyFilters();
    }

    renderCompareBar() {
        this.$compareBar.classList.toggle('hidden', this.compareList.length === 0);
        this.$compareCount.textContent = `${this.compareList.length} produit${this.compareList.length > 1 ? 's' : ''}`;
    }

    openCompare() {
        if (!this.compareList.length) return;
        this.renderCompareTable();
        this.$compareModal.classList.remove('hidden');
    }

    closeCompare() {
        this.$compareModal.classList.add('hidden');
    }

    renderCompareTable() {
        const offers = this.compareList.map((id) => this.findOffer(id)).filter(Boolean);
        if (!offers.length) return;
        const imgHtml = (o) => {
            const imgs = this.carouselImages(o);
            const cid = String(o.id);
            this.carouselImgs.set(cid, imgs);
            const arrows = imgs.length > 1
                ? `<button class="carrow prev" data-car="${cid}" data-dir="-1" aria-label="Photo précédente">‹</button>
                   <button class="carrow next" data-car="${cid}" data-dir="1" aria-label="Photo suivante">›</button>
                   <span class="ccount" data-countfor="${cid}">1/${imgs.length}</span>`
                : '';
            const others = imgs.slice(1);
            const thumbs = others.length
                ? `<div class="img-thumbs">${others.map((u) => `<img class="img-thumb" src="${this.escapeHtml(u)}" data-big="${this.escapeHtml(u)}" loading="lazy" alt="">`).join('')}</div>`
                : '';
            return `<div class="carousel"><img class="cmp-main-img" data-carimg="${cid}" src="${this.escapeHtml(imgs[0])}" alt="" loading="lazy">${arrows}</div>${thumbs}`;
        };
        const rows = [
            ['Photos', imgHtml],
            ['Produit', (o) => `<div class="p-name">${this.escapeHtml(o.name)}</div>`],
            ['Marque', (o) => this.escapeHtml(o.brand || '—')],
            ['Catégorie', (o) => this.escapeHtml(o.category)],
            ['Type', (o) => this.escapeHtml(o.type || 'Second Chance')],
            ['État', (o) => this.escapeHtml(o.condition || '—')],
            ['Prix Second Chance', (o) => `<span class="p-price">${Number(o.secondChancePrice || 0).toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>`],
            ['Prix neuf', (o) => `${Number(o.newPrice || 0).toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`],
            ['Remise', (o) => `<span class="p-disc">−${Number(o.discountPercent || 0).toFixed(1)} %</span>`],
            ['Économie', (o) => `<span class="p-disc">−${Number(o.savings || 0).toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>`],
            ['Stock', (o) => this.escapeHtml(o.stockStatus || '—')],
            ['Livraison', (o) => this.escapeHtml(o.delivery || '—')],
            ['Avis', (o) => o.reviewCount > 0 ? `${o.reviewScore.toFixed(1)}/10 (${o.reviewCount} avis)` : 'Aucun'],
            ['Variantes', (o) => String(o.variantsCount || 1)],
            ['Photos', (o) => String((o.images || []).length || 1)],
            ['Lien', (o) => `<a href="${this.escapeHtml(o.url)}" target="_blank" rel="noopener nofollow">Voir sur Coolblue ↗</a>`],
        ];
        this.$compareBody.innerHTML = `
            <table class="compare-table">
                <thead><tr><th></th>${offers.map(() => '<th></th>').join('')}</tr></thead>
                <tbody>
                    ${rows.map(([label, fn]) => `
                        <tr><th>${label}</th>${offers.map((o) => `<td>${fn(o)}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>`;
    }

    /* ---------------- Export CSV + partage ---------------- */
    exportCsv() {
        if (!this.filtered.length) {
            this.toast('Aucun résultat à exporter');
            return;
        }
        const header = ['Produit', 'Marque', 'Catégorie', 'État', 'Prix Second Chance', 'Prix neuf',
            'Remise %', 'Économie €', 'Stock', 'Livraison', 'Note', 'Avis', 'Lien'];
        const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
        const lines = [header.join(';')];
        for (const o of this.filtered) {
            lines.push([
                o.name, o.brand || '', o.category, o.condition || '',
                o.secondChancePrice, o.newPrice,
                (o.discountPercent || 0).toFixed(1), (o.savings || 0).toFixed(2),
                o.stockStatus || '', o.delivery || '',
                o.reviewScore || '', o.reviewCount || 0, o.url,
            ].map(esc).join(';'));
        }
        const csv = '\uFEFF' + lines.join('\r\n'); // BOM pour Excel
        const filename = `coolblue-second-chance_${new Date().toISOString().slice(0, 10)}.csv`;
        if (this.isAndroid && window.AndroidBridge.shareText) {
            window.AndroidBridge.shareText(`Export Second Chance (${this.filtered.length} produits)`, csv);
            this.toast('Partage CSV lancé');
            return;
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(a.href);
            a.remove();
        }, 200);
        this.toast(`CSV exporté (${this.filtered.length} produits)`);
    }

    shareOffer(offer) {
        const text = `${offer.name} — ${Number(offer.secondChancePrice || 0).toFixed(2)} € au lieu de ${Number(offer.newPrice || 0).toFixed(2)} € (−${(offer.discountPercent || 0).toFixed(1)} %)\n${offer.url}`;
        if (this.isAndroid && window.AndroidBridge.shareText) {
            window.AndroidBridge.shareText(offer.name, text);
            return;
        }
        if (navigator.share) {
            navigator.share({ title: offer.name, text }).catch(() => {});
            return;
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(
                () => this.toast('Lien copié dans le presse-papiers'),
                () => this.toast(text)
            );
        } else {
            this.toast(text);
        }
    }

    /* ---------------- Statistiques ---------------- */
    toggleStats() {
        const hidden = this.$statsPanel.classList.contains('hidden');
        this.$statsPanel.classList.toggle('hidden');
        this.$statsBtn.classList.toggle('active');
        if (hidden) this.renderStatsPanel();
    }

    renderStatsPanel() {
        const counts = new Map();
        for (const o of this.allOffers) {
            const b = o.brand || 'Sans marque';
            counts.set(b, (counts.get(b) || 0) + 1);
        }
        const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
        const maxBrand = sorted.length ? sorted[0][1] : 1;
        const topBrandsList = sorted.slice(0, 8);

        const cats = [...this.categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
        const maxCat = cats.length ? cats[0][1] : 1;

        const conds = new Map();
        for (const o of this.allOffers) conds.set(o.condition || '—', (conds.get(o.condition || '—') || 0) + 1);
        const maxCond = Math.max(1, ...[...conds.values()]);

        const bar = (label, value, max) => `
            <div class="bar-row">
                <span class="lbl" title="${this.escapeHtml(label)}">${this.escapeHtml(label)}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, value / max * 100)}%"></div></div>
                <span class="val">${value}</span>
            </div>`;

        this.$statsPanel.innerHTML = `
            <h3>📊 Statistiques (${this.allOffers.length} produits)</h3>
            <div class="stats-grid">
                <div class="stat-chart">
                    <h4>Top marques</h4>
                    ${topBrandsList.map(([b, c]) => bar(b, c, maxBrand)).join('')}
                </div>
                <div class="stat-chart">
                    <h4>Top catégories</h4>
                    ${cats.map(([c, n]) => bar(c, n, maxCat)).join('')}
                </div>
                <div class="stat-chart">
                    <h4>État des produits</h4>
                    ${[...conds.entries()].map(([c, n]) => bar(c, n, maxCond)).join('')}
                </div>
            </div>`;
    }

    /* ---------------- Rendering ---------------- */
    renderStats() {
        const shown = this.filtered.length;

        const avgDiscount = shown
            ? (this.filtered.reduce((s, o) => s + (o.discountPercent || 0), 0) / shown).toFixed(1)
            : 0;
        const totalSavings = this.filtered.reduce((s, o) => s + (o.savings || 0), 0);
        const avgPrice = shown
            ? (this.filtered.reduce((s, o) => s + (o.secondChancePrice || 0), 0) / shown).toFixed(0)
            : 0;
        const totalVariants = this.filtered.reduce((s, o) => s + (o.variantsCount || 1), 0);
        const inStock = this.filtered.filter((o) => (o.stockStatus || '') === 'En stock').length;

        this.$stats.style.display = 'grid';
        this.$stats.innerHTML = `
            <div class="stat-card">
                <div class="value">${shown}</div>
                <div class="label">Produits affichés</div>
            </div>
            <div class="stat-card">
                <div class="value green">−${avgDiscount}%</div>
                <div class="label">Remise moyenne</div>
            </div>
            <div class="stat-card">
                <div class="value red">−${Math.round(totalSavings).toLocaleString('fr-BE')} €</div>
                <div class="label">Économie totale</div>
            </div>
            <div class="stat-card">
                <div class="value">${Number(avgPrice).toLocaleString('fr-BE')} €</div>
                <div class="label">Prix moyen</div>
            </div>
            <div class="stat-card">
                <div class="value">${totalVariants}</div>
                <div class="label">Variantes totales</div>
            </div>
            <div class="stat-card">
                <div class="value green">${inStock}</div>
                <div class="label">En stock</div>
            </div>
        `;
    }

    renderChips() {
        const counts = this.categoryCounts;
        const sorted = [...counts.keys()].sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0));
        const top = sorted.slice(0, 8);
        const active = this.activeCategory;

        this.$chips.innerHTML = `
            <button class="chip ${active === 'Toutes' ? 'active' : ''}" data-cat="Toutes">Toutes les offres</button>
            ${top.map((cat) => `
                <button class="chip ${cat === active ? 'active' : ''}" data-cat="${this.escapeHtml(cat)}">
                    ${this.escapeHtml(cat)} <small>(${counts.get(cat)})</small>
                </button>
            `).join('')}
            <button class="chip menu" id="categoryMenuBtn">🗂️ ${active === 'Toutes' ? 'Menu catégories' : this.escapeHtml(active)}</button>
        `;

        this.$chips.querySelectorAll('.chip[data-cat]').forEach((chip) => {
            chip.addEventListener('click', () => {
                this.activeCategory = chip.dataset.cat;
                this.applyFilters();
            });
        });
        const menuBtn = this.$chips.querySelector('#categoryMenuBtn');
        if (menuBtn) menuBtn.addEventListener('click', () => this.openCategoryPanel());
    }

    /* ---------------- Menu catégories (groupé) ---------------- */
    async ensureCategorySlugs() {
        if (this.categorySlugs.size > 0) return;
        try {
            const categories = await (await fetch('categories.json')).json();
            this.categorySlugs = this.buildCategorySlugs(categories);
        } catch (error) {
            console.warn('categories.json indisponible — regroupement par libellé', error);
        }
    }

    buildCategorySlugs(categories) {
        return new Map(categories.map((c) => [c.label, c.slug]));
    }

    categoryGroup(label, slug) {
        const t = ((label || '') + ' ' + (slug || '')).toLowerCase();
        if (/(smartphone|mobile-phone|smartwatch|tablet)/.test(t)) return 'Téléphonie & Tablettes';
        if (/(fridge|freezer|dishwasher|washing|dryer|microwave|espresso|coffee|range-hood|cooktop|oven|airfryer|deep-fryer|blender|smoothie|juicer|toaster|kettle|sous-vide|food-processor|pressure-cooker|multicooker|kitchen|cooler|meat-grinder|hand-mixer|stand-mixer|mixer)/.test(t)) return 'Électroménager & Cuisine';
        if (/(laptop|desktop|monitor|processor|ssd|memory-card|hard-drive|usb|charger|keyboard|printer|webcam|wifi|network|computer-accessor|laptop-accessor|powerbank|cable)/.test(t)) return 'Informatique';
        if (/(television|projector|smart-tv)/.test(t)) return 'TV & Image';
        if (/(headphone|earphone|gaming-headset|speaker|soundbar|cinema|receiver|cd-player|dvd|microphone|audio|dj-gear|dj-controller|turntable|streaming)/.test(t)) return 'Audio';
        if (/(gaming|nintendo|playstation|lego|virtual-reality)/.test(t)) return 'Gaming';
        if (/(smart-plug|smart-home|thermostat|doorbell|security-camera|nest|baby-monitor)/.test(t)) return 'Smart Home & Sécurité';
        if (/(vacuum|carpet|window-cleaner|humidifier|dehumidifier|steam|iron|air-purifier|fan)/.test(t)) return 'Maison & Air';
        if (/(trimmer|epilator|personal-care|hair-removal)/.test(t)) return 'Beauté & Santé';
        if (/(camera|lens|tripod|drone|camcorder)/.test(t)) return 'Photo & Caméras';
        if (/(drill)/.test(t)) return 'Outils & Bricolage';
        if (/(sports|garden|outdoor|barbecue)/.test(t)) return 'Loisirs & Extérieur';
        return 'Autres';
    }

    async openCategoryPanel() {
        await this.ensureCategorySlugs();
        this.renderCategoryPanel(this.categoryQuery);
        this.$categoryPanel.classList.remove('hidden');
        this.$categorySearch.value = this.categoryQuery || '';
        setTimeout(() => { try { this.$categorySearch.focus(); } catch (e) { /* ignore */ } }, 10);
    }

    closeCategoryPanel() {
        this.$categoryPanel.classList.add('hidden');
    }

    async renderCategoryPanel(q) {
        await this.ensureCategorySlugs();
        const counts = this.categoryCounts;
        const groups = new Map();
        for (const cat of counts.keys()) {
            const g = this.categoryGroup(cat, this.categorySlugs.get(cat) || cat);
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g).push(cat);
        }
        const qn = this.normalizeText(q || '');
        let html = '';
        const entries = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
        for (const [group, cats] of entries) {
            const list = cats
                .filter((c) => !qn || this.normalizeText(c).indexOf(qn) !== -1)
                .sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0));
            if (!list.length) continue;
            const gCount = list.reduce((s, c) => s + (counts.get(c) || 0), 0);
            html += `<div class="cat-group-title">${this.escapeHtml(group)} <small>${list.length} catégories · ${gCount} offres</small></div>`;
            html += list.map((cat) => `
                <button class="cat-item ${cat === this.activeCategory ? 'active' : ''}" data-cat="${this.escapeHtml(cat)}">
                    <span>${this.escapeHtml(cat)}</span> <small>${counts.get(cat)}</small>
                </button>
            `).join('');
        }
        if (!html) html = '<div class="empty"><p>Aucune catégorie trouvée.</p></div>';
        this.$categoryList.innerHTML = html;

        this.$categoryList.querySelectorAll('.cat-item').forEach((el) => {
            el.addEventListener('click', () => {
                this.activeCategory = el.dataset.cat;
                this.closeCategoryPanel();
                this.applyFilters();
            });
        });
    }

    renderGrid() {
        this.$grid.innerHTML = '';
        this.$empty.style.display = this.filtered.length === 0 ? 'block' : 'none';

        if (this.$resultCount) {
            const n = this.filtered.length;
            this.$resultCount.textContent = `${n.toLocaleString('fr-BE')} résultat${n > 1 ? 's' : ''}`;
        }

        const slice = this.filtered.slice(0, this.visibleCount);
        for (const offer of slice) {
            this.$grid.appendChild(this.buildCard(offer));
        }

        const hasMore = this.visibleCount < this.filtered.length;
        this.$loadMore.classList.toggle('hidden', !hasMore);
        this.$loadMore.textContent = hasMore
            ? `Afficher plus d'offres (${this.visibleCount} / ${this.filtered.length})`
            : '';
    }

    buildCard(offer) {
        const card = document.createElement('div');
        card.className = 'offer-card';

        const imageUrl = offer.imageUrl || 'https://via.placeholder.com/400x190?text=Photo+indisponible';
        const conditionClass = (offer.condition || '').toLowerCase().includes('damaged')
            ? 'damaged'
            : '';
        const priceNew = Number(offer.newPrice || 0).toLocaleString('fr-BE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        const priceSC = Number(offer.secondChancePrice || 0).toLocaleString('fr-BE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        const discount = Number(offer.discountPercent || 0).toFixed(1);
        const savings = Number(offer.savings || 0).toLocaleString('fr-BE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        const stockStatus = offer.stockStatus || '';
        const stockOut = stockStatus.toLowerCase().includes('rupture')
            || stockStatus.toLowerCase().includes('plus');

        const ratingHtml = offer.reviewCount > 0
            ? `<div class="rating"><span class="stars">${this.stars(offer.reviewScore)}</span>
                <b>${offer.reviewScore.toFixed(1)}</b> (${offer.reviewCount} avis)</div>`
            : '<div class="rating">Aucun avis pour l\'instant</div>';

        const variantsHtml = offer.variantsCount > 1
            ? `<span class="variants-badge">⚡ ${offer.variantsCount} variantes</span>`
            : '';

        const deliveryHtml = offer.delivery
            ? `<div class="stock ${stockOut ? 'out' : ''}">${this.escapeHtml(stockStatus)} · ${this.escapeHtml(offer.delivery)}</div>`
            : `<div class="stock ${stockOut ? 'out' : ''}">${this.escapeHtml(stockStatus)}</div>`;

        const nameHtml = this.highlightSearchName(offer);
        const brandHtml = offer.brand
            ? `<div class="brand-tag">${this.escapeHtml(offer.brand)}</div>`
            : '';

        const id = String(offer.id);
        const imgs = this.carouselImages(offer);
        this.carouselImgs.set(id, imgs);
        const carouselCtrl = imgs.length > 1
            ? `<button class="carrow prev" data-car="${id}" data-dir="-1" aria-label="Photo précédente">‹</button>
               <button class="carrow next" data-car="${id}" data-dir="1" aria-label="Photo suivante">›</button>
               <span class="ccount" data-countfor="${id}">1/${imgs.length}</span>`
            : '';
        const isFav = this.favs.has(id);
        const inCompare = this.compareList.indexOf(id) !== -1;
        const drop = this.priceDropFor(id);
        const dropHtml = drop
            ? `<div class="price-drop">📉 Prix en baisse : −${drop.amount.toLocaleString('fr-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € (−${drop.pct.toFixed(1)} %)</div>`
            : '';
        const newBadge = offer._isNew
            ? '<span class="new-badge">🆕 Nouveau</span>'
            : '';
        const scoreBadge = this.dealScore(offer) > 0
            ? `<span class="deal-score" title="Score « meilleures affaires »">🔥 ${this.dealScore(offer)}</span>`
            : '';

        const others = (offer.images || []).filter((u) => u !== imageUrl).slice(0, 5);
        const thumbsHtml = others.length
            ? `<div class="img-thumbs">${others.map((u) => `<img class="img-thumb" src="${this.escapeHtml(u)}" data-big="${this.escapeHtml(u)}" loading="lazy" alt="">`).join('')}</div>`
            : '';

        card.innerHTML = `
            <div class="card-image">
                <span class="discount-badge">-${discount}%</span>
                ${newBadge}
                ${scoreBadge}
                ${variantsHtml}
                <div class="carousel">
                    <img class="card-main-img" data-carimg="${id}" src="${this.escapeHtml(imgs[0])}" alt="${this.escapeHtml(offer.name)}" loading="lazy">
                    ${carouselCtrl}
                </div>
            </div>
            ${thumbsHtml}
            <div class="card-body">
                <div class="category-tag">${this.escapeHtml(offer.category)}</div>
                ${brandHtml}
                <div class="product-name">${nameHtml}</div>
                <div class="condition ${conditionClass}">
                    <span class="dot"></span> ${this.escapeHtml(offer.condition)}
                </div>
                ${ratingHtml}
                <div class="price-block">
                    <div class="price-old">${priceNew} €</div>
                    <div class="price-new">${priceSC} <span class="cur">€</span></div>
                    <div class="savings">💡 Vous économisez ${savings} €</div>
                </div>
                ${dropHtml}
                ${deliveryHtml}
            </div>
            <div class="card-footer">
                <div class="card-actions">
                    <button class="action-btn fav ${isFav ? 'active' : ''}" data-act="fav" data-id="${id}" title="Ajouter aux favoris">
                        ${isFav ? '★' : '☆'} Favori
                    </button>
                    <button class="action-btn cmp ${inCompare ? 'active' : ''}" data-act="cmp" data-id="${id}" title="Comparer">
                        🆚 Comparer
                    </button>
                    <button class="action-btn chart" data-act="chart" data-id="${id}" title="Historique des prix">
                        📈 Historique
                    </button>
                    <button class="action-btn share" data-act="share" data-id="${id}" title="Partager">
                        ↗ Partager
                    </button>
                </div>
                <a class="buy-btn" href="${this.escapeHtml(offer.url)}" target="_blank" rel="noopener nofollow">
                    Voir sur Coolblue →
                </a>
            </div>
        `;

        return card;
    }

    carouselImages(offer) {
        const main = offer.imageUrl || 'https://via.placeholder.com/400x190?text=Photo+indisponible';
        const imgs = [main].concat((offer.images || []).filter((u) => u && u !== main));
        const unique = [];
        const seen = new Set();
        for (const u of imgs) {
            if (!seen.has(u)) {
                seen.add(u);
                unique.push(u);
            }
        }
        return unique.slice(0, 8);
    }

    carouselNav(id, dir, container) {
        const imgs = this.carouselImgs.get(id);
        if (!imgs || imgs.length < 2) return;
        let idx = (this.carouselIdx.get(id) || 0) + dir;
        idx = (idx + imgs.length) % imgs.length;
        this.carouselIdx.set(id, idx);
        const scope = container || document;
        const img = scope.querySelector(`[data-carimg="${id}"]`);
        if (img) img.src = imgs[idx];
        const count = scope.querySelector(`[data-countfor="${id}"]`);
        if (count) count.textContent = `${idx + 1}/${imgs.length}`;
    }

    swapCardImage(thumb, container) {
        const big = thumb.dataset.big;
        if (!big) return;
        let mainImg = null;
        if (container.querySelector) mainImg = container.querySelector('.card-main-img, .cmp-main-img');
        const card = thumb.closest ? thumb.closest('.offer-card, td') : null;
        if (!mainImg && card && card.querySelector) mainImg = card.querySelector('.card-main-img, .cmp-main-img');
        if (!mainImg) return;
        mainImg.src = big;
        const row = thumb.closest ? thumb.closest('.img-thumbs') : null;
        if (row) {
            row.querySelectorAll('.img-thumb').forEach((t) => t.classList.toggle('active', t === thumb));
        }
    }

    highlightSearchName(offer) {
        const name = String(offer.name || '');
        const terms = (this.searchMatches.get(offer.id) || []).filter((t) => t.length > 1);
        if (!terms.length) return this.escapeHtml(name);
        const norm = this.normalizeText(name);
        const ranges = [];
        for (const t of terms) {
            let idx = 0;
            while ((idx = norm.indexOf(t, idx)) !== -1) {
                ranges.push([idx, idx + t.length]);
                idx += t.length;
            }
        }
        if (!ranges.length) return this.escapeHtml(name);
        ranges.sort((a, b) => a[0] - b[0]);
        const merged = [];
        for (const r of ranges) {
            const last = merged[merged.length - 1];
            if (last && r[0] <= last[1]) {
                last[1] = Math.max(last[1], r[1]);
            } else {
                merged.push([...r]);
            }
        }
        const esc = this.escapeHtml(name);
        let out = '';
        let prev = 0;
        for (const [s, e] of merged) {
            out += esc.slice(prev, s) + `<mark>${esc.slice(s, e)}</mark>`;
            prev = e;
        }
        return out + esc.slice(prev);
    }

    stars(score) {
        const full = Math.round(score);
        return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
    }

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SecondChanceApp();
});
