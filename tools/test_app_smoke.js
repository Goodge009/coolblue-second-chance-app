// Test d'exécution de app.js avec un DOM factice (Node vm, sans navigateur)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeEl(tag) {
    const el = {
        tagName: tag || 'div',
        _innerHTML: '',
        _text: '',
        value: '',
        checked: false,
        disabled: false,
        hidden: false,
        className: '',
        dataset: {},
        style: { setProperty() {} },
        classList: {
            _set: new Set(),
            add(...c) { c.forEach((x) => this._set.add(x)); },
            remove(...c) { c.forEach((x) => this._set.delete(x)); },
            toggle(c, force) { const has = this._set.has(c); const want = force === undefined ? !has : force; if (want) this._set.add(c); else this._set.delete(c); return want; },
            contains(c) { return this._set.has(c); },
        },
        addEventListener() {},
        appendChild() {},
        querySelector() { return null; },
        querySelectorAll() { return []; },
        focus() {},
        click() {},
        remove() {},
        getContext() { return { setTransform() {}, clearRect() {}, fillText() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, fill() {}, stroke() {}, arc() {}, rect() {} }; },
        clientWidth: 600,
        clientHeight: 240,
        parentNode: { clientWidth: 600 },
        get textContent() { return this._text; },
        set textContent(v) { this._text = v; this._innerHTML = String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
        set innerHTML(v) { this._innerHTML = v; },
        get innerHTML() { return this._innerHTML; },
    };
    return el;
}

const elements = {};
const IDS = [
    'statusBar', 'statusText', 'toolbar', 'statsGrid', 'chips', 'offersGrid',
    'emptyState', 'loadMore', 'headerMeta', 'searchInput', 'suggestions',
    'sortSelect', 'sortDirBtn', 'conditionSelect', 'minDiscount', 'brandSelect',
    'inStock', 'deliveryTomorrow', 'withReviews', 'multiVariants',
    'favOnly', 'newArrivals', 'notifBtn', 'alerts', 'statsPanel', 'exportBtn', 'statsBtn',
    'compareBar', 'compareCount', 'compareOpenBtn', 'compareClearBtn',
    'compareModal', 'compareCloseBtn', 'compareBody',
    'priceModal', 'priceCloseBtn', 'priceChart', 'priceTitle', 'priceSummary',
    'categoryPanel', 'categoryCloseBtn', 'categorySearch', 'categoryList',
    'priceMin', 'priceMax', 'refreshBtn', 'updateBtn', 'rebuildBtn',
    'clearFilters', 'themeToggle', 'progressWrap', 'progressBar', 'progressText',
    'resultCount', 'enrichImages', 'headerActions',
];
IDS.forEach((id) => { elements[id] = makeEl(id); });
elements.sortSelect.value = 'discount';
elements.conditionSelect.value = 'Toutes';
elements.brandSelect.value = 'Toutes';
elements.minDiscount.value = '0';
elements.alerts.classList.add('hidden');
elements.statsPanel.classList.add('hidden');
elements.compareModal.classList.add('hidden');
elements.compareBar.classList.add('hidden');
elements.priceModal.classList.add('hidden');
elements.categoryPanel.classList.add('hidden');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'second_chance_offers.json'), 'utf-8'));
const brands = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'brands.json'), 'utf-8'));

const store = {};
const failures = [];

// Simule un utilisateur qui a activé les alertes (permission accordée)
store['cb-notif'] = '1';

class BlobStub {
    constructor(parts, opts) { this._parts = parts; }
}

const sandbox = {
    console,
    document: {
        getElementById: (id) => elements[id] || makeEl('div'),
        createElement: (t) => makeEl(t),
        createTextNode: () => ({}),
        body: makeEl('body'),
        addEventListener() {},
        documentElement: { dataset: {} },
    },
    window: { AndroidBridge: undefined, matchMedia: () => ({ matches: false }) },
    localStorage: {
        getItem: (k) => (k in store ? store[k] : null),
        setItem: (k, v) => { store[k] = v; },
    },
    fetch: async (url) => ({
        ok: true,
        status: 200,
        json: async () => (String(url).indexOf('brands') !== -1 ? brands : data),
    }),
    navigator: {},
    Notification: { permission: 'granted' },
    Blob: BlobStub,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} },
    setTimeout,
    clearTimeout,
    AbortController: class {
        constructor() { this.signal = {}; }
        abort() {}
    },
};

let appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf-8');
appCode += '\n;this.__SecondChanceApp = SecondChanceApp;';
vm.createContext(sandbox);
try {
    vm.runInContext(appCode, sandbox, { filename: 'app.js' });
} catch (e) {
    console.error('CHARGEMENT ÉCHOUÉ:', e && e.stack);
    process.exit(1);
}

const SecondChanceApp = sandbox.__SecondChanceApp;

setTimeout(() => {
    (async () => {
        try {
            const app = new SecondChanceApp();
            while (!app.allOffers.length) await new Promise((r) => setTimeout(r, 20));
            app.searchTerm = 'iphone 15';
            app.applyFilters();
            if (!app.filtered.length) failures.push('recherche « iphone 15 » vide');
            const iphone = app.filtered[0] && app.filtered[0].name;
            if (!/iphone 15/i.test(iphone || '')) failures.push('« iphone 15 » -> ' + iphone);

            app.searchTerm = 'ecran';
            app.applyFilters();
            if (!app.filtered.length) failures.push('recherche « ecran » vide');

            app.searchTerm = 'samsang'; // faute de frappe tolérée
            app.applyFilters();
            if (!app.filtered.length) failures.push('« samsang » (typo) vide');

            app.searchTerm = '';
            app.brand = 'Autres';
            app.deliveryTomorrow = true;
            app.withReviews = true;
            app.multiVariants = true;
            app.applyFilters();

            app.populateBrandSelect();
            elements.searchInput.value = 'dyson';
            app.renderSuggestions();
            app.pickValue('dyson', 'Dyson');
            app.commitSearch();
            app.hideSuggestions();
            app.clearFilters();
            app.searchTerm = 'iphone 15';
            app.applyFilters();
            const hlOffer = app.allOffers.find((o) => /iphone 15/i.test(o.name));
            const hl = app.highlightSearchName(hlOffer);
            if (!hl || hl.indexOf('<mark>') === -1) failures.push('surlignage absent: ' + hl);

            // --- Favoris + suivi de prix ---
            const favOffer = app.allOffers.find((o) => /dyson/i.test(o.name));
            if (!favOffer) failures.push('dyson introuvable pour test favori');
            else {
                app.toggleFav(favOffer.id);
                if (!app.isFav(favOffer.id)) failures.push('toggleFav : non ajouté');
                const pid = String(favOffer.id);
                app.priceHistory[pid] = [
                    { t: 1, p: favOffer.secondChancePrice + 100 },
                    { t: 2, p: favOffer.secondChancePrice },
                ];
                app.computePriceDrops();
                const drop = app.priceDropFor(pid);
                if (!drop || drop.amount < 99) failures.push('baisse de prix non détectée: ' + JSON.stringify(drop));
                app.showAlerts();
                if (app.$alerts.classList.contains('hidden')) failures.push('alerte baisse de prix non affichée');
                app.toggleFav(favOffer.id);
            }

            // --- Comparateur ---
            const c1 = app.allOffers[0];
            const c2 = app.allOffers[1];
            app.toggleCompare(c1.id);
            app.toggleCompare(c2.id);
            if (app.compareList.length !== 2) failures.push('comparateur: liste != 2');
            app.renderCompareTable();
            if (app.$compareBody.innerHTML.indexOf('Photos') === -1) failures.push('comparateur : ligne Photos absente');
            app.openCompare();
            if (app.$compareModal.classList.contains('hidden')) failures.push('modal comparateur non affiché');
            app.renderCompareBar();
            if (app.$compareBar.classList.contains('hidden')) failures.push('barre comparateur non affichée');
            app.closeCompare();
            app.toggleCompare(c1.id);
            app.toggleCompare(c2.id);

            // --- Galerie d'images dans les cartes ---
            const withImgs = app.allOffers.find((o) => o.images && o.images.length > 1);
            const gCard = app.buildCard(withImgs || app.allOffers[0]);
            const hasThumbs = gCard.innerHTML.indexOf('img-thumb') !== -1;
            if (withImgs && !hasThumbs) failures.push('vignettes images absentes de la carte');
            if (!withImgs && hasThumbs) failures.push('vignettes images inattendues (aucune images)');
            if (withImgs && gCard.innerHTML.indexOf('carrow') === -1) failures.push('carrousel absent de la carte');
            const carImg = app.carouselImages(withImgs || app.allOffers[0]);
            if (!carImg.length || !carImg[0]) failures.push('carouselImages vide');

            // --- Navigation carrousel (grid) ---
            const carId = String((withImgs || app.allOffers[0]).id);
            app.carouselImgs.set(carId, ['https://x.test/1.png', 'https://x.test/2.png']);
            app.carouselIdx.set(carId, 0);
            const scope = makeEl('div');
            app.carouselNav(carId, 1, scope);
            if (app.carouselIdx.get(carId) !== 1) failures.push('carrousel : index non avancé');
            app.carouselNav(carId, -1, scope);
            if (app.carouselIdx.get(carId) !== 0) failures.push('carrousel : index non reculé');
            app.carouselNav(carId, 1, scope);
            app.carouselNav(carId, 1, scope);
            if (app.carouselIdx.get(carId) !== 2) failures.push('carrousel : retour à 0 attendu');

            // --- Barre de résultats ---
            if (!elements.resultCount._text) failures.push('compteur de résultats vide');

            // --- Export / stats ---
            app.exportCsv();
            app.toggleStats();
            if (app.$statsPanel.classList.contains('hidden')) failures.push('panel stats non affiché');
            app.shareOffer(c1);

            // --- Score meilleures affaires ---
            const score = app.dealScore(c1);
            if (!(score > 0)) failures.push('dealScore invalide: ' + score);
            app.sortMode = 'score';
            app.applyFilters();
            if (app.filtered[0] && app.dealScore(app.filtered[0]) < app.dealScore(app.filtered[app.filtered.length - 1])) {
                failures.push('tri par score non décroissant');
            }

            // --- Nouveautés ---
            app.clearFilters();
            app.markNewArrivals();
            let newCount = app.allOffers.filter((o) => o._isNew).length;
            app.markNewArrivals();
            if (newCount !== 0) failures.push('2e passe : nouveaux encore marqués (' + newCount + ')');
            app.allOffers[0]._isNew = true;
            app.newArrivals = true;
            app.applyFilters();
            if (!app.filtered.length) failures.push('filtre nouveautés : vide');
            app.newArrivals = false;

            // --- Graphique d'historique de prix ---
            app.openPriceChart(favOffer.id);
            if (app.$priceModal.classList.contains('hidden')) failures.push('modal historique prix non affiché');
            app.closePriceChart();
            if (!app.$priceModal.classList.contains('hidden')) failures.push('modal historique prix non fermé');

            // --- Notifications web (stub : Notification absent -> doit ignorer) ---
            app.toggleNotifications();
            app.notifyWebDrops();

            // --- Tri : sens croissant/décroissant ---
            const before = app.filtered[0];
            app.sortMode = 'priceAsc';
            app.applyFilters();
            const ascFirst = app.filtered[0];
            app.sortAsc = true;
            app.applyFilters();
            if (app.filtered[0] !== before && !(app.filtered[0].secondChancePrice >= ascFirst.secondChancePrice)) {
                failures.push('tri croissant par prix invalide');
            }
            app.sortAsc = false;
            app.applyFilters();

            // --- Menu catégories ---
            app.renderCategoryPanel('tv');
            if (!app.$categoryList.innerHTML || app.$categoryList.innerHTML.indexOf('cat-item') === -1) {
                failures.push('recherche catégorie "tv" : aucun résultat');
            }
            app.renderCategoryPanel('');
            if (!app.$categoryList.innerHTML || app.$categoryList.innerHTML.indexOf('cat-group-title') === -1) {
                failures.push('menu catégories : groupes absents');
            }
            if (!app.categoryGroup('Televiseurs', 'televisions').length) failures.push('categoryGroup invalide');
            app.openCategoryPanel();
            if (app.$categoryPanel.classList.contains('hidden')) failures.push('menu catégories non affiché');
            app.closeCategoryPanel();
            if (!app.$categoryPanel.classList.contains('hidden')) failures.push('menu catégories non fermé');

            app.renderStats();
            app.renderChips();
            app.renderGrid();

            console.log(failures.length ? 'SMOKE FAIL:\n- ' + failures.join('\n- ') : 'SMOKE OK (' + app.allOffers.length + ' offres)');
            process.exit(failures.length ? 1 : 0);
        } catch (e) {
            console.error('SMOKE CRASH:', e && e.stack);
            process.exit(1);
        }
    })();
}, 150);
