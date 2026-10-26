# The Duel Monsters cards beyond Yu-Gi-Oh! GX Duel Academy's 1200: every card released in the TCG or the OCG up to
# Structure Deck: Fury from the Deep (2005-05-06) that GX doesn't have, 965 of them, and the eleven booster packs
# every card in the game comes in (this game's own, its cards grouped by power, each pack named for its Secret Rare:
# tools/lib/extra-cards.json, which lists the cards in card-number order, 1201 on, and each pack's cards with their
# rarities).
#
#   python3 tools/build-extra-cards.py <cache directory>
#   (after tools/build-gx-trunk.py: its cards come first, and its last picture sheet is added to here)
#
# From YGOPRODeck's card database (db.ygoprodeck.com: the cards' names, text, kinds, types, attributes, levels and
# stats) and its cards' pictures (images.ygoprodeck.com's cropped art), kept in the cache directory once downloaded:
#   - GX's own cards' names and text as the TCG has them now (its current text, errata and all; their stats are
#     GX's, the same), their old names kept as former names (window.YUGIOH_CARDS.formerNames) that
#     DuelMonsters.numberOf still knows;
#   - the cards, as GX's own are (data/items.js's YUGIOH_CARDS: name, text, kind, type, attribute, level, ATK, DEF,
#     the Spell's or Trap's icon), added to its cards after GX's, between this tool's markers in data/items.js, with
#     each one's rarity (YUGIOH_RARITY: every card's rarity in its pack) and the eleven packs (YUGIOH_SETS);
#   - their pictures, 80x80 in 64 colours as GX's are, on GX's sheets (assets/yugioh/cards/NN.png, a hundred to a
#     sheet, ten across), from sheet 12 on; and GX's own cards' pictures redrawn the same way, so all look alike (by
#     their TCG names: extra-cards.json's gxNames where GX's differ; the six GX made up keep GX's).
import json, os, re, sys, urllib.parse, urllib.request
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
if len(sys.argv) < 2: sys.exit('usage: python3 tools/build-extra-cards.py <cache directory>')
CACHE = sys.argv[1]; os.makedirs(os.path.join(CACHE, 'art'), exist_ok=True)
spec = json.load(open(os.path.join(ROOT, 'tools/lib/extra-cards.json'), encoding='utf8'))
FIRST = 1201

def fetch(url, path):
    if not os.path.exists(path):
        req = urllib.request.Request(url, headers={'User-Agent': 'PokemonGame build tool'})
        with urllib.request.urlopen(req, timeout=300) as r, open(path + '.part', 'wb') as f: f.write(r.read())
        os.replace(path + '.part', path)
    return path

db = json.load(open(fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes', os.path.join(CACHE, 'cardinfo.json')), encoding='utf8'))['data']
by = {c['name']: c for c in db}

# ---------- The cards ----------
TYPES = ['', 'Dragon', 'Zombie', 'Fiend', 'Pyro', 'Sea Serpent', 'Rock', 'Machine', 'Fish', 'Dinosaur', 'Insect', 'Beast', 'Beast-Warrior',
         'Plant', 'Aqua', 'Warrior', 'Winged Beast', 'Fairy', 'Spellcaster', 'Thunder', 'Reptile', 'Divine-Beast']
ATTRS = ['', 'LIGHT', 'DARK', 'WATER', 'FIRE', 'EARTH', 'WIND', 'DIVINE']   # (the Egyptian Gods' type and attribute, beyond GX's)
ICONS = {'Normal': 0, 'Counter': 1, 'Field': 2, 'Equip': 3, 'Continuous': 4, 'Quick-Play': 5, 'Ritual': 6}
KIND = {'normal': 'normal', 'effect': 'effect', 'fusion': 'fusion', 'ritual': 'ritual'}
def entry(c):
    text = c['desc'].replace('\r\n', '\n').replace('\r', '\n').strip()
    if c['frameType'] in ('spell', 'trap'):
        return [c['name'], text, c['frameType'], 0, 0, 0, -1, -1, ICONS[c['race']]]
    # (an ATK or DEF of "?", the Gods', 0: their effects give them theirs)
    return [c['name'], text, KIND[c['frameType']], TYPES.index(c['race']), ATTRS.index(c['attribute']), c.get('level') or 0, max(0, c['atk']), max(0, c.get('def') or 0), 0]
# (a card YGOPRODeck hasn't, the OCG's own: its data by hand from Yugipedia, in extra-cards.json's manual)
def manual(n):
    m = spec['manual'][n]
    return [n, m['text'], m['kind'], TYPES.index(m['type']), ATTRS.index(m['attribute']), m['level'], m['atk'], m['def'], 0]
cards = [manual(n) if n in spec['manual'] else entry(by[n]) for n in spec['cards']]
number = {n: FIRST + i for i, n in enumerate(spec['cards'])}
# (the packs: every card in the game in one of them, by its name now; a card's rarity, its rarity there; GX's cards in
# no pack are out of the game, their rarity "-")
rarity = {}
for p in spec['packs']:
    for n, r in p['cards']: rarity[n] = r
sets = {}
NAMES = {'c': 'common', 'r': 'rare', 's': 'super', 'u': 'ultra', 'x': 'secret'}
for p in spec['packs']:
    s = {'item': p['item'], 'name': p['name'], 'full': p['full'], 'cover': p['cover'], 'text': p['text']}
    for k, v in NAMES.items(): s[v] = [n for n, r in p['cards'] if r == k]
    sets[p['key']] = s
# (GX's cards by their TCG names, from GX's own data in data/items.js; those out of the game keep GX's)
norm = lambda n: re.sub(r'[^a-z0-9]', '', n.lower())
byNorm = {norm(c['name']): c for c in db}
items = open(os.path.join(ROOT, 'data/items.js'), encoding='utf8').read()
gx = json.loads(re.search(r'window\.YUGIOH_CARDS = (\{.*?\});\n', items, re.S).group(1))['cards']
out = set(spec['removed']) | {gx[n][0] for n in spec['removedNumbers']}
tcg, former = {}, {}
for n, c in enumerate(gx[:FIRST]):
    if not c or n in spec['removedNumbers'] or c[0] in spec['removed']: continue
    t = byNorm.get(norm(spec['gxNames'].get(c[0], c[0])))
    if not t: continue
    tcg[n] = [t['name'], t['desc'].replace('\r\n', '\n').replace('\r', '\n').strip()]
    if t['name'] != c[0]: former[c[0]] = n
# (every card's rarity, by number: its pack's; out of the game, "-")
base = list(re.search(r'window\.YUGIOH_RARITY = "([^"]*)"', items).group(1))[:FIRST]
base += ['c'] * (FIRST - len(base))
byNameNo = {}
for n, c in enumerate(gx[:FIRST]):
    if not c: continue
    if c[0] in spec['removed'] or n in spec['removedNumbers']: base[n] = '-'; continue
    byNameNo[norm(tcg[n][0] if n in tcg else c[0])] = n
for n, name in enumerate(spec['cards']): byNameNo[norm(name)] = FIRST + n
full = base + [rarity[n] for n in spec['cards']]
for n, r in rarity.items():
    no = byNameNo.get(norm(n)) or byNameNo.get(norm(spec['aliases'].get(n, n)))
    assert no, n
    full[no] = r
missing = [n for n in range(1, len(full)) if full[n] != '-' and not any(byNameNo.get(norm(x)) == n for x in rarity)]
assert not missing, missing[:10]
START = '// Duel Monsters\' cards beyond GX Duel Academy\'s (tools/build-extra-cards.py): cards 1201 on, their rarities and the eleven packs.\n'
END = '// (End of the cards beyond GX\'s.)\n'
js = (START + '(function () {\n'
      '  const C = window.YUGIOH_CARDS;\n'
      '  C.cards.length = ' + str(FIRST) + ';\n'
      '  C.cards.push(...' + json.dumps(cards, separators=(',', ':'), ensure_ascii=False) + ');\n'
      '  // (every card\'s rarity: its rarity in its pack; "-" for those out of the game)\n'
      '  window.YUGIOH_RARITY = ' + json.dumps(''.join(full)) + ';\n'
      '  // (GX\'s cards\' TCG names and text; their old names, for DuelMonsters.numberOf)\n'
      '  for (const [no, [name, text]] of Object.entries(' + json.dumps(tcg, separators=(',', ':'), ensure_ascii=False) + ')) { C.cards[no][0] = name; C.cards[no][1] = text; }\n'
      '  C.formerNames = ' + json.dumps(former, ensure_ascii=False) + ';\n'
      '  // (names a card\'s text uses for another card: Amphibious Bugroth\'s "Defender of the Sea", Sentinel of the Seas)\n'
      '  for (const [a, t] of Object.entries(' + json.dumps(spec['aliases'], ensure_ascii=False) + ')) C.formerNames[a] = C.cards.findIndex((c) => c && c[0] === t);\n'
      '  C.types[' + str(TYPES.index('Divine-Beast')) + '] = "Divine-Beast"; C.attributes[' + str(ATTRS.index('DIVINE')) + '] = "DIVINE";\n'
      '  window.YUGIOH_SETS = ' + json.dumps(sets, ensure_ascii=False) + ';\n'
      '})();\n' + END)
path = os.path.join(ROOT, 'data/items.js')
s = open(path, encoding='utf8').read()
a = s.find(START)
s = s[:a] + js + s[s.index(END, a) + len(END):] if a >= 0 else s + js
open(path, 'w', encoding='utf8').write(s)

# ---------- Their pictures, and GX's cards' ----------
CARDS = os.path.join(ROOT, 'assets/yugioh/cards')
last = FIRST + len(cards) - 1
pics = {n: by.get(spec['cards'][n - FIRST]) or spec['manual'][spec['cards'][n - FIRST]] for n in range(FIRST, last + 1)}
for n, c in enumerate((gx or [])[:FIRST]):
    if c and norm(spec['gxNames'].get(c[0], c[0])) in byNorm: pics[n] = byNorm[norm(spec['gxNames'].get(c[0], c[0]))]
for sheet in range(0, last // 100 + 1):
    out = os.path.join(CARDS, '%02d.png' % sheet)
    im = Image.open(out).convert('RGB') if os.path.exists(out) else Image.new('RGB', (800, 800), (0, 0, 0))
    for k in range(100):
        n = sheet * 100 + k
        if n not in pics: continue
        c = pics[n]
        if 'image' in c:   # (a manual card: Yugipedia's picture of the whole card, its art's box cut out)
            u = 'https://yugipedia.com/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles=File:' + urllib.parse.quote(c['image'])
            info = json.load(open(fetch(u, os.path.join(CACHE, 'art', c['image'] + '.json')), encoding='utf8'))
            url = list(info['query']['pages'].values())[0]['imageinfo'][0]['url']
            card = Image.open(fetch(url, os.path.join(CACHE, 'art', c['image']))).convert('RGB')
            w, h = card.size
            art = card.crop((round(w * 0.12), round(h * 0.185), round(w * 0.88), round(h * 0.185 + w * 0.76)))
        else: art = Image.open(fetch(c['card_images'][0]['image_url_cropped'], os.path.join(CACHE, 'art', '%d.jpg' % c['id']))).convert('RGB')
        w, h = art.size; side = min(w, h)
        art = art.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side)).resize((80, 80), Image.LANCZOS)
        art = art.quantize(64, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')   # (GX's 64 colours a picture)
        im.paste(art, (k % 10 * 80, k // 10 * 80))
    im.save(out, optimize=True)
# ---------- The Gods' icons ----------
# (DIVINE and Divine-Beast, which GX hasn't: its LIGHT and Dragon icons in gold, assets/yugioh/trunk/attr-divine.png and type-21.png)
TRUNK = os.path.join(ROOT, 'assets/yugioh/trunk')
for src, dst in (('attr-1', 'attr-divine'), ('type-1', 'type-%d' % TYPES.index('Divine-Beast'))):
    im = Image.open(os.path.join(TRUNK, src + '.png')).convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a and not (r == g == b and r < 60):   # (the outline kept)
                v = (r + g + b) / 3 / 255
                px[x, y] = (min(255, int(120 + 135 * v)), min(255, int(80 + 140 * v)), int(20 + 60 * v), a)
    if dst == 'attr-divine':   # (神 in place of LIGHT's 光, with a Japanese font if there's one)
        font = next((f for f in ('/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf', '/usr/share/fonts/truetype/fonts-japanese-gothic.ttf') if os.path.exists(f)), None)
        if font:
            from PIL import ImageDraw, ImageFont
            g = ImageDraw.Draw(im); g.fontmode = '1'
            g.ellipse((3, 3, im.width - 4, im.height - 4), fill=(232, 196, 72, 255))
            g.text((im.width / 2, im.height / 2), '神', font=ImageFont.truetype(font, 10), fill=(96, 56, 16, 255), anchor='mm')
    im.save(os.path.join(TRUNK, dst + '.png'))
print('%d cards (%d to %d) in %d packs; %d pictures' % (len(cards), FIRST, last, len(spec['packs']), len(pics)))
