# The Yu-Gi-Oh! realm's cards and its Trunk, from Yu-Gi-Oh! GX Duel Academy (GBA, Konami, 2005; the USA
# cartridge, game code BYGE: your own dump of it). Only its cards' data and pictures and its Trunk screen's
# graphics; the screen itself is ui/bag-screen.js's TrunkScreen, the game's own controls, filters and sorts.
#
#   python3 tools/build-gx-trunk.py "<path to Yu-Gi-Oh! GX - Duel Academy (USA).gba>"
#   python3 tools/build-gx-trunk.py   (no cartridge: from tools/data/roms/BYGE.bin, which a run with it keeps;
#                                      tools/lib/romcache.py)
#
# From the cartridge (its card tables are indexed by card number, 1 to 1200, slot 0 empty; their stats word
# packs as The Eternal Duelist Soul's does, which its decompilation documents):
#   - the cards: names (offsets at 0xf2a68c, from 0xf25690), descriptions (offsets at 0xf58294, from
#     0xf2b950), stats (a u32 each at 0xf243cc: DEF/10 bits 0-8, ATK/10 9-17, monster kind 18-19 (normal,
#     effect, fusion, ritual) or a Spell's or Trap's kind 17-19, type 20-24 (21 Trap, 22 Spell), level 25-28,
#     attribute 29-31), into data/items.js between its markers as window.YUGIOH_CARDS;
#   - their pictures: 80x80, 8bpp tiles of 64 colours (0x7cfacc + n x 0x1900), each with its palette (0x7aa24c
#     + n x 0x80), as assets/yugioh/cards/NN.png, a hundred to a sheet (ten across);
#   - the Trunk's icons: the attributes' (with Spell's and Trap's: 0x10bc5b8 + i x 0x80, palettes 0x10bc518 +
#     i x 0x20), the monster types' (0x10bcab8 + t x 0x80, palettes 0x10bd518 + t x 0x20) and the Spells' and
#     Traps' kinds' (0x10bd738 + k x 0x80), as assets/yugioh/trunk/attr-N.png, type-N.png, spell-N.png, trap-N.png;
#   - the Trunk screen's pieces (its background, the bar of filters, the digits, stars and the counts' icons,
#     the cursors, the card's frame, and the command and sort menus with their icons): each tile from the ROM,
#     laid out as the game lays them out on the screen (tools/lib/gx-trunk-pieces.json: where each tile of a
#     piece comes from in the ROM, and its palette; or the palette's colours, where the game sets them as it runs),
#     as assets/yugioh/trunk/<piece>.png;
#   - the duel screen's pieces, the same way (tools/lib/gx-duel-pieces.json): the floors (the Gym's boards and the
#     tutorial's red), the field's zones and its mat, the life points' bars and the card's line along the bottom
#     with their digits and icons, the decks' piles, the hand's cards in each kind's colours and the other side's
#     backs, the phases' column (each lit and not), the turn's and the piles' counters with their digits, the
#     cursor (pointing at the field, and down at the hand) and the menu's bars (grey, and lit in pink, blue and
#     green), as assets/yugioh/duel/<piece>.png. (The cards on the field the screen draws itself, in the hand's
#     cards' colours, as the game draws them: a card's shape in its zone.)
#   - the shop's pieces, the same way (tools/lib/gx-shop-pieces.json): the shop's room, the translucent panels and
#     the text box over it with its cursor, the pack picker's icons (the Duel Points' star, the basket's, the cards
#     to a pack and the price), its arrows (the curled ones above and below the packs, and either side of how many),
#     its digits (white, red and blue, and the big red ones), the SELECT tab and the help bar it opens; the pack
#     opening's backdrop, the machine the cards go into and its help bar; and the opened pack's list's background
#     with its NEW tag, as assets/yugioh/shop/<piece>.png. (The packs' pictures the screen draws itself: the game
#     makes its own as it runs, from a card's picture and its frame.)
import json, os, struct, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib')); import romcache
rom = romcache.load(sys.argv[1] if len(sys.argv) > 1 else None, ['BYGE'])   # (the cartridge, or tools/data/roms: tools/lib/romcache.py)
if rom[0xac:0xb0] != b'BYGE': sys.exit('Not Yu-Gi-Oh! GX Duel Academy (USA): its game code is ' + repr(rom[0xac:0xb0]))
N = 1201
CARDS = os.path.join(ROOT, 'assets/yugioh/cards'); TRUNK = os.path.join(ROOT, 'assets/yugioh/trunk')
DUEL = os.path.join(ROOT, 'assets/yugioh/duel'); SHOP = os.path.join(ROOT, 'assets/yugioh/shop')
for d in (CARDS, TRUNK, DUEL, SHOP): os.makedirs(d, exist_ok=True)

def colour(c): return ((c & 31) << 3 | (c & 31) >> 2, (c >> 5 & 31) << 3 | (c >> 5 & 31) >> 2, (c >> 10 & 31) << 3 | (c >> 10 & 31) >> 2)
def palette(o, n=16): return [colour(struct.unpack_from('<H', rom, o + 2 * i)[0]) for i in range(n)]
# (Its text: "@4" and "@5" colour what follows, a keyword or a card's name, "@7" back to white; and a few two-byte
# codes: a list's bullet, the "+" between a Fusion's materials, an alpha; any other a space.)
CODES = {b'\xf0\xae': '\n\u2022 ', b'\xf0\x9d': ' + ', b'\xf2\xa4': '\u03b1'}
def text(o):
    b = rom[o:rom.index(b'\x00', o)]; out = []; i = 0
    while i < len(b):
        if b[i] >= 0x80 and i + 1 < len(b):
            out.append(CODES.get(b[i:i + 2], ' ')); i += 2
        else:
            out.append(chr(b[i])); i += 1
    return ' '.join(''.join(out).split(' ')).replace('  ', ' ').strip()
def tile4(img, o, pal, x, y, hf=0, vf=0):
    for j in range(8):
        for i in range(8):
            v = rom[o + j * 4 + i // 2] >> (4 * (i & 1)) & 15
            px, py = x + (7 - i if hf else i), y + (7 - j if vf else j)
            if v and 0 <= px < img.width and 0 <= py < img.height: img.putpixel((px, py), pal[v] + (255,))
def tile8(img, o, pal, x, y, hf=0, vf=0):
    for j in range(8):
        for i in range(8):
            v = rom[o + j * 8 + i]
            px, py = x + (7 - i if hf else i), y + (7 - j if vf else j)
            if v and 0 <= px < img.width and 0 <= py < img.height: img.putpixel((px, py), pal[v] + (255,))
def icon(o, pal):
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for q in range(4): tile4(im, o + q * 32, pal, q % 2 * 8, q // 2 * 8)
    return im

# ---------- The cards ----------
KIND = ['normal', 'effect', 'fusion', 'ritual']
cards = [None]
for n in range(1, N):
    v = struct.unpack_from('<I', rom, 0xf243cc + 4 * n)[0]
    name = text(0xf25690 + struct.unpack_from('<I', rom, 0xf2a68c + 4 * n)[0])
    desc = text(0xf2b950 + struct.unpack_from('<I', rom, 0xf58294 + 4 * n)[0])
    t = v >> 20 & 31
    if t in (21, 22):   # (a Trap, a Spell: its kind, 0 normal, 1 counter, 2 field, 3 equip, 4 continuous, 5 quick-play, 6 ritual)
        cards.append([name, desc, 'trap' if t == 21 else 'spell', 0, 0, 0, -1, -1, v >> 17 & 7])
    else:
        cards.append([name, desc, KIND[v >> 18 & 3], t, v >> 29, v >> 25 & 15, (v >> 9 & 511) * 10, (v & 511) * 10, 0])
TYPES = ['', 'Dragon', 'Zombie', 'Fiend', 'Pyro', 'Sea Serpent', 'Rock', 'Machine', 'Fish', 'Dinosaur', 'Insect', 'Beast', 'Beast-Warrior',
         'Plant', 'Aqua', 'Warrior', 'Winged Beast', 'Fairy', 'Spellcaster', 'Thunder', 'Reptile']
ATTRS = ['', 'LIGHT', 'DARK', 'WATER', 'FIRE', 'EARTH', 'WIND']
ICONS = ['', 'Counter', 'Field', 'Equip', 'Continuous', 'Quick-Play', 'Ritual']
data = {'types': TYPES, 'attributes': ATTRS, 'icons': ICONS, 'perSheet': 100, 'across': 10,
        'fields': ['name', 'text', 'kind', 'type', 'attribute', 'level', 'atk', 'def', 'icon'], 'cards': cards}
START = '// Yu-Gi-Oh! cards (tools/build-gx-trunk.py, from Yu-Gi-Oh! GX Duel Academy): the Yu-Gi-Oh! realm\'s cards, by card number.\n'
END = '// (End of the Yu-Gi-Oh! cards.)\n'
js = START + 'window.YUGIOH_CARDS = ' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n' + END
path = os.path.join(ROOT, 'data/items.js')
s = open(path, encoding='utf8').read()
a = s.find(START)   # (in place, where it was; at the end the first time)
s = s[:a] + js + s[s.index(END, a) + len(END):] if a >= 0 else s + js
open(path, 'w', encoding='utf8').write(s)

# ---------- Their pictures ----------
for sheet in range((N + 99) // 100):
    im = Image.new('RGB', (800, 800), (0, 0, 0))
    for k in range(100):
        n = sheet * 100 + k
        if n == 0 or n >= N: continue
        pal = palette(0x7aa24c + n * 0x80, 64); px = rom[0x7cfacc + n * 0x1900: 0x7cfacc + (n + 1) * 0x1900]
        x0, y0 = k % 10 * 80, k // 10 * 80
        for t in range(100):
            for j in range(8):
                for i in range(8):
                    im.putpixel((x0 + t % 10 * 8 + i, y0 + t // 10 * 8 + j), pal[px[t * 64 + j * 8 + i] & 63])
    im.save(os.path.join(CARDS, '%02d.png' % sheet), optimize=True)

# ---------- The icons ----------
for i in range(1, 9):   # (1-6 the attributes, 7 Spell, 8 Trap)
    icon(0x10bc5b8 + i * 0x80, palette(0x10bc518 + i * 0x20)).save(os.path.join(TRUNK, 'attr-%d.png' % i))
for t in range(1, 21):
    icon(0x10bcab8 + t * 0x80, palette(0x10bd518 + t * 0x20)).save(os.path.join(TRUNK, 'type-%d.png' % t))
for k in range(1, 7):
    icon(0x10bd738 + k * 0x80, palette(0x10bdab8)).save(os.path.join(TRUNK, 'spell-%d.png' % k))
    icon(0x10bd738 + k * 0x80, palette(0x10bdad8)).save(os.path.join(TRUNK, 'trap-%d.png' % k))

# ---------- The Trunk screen's pieces ----------
def pal_of(p, n=16): return palette(p, n) if isinstance(p, int) else [colour(c) for c in p]
def build_pieces(recipes, out):
    pieces = json.load(open(os.path.join(ROOT, recipes)))
    for name, p in pieces.items():
        im = Image.new('RGBA', (p['w'], p['h']), (0, 0, 0, 0))
        for t in p['tiles']:
            if len(t) >= 8: x, y = t[6] + t[0] * 8, t[7] + t[1] * 8   # (a sprite's tile: the sprite's corner, and the tile in it)
            else: x, y = t[0] * 8, t[1] * 8
            if len(t) == 9 and t[8] == 8: tile8(im, t[2], pal_of(t[5], 256), x, y, t[3], t[4])   # (an 8bpp tile, its 256 colours)
            else: tile4(im, t[2], pal_of(t[5]), x, y, t[3], t[4])
        im.save(os.path.join(out, name + '.png'))
    return pieces
pieces = build_pieces('tools/lib/gx-trunk-pieces.json', TRUNK)
for d in range(10):   # (the small digits, all ten: 0x1458458 on, in the counts' palette)
    im = Image.new('RGBA', (8, 8), (0, 0, 0, 0)); tile4(im, 0x1458458 + d * 32, palette(0x126fd50), 0, 0)
    im.save(os.path.join(TRUNK, 'small-%d.png' % d))

# ---------- The duel screen's pieces ----------
duel = build_pieces('tools/lib/gx-duel-pieces.json', DUEL)

# ---------- The shop's pieces ----------
shop = build_pieces('tools/lib/gx-shop-pieces.json', SHOP)
print('%d cards; the Trunk\'s %d pieces, the duel screen\'s %d, the shop\'s %d' % (N - 1, len(pieces), len(duel), len(shop)))
