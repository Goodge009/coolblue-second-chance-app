# Coolblue Second Chance — Application Web & Android

Découvrez les **meilleures offres de produits reconditionnés "Second Chance"** de Coolblue Belgique, triées par économie ! Disponible en **application web** (navigateur) et en **APK Android** (offline).

## Fonctionnalités

- **Scraping réel** de coolblue.be (pages `/en/<categorie>/second-chance`, liens produits en français `/fr/deuxieme-chance-produit/`) : **112 catégories** (smartphones, laptops, TV, électroménager, drones, gaming, photo, réseau, cuisine, etc.)
- **Mise à jour manuelle** : bouton « Mise à jour des offres » dans l'interface (scraping intégré en JavaScript), **plus aucun scraping au démarrage**
- **Regroupement par produit** : les variantes d'un même modèle (couleurs, états, prix) sont fusionnées, seule la meilleure offre est affichée avec le nombre de variantes
- **Notes et avis** : note moyenne (/10) et nombre d'avis sur chaque carte
- **Tri intelligent** : remise (%), meilleures affaires (score 🔥), économie (€), prix, notes & avis, plus récents — avec **sens croissant/décroissant** (bouton ↑↓)
- **Barre de tri au-dessus des résultats** : nombre de résultats + tri visible directement au-dessus de la grille
- **Boutons d'action en haut à droite** : Mise à jour des offres, Recompiler l'APK, Rafraîchir, Export CSV, Statistiques, Alertes — toujours accessibles
- **Filtres** : catégorie (via un **menu groupé** en 12 familles avec recherche, à la place de 112 pastilles), **marque** (top 14 + « Autres / sans marque »), **état** (Undamaged / Lightly damaged / Visibly damaged), **remise minimale**, **prix min/max**, **en stock**, **livraison demain**, **avec avis**, **plusieurs variantes**, **nouveautés**, bouton « Effacer les filtres »
- **Recherche intelligente** : mots-clés combinés (AND), insensible aux accents (« ecran » trouve « écran »), synonymes (« tv »/« télévision », « tel »/« smartphone »…), tolérance aux fautes de frappe, **suggestions** (recherches récentes, marques, catégories, produits), **surlignage** des termes trouvés sur les cartes
- **Marque détectée** automatiquement sur chaque produit et affichée sur la carte
- **Galerie de photos** : case « 📷 Photos produits » lors de la mise à jour (enrichit chaque produit avec les photos de sa fiche, cachées ensuite dans le navigateur) — vignettes cliquables sur les cartes et dans le comparateur
- **Favoris + suivi des prix** : ajoutez des produits en favoris (étoile), suivi automatique de l'historique des prix, **badge « 📉 Prix en baisse »** et **bannière d'alertes** quand un favori baisse
- **Comparateur** : sélectionnez jusqu'à **4 produits** (bouton « 🆚 ») et comparez photos (galerie), prix, remise, économie, état, note, stock et livraison dans un tableau détaillé
- **Export / partage** : **export CSV** des offres filtrées (téléchargement sur le web, partage natif Android) et **bouton « ↗ Partager »** sur chaque carte
- **PWA hors-ligne** : service worker + manifest — l'app web s'installe et fonctionne hors connexion une fois chargée
- **Statistiques** : panneau « 📊 » avec économie totale, prix moyen, répartition par état, par marque, et barres de répartition des prix
- **Graphique d'historique des prix** : bouton « 📈 Historique » sur chaque carte — courbe d'évolution du prix (canvas) + premier prix / minimum / maximum / prix actuel
- **Notifications web de baisse de prix** : bouton « 🔔 Alertes » (desktop + mobile PWA) — notifie quand un favori baisse
- **Nouveautés** : badge « 🆕 Nouveau » sur les produits ajoutés depuis votre dernière visite, filtre « Nouveautés » et tri « Nouveautés »
- **Score « meilleures affaires »** : badge 🔥 sur chaque carte (remise + économie relative + note + stock), tri « Meilleures affaires »
- **Notifications Android** : l'app vérifie les favoris toutes les 12 h et **notifie les baisses de prix** (WorkManager)
- **Délai de livraison** affiché sur chaque carte (« Delivered tomorrow », « Delivered within X days »…)
- **Chargement progressif** : 24 cartes affichées puis bouton « Afficher plus »
- **Mode sombre / clair** (mémorisé, détection du thème système)
- **Interface 100 % statique** : aucun serveur Flask, aucun port 5000, aucun problème de connexion
- Interface en français, responsive

## Démarrage rapide

```bash
pip install -r requirements.txt
start.bat        # lance le serveur local + ouvre le navigateur (port 8000)
```

Ouvrez **http://localhost:8000**.

### Mise à jour des offres

Deux façons (manuellement, quand vous voulez) :

1. **Bouton « ⬇️ Mise à jour des offres »** dans l'interface — scraper JavaScript intégré (via le proxy local), puis enregistre les données. Une barre de progression s'affiche.
2. En ligne de commande : `python scraper.py --pages 2`

### Recompiler l'APK

Bouton **« 📦 Recompiler l'APK »** dans l'interface (ou `build_apk.bat`). La compilation prend ~1 minute ; le statut s'affiche dans l'interface.

## Application Android (APK)

Un APK prêt à installer est fourni : **`coolblue-second-chance.apk`** (WebView qui embarque l'app, fonctionne hors ligne).

### Installation sur le téléphone

1. Transférez `coolblue-second-chance.apk` sur le téléphone (USB, e-mail, cloud…)
2. Ouvrez le fichier depuis le téléphone
3. Autorisez « Installer des applications inconnues » si demandé
4. Installez puis ouvrez l'application « Second Chance »

### Mise à jour depuis le téléphone

L'APK inclut le bouton **« ⬇️ Mise à jour des offres »** : il scrape directement depuis le téléphone (réseau natif, pas de limite CORS) et enregistre les données dans l'application. La prochaine ouverture utilise ces données à jour.

> Compatible Android 5+ (recommandé Android 8+, testé sur Android 11-16). Nécessite une connexion internet pour scraper et afficher les photos produits.

### Structure du projet

```
coolblue-second-chance-app/
├── index.html               # Interface web (UI + PWA)
├── app.js                   # Logique : fetch JSON, tri, filtres, rendu, mise à jour, favoris, comparateur, stats
├── sw.js                    # Service worker PWA (cache hors-ligne)
├── manifest.webmanifest     # Manifest PWA (nom, icônes, thème)
├── icons/                   # Icônes PWA (192 / 512 px)
├── scraper.js               # Scraper JavaScript (web + Android) — même logique que scraper.py
├── scraper.py               # Scraper Python (CLI : python scraper.py --pages 2)
├── categories.json          # Liste des 112 catégories (slugs + libellés) — partagée
├── brands.json              # Liste des marques pour la détection automatique — partagée
├── second_chance_offers.json# Données générées par le scraper
├── server.py                # Serveur local : fichiers + /api/proxy + /api/save-json + /api/rebuild-apk
├── start.bat                # Lance le serveur (sans scraping)
├── build_apk.bat            # Compile l'APK Android
├── coolblue-second-chance.apk  # APK Android prêt à installer
├── android/                 # Projet Android (WebView + pont natif + worker de baisse de prix)
├── tools/                   # Tests (recherche intelligente, smoke) et scripts de dev
├── requirements.txt
└── README.md
```

> Outils Android (JDK 17, SDK, Gradle) installés dans `C:\android-build` — nécessaires uniquement pour recompiler l'APK.

## Données

Chaque produit (groupe de variantes) contient :

| Champ                  | Description                                  |
| ---------------------- | -------------------------------------------- |
| `name`                 | Nom de la meilleure variante                 |
| `url`                  | Lien vers la fiche Second Chance             |
| `imageUrl`             | Photo principale du produit                   |
| `images`               | Autres photos de la fiche produit (si enrichi)|
| `brand`                | Marque détectée automatiquement              |
| `newPrice`             | Prix neuf d'origine                          |
| `secondChancePrice`    | Prix reconditionné (Second Chance)           |
| `category`             | Catégorie (en français)                      |
| `condition`            | État : Undamaged / Visibly damaged…          |
| `stockStatus`          | En stock / Rupture de stock                  |
| `reviewScore`          | Note moyenne (/10)                           |
| `reviewCount`          | Nombre d'avis                                |
| `savings`              | Économie en €                                |
| `discountPercent`      | Remise en %                                  |
| `variantsCount`        | Nombre de variantes du produit               |
| `variants`             | Liste des variantes (prix, état, stock, lien)|

## Mise à jour des offres

Les prix et stocks évoluent en permanence. Pour actualiser :

```bash
python scraper.py --pages 2
```

Puis cliquez sur **Rafraîchir** dans l'application (ou rechargez la page).

> Astuce : `--pages 3` récupère 3 pages par catégorie (~60 unités/catégorie).

## Notes

- Le scraping respecte des délais entre les requêtes et réessaie en cas de réponse 503/429.
- Les variantes d'un même produit sont regroupées en retirant la couleur du nom ; la meilleure offre (remise la plus forte) est mise en avant.
- Les données sont stockées localement ; aucune donnée personnelle n'est envoyée.
- Prix et stocks affichés à titre indicatif, ils peuvent différer au moment de l'achat.
