import requests

h = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

candidates = [
    'desktops', 'desktop-computers', 'all-in-one-computers', 'external-hard-drives',
    'webcams', 'usb-flash-drives', 'gaming-laptops', 'gaming', 'gaming-chairs',
    'computer-accessories', 'laptop-accessories', 'keyboards-and-mice',
    'keyboard-mouse', 'usb-hubs', 'dockers', 'batteries', 'powerbanks',
    'chargers', 'cables', 'monitor-stands', 'screens', 'projector-screens',
    'video-editing', 'photography', 'memory-cards', 'camera-lenses',
    'drones', 'virtual-reality', 'vr-glasses', 'gaming-controllers',
    'webcam', 'microphones', 'streaming', 'music-instruments', 'keyboards-piano',
    'piano', 'digital-piano', 'audio-interfaces', 'dj-equipment',
    'mixers', 'cd-players', 'bluray-players', 'dvd-players', 'media-players',
    'tv-wall-brackets', 'tv-mounts', 'tv-lifts', 'satellite',
    'smart-tv', 'android-tv', 'chromecast', 'set-top-boxes',
    'wifi-7', 'mesh-routers', 'wifi-6', 'modems', 'network-adapters',
    'powerline', 'ethernet', 'fiber', 'smarthome', 'smart-lighting',
    'smart-doorbells', 'smart-locks', 'smart-speakers', 'voice-assistants',
    'alexa', 'google-nest', 'hearing-aids', 'personal-care', 'beauty',
    'epilators', 'hair-removal', 'trimmers', 'grooming', 'baby-care',
    'baby-monitors', 'baby-phones', 'kitchen', 'kitchen-appliances',
    'food-processor', 'stand-mixers', 'hand-mixers', 'stick-mixers',
    'grinders', 'meat-grinders', 'deep-fryers', 'raclette', 'fondue',
    'waffle-irons', 'pancake-makers', 'sandwich-makers', 'slow-juicers',
    'centrifugal-juicers', 'lemon-squeezers', 'smoothie-makers',
    'ice-makers', 'water-filters', 'wine-coolers', 'beer-coolers',
    'portable-fridges', 'frozen', 'freezers', 'chest-freezers',
    'cooktops', 'ovens', 'built-in-ovens', 'hobs', 'range-hoods',
    'built-in-microwaves', 'steam-mops', 'vacuum-robots', 'carpet-cleaners',
    'pressure-washers', 'window-cleaners', 'laundry', 'washers',
    'portable-dryers', 'shoe-dryers', 'ironing', 'ironing-boards',
    'garment-care', 'space-heaters', 'water-heaters', 'boilers',
    'heat-pumps', 'mobility', 'powerchairs', 'scooters', 'wheelchairs',
    'bike', 'bikes', 'cycling', 'outdoor', 'camping', 'coolers',
    'recreation', 'drones-fpv', 'hobby', 'model-building', 'rc-cars',
    'games', 'board-games', 'puzzles', 'lego', 'toys', 'kids-electronics',
    'kids-tablets', 'kids-smartwatches', 'kids-headphones', 'gaming-consoles',
    'playstation', 'xbox', 'nintendo', 'switch', 'game-controllers',
    'gaming-headsets', 'game-accessories', 'office', 'office-chairs',
    'desks', 'standing-desks', 'office-desks', 'laptops-business',
    'video', 'video-cameras', 'camcorders', 'compact-cameras',
    'mirrorless-cameras', 'dslr-cameras', 'tripods', 'gimbal',
]

ok = []
for slug in candidates:
    url = f'https://www.coolblue.be/en/{slug}/second-chance'
    try:
        r = requests.get(url, headers=h, timeout=20)
    except Exception:
        continue
    if r.status_code == 200:
        n = r.text.count('product-card ')
        ok.append((slug, n))
        if n > 0:
            print(f'OK cards={n}  /en/{slug}/second-chance')

print()
print('total 200:', len(ok))
