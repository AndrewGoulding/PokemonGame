# The Duel Monsters cards beyond Yu-Gi-Oh! GX Duel Academy's 1200: every card released in the TCG or the OCG up to
# Legacy of Darkness (2003-06-06) that GX doesn't have, 754 of them, and the seven booster packs they come in (this
# game's own, each named for its boss monster: tools/lib/extra-cards.json, which lists the cards in card-number order,
# 1201 on, and each pack's cards with their rarities).
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
#     each one's rarity (YUGIOH_RARITY: its rarity in its pack) and the seven packs (YUGIOH_SETS);
#   - their pictures, 80x80 in 64 colours as GX's are, on GX's sheets (assets/yugioh/cards/NN.png, a hundred to a
#     sheet, ten across), from sheet 12 on; and GX's own cards' pictures redrawn the same way, so all look alike (by
#     their TCG names: extra-cards.json's gxNames where GX's differ; the six GX made up keep GX's).
import json, os, re, sys, urllib.request
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
         'Plant', 'Aqua', 'Warrior', 'Winged Beast', 'Fairy', 'Spellcaster', 'Thunder', 'Reptile']
ATTRS = ['', 'LIGHT', 'DARK', 'WATER', 'FIRE', 'EARTH', 'WIND']
ICONS = {'Normal': 0, 'Counter': 1, 'Field': 2, 'Equip': 3, 'Continuous': 4, 'Quick-Play': 5, 'Ritual': 6}
KIND = {'normal': 'normal', 'effect': 'effect', 'fusion': 'fusion', 'ritual': 'ritual'}
def entry(c):
    text = c['desc'].replace('\r\n', '\n').replace('\r', '\n').strip()
    if c['frameType'] in ('spell', 'trap'):
        return [c['name'], text, c['frameType'], 0, 0, 0, -1, -1, ICONS[c['race']]]
    return [c['name'], text, KIND[c['frameType']], TYPES.index(c['race']), ATTRS.index(c['attribute']), c.get('level') or 0, c['atk'], c.get('def') or 0, 0]
cards = [entry(by[n]) for n in spec['cards']]
number = {n: FIRST + i for i, n in enumerate(spec['cards'])}
# (a pack's cards: the new ones, and GX's own of its time that GX's five sets don't have, by GX's names, keeping
# GX's rarities; GX's cards released after Legacy of Darkness, in no pack, are out of the game: their rarity "-")
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
for n, (name, r) in spec['restored'].items(): former[gx[int(n)][0]] = int(n)
START = '// Duel Monsters\' cards beyond GX Duel Academy\'s (tools/build-extra-cards.py): cards 1201 on, their rarities and their seven packs.\n'
END = '// (End of the cards beyond GX\'s.)\n'
js = (START + '(function () {\n'
      '  const C = window.YUGIOH_CARDS;\n'
      '  C.cards.length = ' + str(FIRST) + ';\n'
      '  C.cards.push(...' + json.dumps(cards, separators=(',', ':'), ensure_ascii=False) + ');\n'
      '  window.YUGIOH_RARITY = window.YUGIOH_RARITY.slice(0, ' + str(FIRST) + ') + ' + json.dumps(''.join(rarity[n] for n in spec['cards'])) + ';\n'
      '  const R = window.YUGIOH_RARITY.split("");\n'
      '  for (const name of ' + json.dumps(spec['removed'], ensure_ascii=False) + ') R[C.cards.findIndex((c) => c && c[0] === name)] = "-";\n'
      '  for (const no of ' + json.dumps(spec['removedNumbers']) + ') R[no] = "-";\n'
      '  // (GX\'s cards back in under their own names, with their rarities: a Fusion\'s material the TCG never printed)\n'
      '  for (const [no, [name, r]] of Object.entries(' + json.dumps(spec['restored'], ensure_ascii=False) + ')) { R[no] = r; C.cards[no][0] = name; }\n'
      '  window.YUGIOH_RARITY = R.join("");\n'
      '  // (GX\'s cards\' TCG names and text; their old names, for DuelMonsters.numberOf)\n'
      '  for (const [no, [name, text]] of Object.entries(' + json.dumps(tcg, separators=(',', ':'), ensure_ascii=False) + ')) { C.cards[no][0] = name; C.cards[no][1] = text; }\n'
      '  C.formerNames = ' + json.dumps(former, ensure_ascii=False) + ';\n'
      '  Object.assign(window.YUGIOH_SETS, ' + json.dumps(sets, ensure_ascii=False) + ');\n'
      '})();\n' + END)
path = os.path.join(ROOT, 'data/items.js')
s = open(path, encoding='utf8').read()
a = s.find(START)
s = s[:a] + js + s[s.index(END, a) + len(END):] if a >= 0 else s + js
open(path, 'w', encoding='utf8').write(s)

# ---------- Their pictures, and GX's cards' ----------
CARDS = os.path.join(ROOT, 'assets/yugioh/cards')
last = FIRST + len(cards) - 1
pics = {n: by[spec['cards'][n - FIRST]] for n in range(FIRST, last + 1)}
for n, c in enumerate((gx or [])[:FIRST]):
    if c and norm(spec['gxNames'].get(c[0], c[0])) in byNorm: pics[n] = byNorm[norm(spec['gxNames'].get(c[0], c[0]))]
for sheet in range(0, last // 100 + 1):
    out = os.path.join(CARDS, '%02d.png' % sheet)
    im = Image.open(out).convert('RGB') if os.path.exists(out) else Image.new('RGB', (800, 800), (0, 0, 0))
    for k in range(100):
        n = sheet * 100 + k
        if n not in pics: continue
        c = pics[n]
        art = Image.open(fetch(c['card_images'][0]['image_url_cropped'], os.path.join(CACHE, 'art', '%d.jpg' % c['id']))).convert('RGB')
        w, h = art.size; side = min(w, h)
        art = art.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side)).resize((80, 80), Image.LANCZOS)
        art = art.quantize(64, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')   # (GX's 64 colours a picture)
        im.paste(art, (k % 10 * 80, k // 10 * 80))
    im.save(out, optimize=True)
print('%d cards (%d to %d) in %d packs; %d pictures' % (len(cards), FIRST, last, len(spec['packs']), len(pics)))
