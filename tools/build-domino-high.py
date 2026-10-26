# Domino High School, this game's own: neither Yu-Gi-Oh! GBA game has it, so
# it's put together from their screens (tools/build-sacred-cards.py,
# tools/build-reshef.py: run those first), which share one camera.
#
#   - the front: Pegasus Castle's door and gardens (Reshef's screen 50), its stone made a school's warm render and
#     its gargoyles turned to lawn: walk out of it and Domino City's map comes up (ui/game.js's dominoTravel);
#   - the entrance hall: the Sacred Cards' hotel lobby (screen 54), its red carpet made a tiled floor, its sofas the
#     hall's benches;
#   - the classroom: the Sacred Cards' warehouse (screens 47 and 48, the same room with its crates in other places:
#     each pixel from whichever has bare floor, and what's left of the crates painted over with the floor's own
#     light), with a blackboard, a teacher's desk, lockers and pupils' desks drawn in.
#
# Yugi, Téa, Joey and Tristan are in its classroom, and its pupils all about. It also sets up the other place on
# Domino City's map, the Kame Game shop (Reshef's screens 6 and 7): its ways out onto the map, and Yugi's grandpa
# at its counter, who sells booster packs.
#
#   python3 tools/build-domino-high.py
#   (after tools/build-reshef.py, whose Kame Game shop it changes: run it again if you rebuild that)
#
# Writes assets/world/maps/DH_00.png (the front), DH_01 (the hall), DH_02 (the classroom), with -top and -border;
# data/emerald-maps.js (between its markers): their maps, the Kame Game shop's, and the fountain's entry for them.
import json, os, random
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MAPS = os.path.join(ROOT, 'assets/world/maps')
W, H = 15, 10
rng = random.Random(7)

def load(name, part=''):
    return np.array(Image.open(os.path.join(MAPS, name + part + '.png')).convert('RGBA')).astype(float)
def flat(name):
    g, t = Image.open(os.path.join(MAPS, name + '.png')).convert('RGBA'), Image.open(os.path.join(MAPS, name + '-top.png')).convert('RGBA')
    g.alpha_composite(t); return np.array(g).astype(float)
def save(name, below, top):
    Image.fromarray(below.clip(0, 255).astype(np.uint8)).save(os.path.join(MAPS, name + '.png'))
    Image.fromarray(top.clip(0, 255).astype(np.uint8)).save(os.path.join(MAPS, name + '-top.png'))
    Image.new('RGBA', (32, 32), (0, 0, 0, 255)).save(os.path.join(MAPS, name + '-border.png'))

# The floor, where `mask` is: its light fitted (a smooth surface through the floor round it), and its grain
# (the floor's own, from where it's bare).
def floor_fill(img, mask, region):
    ys, xs = np.nonzero(region & ~mask)
    X = np.stack([np.ones_like(xs), xs, ys, xs * xs, ys * ys, xs * ys, xs ** 3, ys ** 3], 1).astype(float) / [1, 240, 160, 240 ** 2, 160 ** 2, 240 * 160, 240 ** 3, 160 ** 3]
    out = img.copy()
    my, mx_ = np.nonzero(mask & region)
    Xm = np.stack([np.ones_like(mx_), mx_, my, mx_ * mx_, my * my, mx_ * my, mx_ ** 3, my ** 3], 1).astype(float) / [1, 240, 160, 240 ** 2, 160 ** 2, 240 * 160, 240 ** 3, 160 ** 3]
    for c in range(3):
        coef, *_ = np.linalg.lstsq(X, img[ys, xs, c], rcond=None)
        fit_known = X @ coef
        resid = img[ys, xs, c] - fit_known
        pick = np.array([rng.randrange(len(resid)) for _ in range(len(my))])
        out[my, mx_, c] = Xm @ coef + np.clip(resid[pick], -12, 12) * 0.6
    return out

# ---------- Drawing ----------
def hexc(s): return np.array([int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16), 255], float)
def rect(img, x0, y0, w, h, col):
    img[max(0, y0):y0 + h, max(0, x0):x0 + w] = hexc(col) if isinstance(col, str) else col
def shade(img, x0, y0, w, h, k):
    img[y0:y0 + h, x0:x0 + w, :3] *= k
def outline(img, x0, y0, w, h, col='#1c1a20'):
    rect(img, x0, y0, w, 1, col); rect(img, x0, y0 + h - 1, w, 1, col); rect(img, x0, y0, 1, h, col); rect(img, x0 + w - 1, y0, 1, h, col)
def shadow(img, x0, y0, w, h, k=0.72):
    for y in range(y0, y0 + h):
        for x in range(x0, x0 + w):
            dx, dy = (x + 0.5 - (x0 + w / 2)) / (w / 2), (y + 0.5 - (y0 + h / 2)) / (h / 2)
            if dx * dx + dy * dy <= 1 and 0 <= y < 160 and 0 <= x < 240: img[y, x, :3] *= k
def pupil_desk(img, x, y):
    # (A pupil's desk, seen from behind and above as everything is: its top, its front, its legs; its chair behind.)
    shadow(img, x - 1, y + 9, 18, 7)
    rect(img, x + 1, y + 7, 1, 6, '#6a6a72'); rect(img, x + 14, y + 7, 1, 6, '#6a6a72')
    rect(img, x, y, 16, 7, '#d9b27a'); rect(img, x, y, 16, 1, '#f0d29c'); rect(img, x, y + 6, 16, 1, '#a07a46')
    rect(img, x + 1, y + 7, 14, 3, '#8f969e'); rect(img, x + 1, y + 9, 14, 1, '#6c737a')
    outline(img, x, y, 16, 7)
    # the chair
    rect(img, x + 4, y + 11, 8, 3, '#c49a62'); rect(img, x + 4, y + 11, 8, 1, '#e2bd86')
    rect(img, x + 4, y + 14, 8, 2, '#9aa2aa'); rect(img, x + 4, y + 14, 1, 2, '#6c737a'); rect(img, x + 11, y + 14, 1, 2, '#6c737a')
    outline(img, x + 4, y + 11, 8, 3)
def teacher_desk(img, x, y):
    shadow(img, x - 2, y + 12, 52, 8)
    rect(img, x, y, 48, 8, '#b9894e'); rect(img, x, y, 48, 1, '#dcae72'); rect(img, x, y + 7, 48, 1, '#7e5a30')
    rect(img, x, y + 8, 48, 7, '#8d6436'); rect(img, x + 2, y + 9, 44, 1, '#a57844')
    for k in (4, 20, 36): rect(img, x + k, y + 10, 8, 3, '#74522c'); rect(img, x + k + 3, y + 11, 2, 1, '#d6c290')
    outline(img, x, y, 48, 15)
    # (a register and a pot of chalk on it)
    rect(img, x + 6, y + 2, 10, 4, '#3a5a9a'); rect(img, x + 6, y + 2, 10, 1, '#6c8cc8')
    rect(img, x + 36, y + 2, 5, 4, '#e8e8e0'); rect(img, x + 37, y + 1, 1, 2, '#f8f8f8'); rect(img, x + 39, y + 1, 1, 2, '#f0c8c8')
def blackboard(img, x, y, w, h):
    rect(img, x - 2, y - 2, w + 4, h + 5, '#7a5530'); rect(img, x - 2, y - 2, w + 4, 1, '#a47648')
    for yy in range(h):
        img[y + yy, x:x + w] = hexc('#2f5b40') * (0.92 + 0.08 * yy / h) + np.array([0, 0, 0, 0])
        img[y + yy, x:x + w, 3] = 255
    # chalk: a date, a few lines, and a card's outline
    for (cx, cy, cw) in ((x + 4, y + 4, 18), (x + 4, y + 8, 30), (x + 4, y + 12, 24), (x + 4, y + 16, 14)):
        for k in range(cw):
            if rng.random() > 0.25: img[cy, cx + k, :3] = [226, 232, 224]
    cx, cy = x + w - 16, y + 3
    outline(img, cx, cy, 10, 14, '#e6ece4'); outline(img, cx + 2, cy + 2, 6, 5, '#e6ece4')
    rect(img, x + 2, y + h, w - 4, 2, '#5e4224'); rect(img, x + 10, y + h, 4, 1, '#f4f4f0'); rect(img, x + 20, y + h, 3, 1, '#f4c0c0')
def lockers(img, x, y, n):
    for i in range(n):
        lx = x + i * 11
        rect(img, lx, y, 11, 26, '#7d93a8'); rect(img, lx, y, 11, 1, '#a8bcd0'); rect(img, lx + 10, y, 1, 26, '#566a7e')
        for k in (3, 6): rect(img, lx + 3, y + k, 5, 1, '#4e6276')
        rect(img, lx + 7, y + 12, 2, 3, '#d8d8d0')
    outline(img, x, y, n * 11 + 1, 26)
    shadow(img, x - 2, y + 22, n * 11 + 4, 8, 0.8)

# ---------- The front (Reshef's Pegasus Castle front, screen 50) ----------
front = flat('RD_50')
# Its stone a school's: the grey of the walls, warmed and lightened (above the gardens).
f = front[:80].copy()
grey = (f[:, :, :3].max(axis=2) - f[:, :, :3].min(axis=2)) < 26
lum = f[:, :, :3].mean(axis=2)
warm = np.stack([lum * 1.10 + 52, lum * 1.02 + 40, lum * 0.86 + 22], 2).clip(0, 255)
f[:, :, :3] = np.where(grey[:, :, None], warm, f[:, :, :3])
front[:80] = f
# The gargoyles at the path's foot: lawn, from just above them.
for (x0, x1) in ((60, 92), (148, 180)):
    front[124:160, x0:x1] = front[96:132, x0:x1]
# A clock over the door (the school's).
cx, cy = 120, 10
for y in range(cy - 7, cy + 8):
    for x in range(cx - 7, cx + 8):
        d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
        if d <= 7: front[y, x] = hexc('#3a3430') if d > 6 else hexc('#f4efe2')
for k in range(5): front[cy - k, cx, :3] = [40, 30, 30]
for k in range(4): front[cy, cx + k, :3] = [40, 30, 30]
front_top = np.zeros_like(front)
save('DH_00', front, front_top)

# ---------- The entrance hall (the Sacred Cards' hotel lobby, screen 54) ----------
hall = flat('SC_54')
r, g, b = hall[:, :, 0], hall[:, :, 1], hall[:, :, 2]
carpet = (r > 40) & (r > g * 1.6) & (r > b * 1.25)
yy, xx = np.mgrid[0:160, 0:240]
keep = ((xx >= 36) & (xx < 64) & (yy < 56)) | ((xx >= 96) & (xx < 120) & (yy < 52))   # (the red door and the red post box)
carpet &= ~keep & (yy >= 40)
# (its pattern's light kept: the red's brightness, made the pale grey-green of a school's floor tiles)
v = (r / 255.0)
tiles = np.stack([v * 196 + 26, v * 204 + 28, v * 190 + 26], 2)
lines = ((xx + yy // 2) % 16 == 0) | (yy % 8 == 0)
tiles[lines] *= 0.9
hall[:, :, :3] = np.where(carpet[:, :, None], tiles, hall[:, :, :3])
hall_top = load('SC_54', '-top')
save('DH_01', hall, hall_top)

# ---------- The classroom (the Sacred Cards' warehouse, screens 47 and 48) ----------
a, b2 = flat('SC_47'), flat('SC_48')
fl = lambda x: x[:, :, :3].max(axis=2) - 1.6 * (x[:, :, :3].max(axis=2) - x[:, :, :3].min(axis=2))
pick = np.array(Image.fromarray(((fl(b2) > fl(a)) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))) > 127
room = np.where(pick[:, :, None], b2, a)
mx, mn = room[:, :, :3].max(axis=2), room[:, :, :3].min(axis=2)
clutter = (((mx - mn) / np.maximum(mx, 1)) > 0.16) | (mx < 84)
floor_region = np.zeros((160, 240), bool)
for y in range(44, 158):
    # (the floor: between the side walls, which lean in toward the front)
    x0 = 30 if y < 140 else 30 + (y - 140); x1 = 218 if y < 140 else 218 - (y - 140)
    floor_region[y, x0:x1] = True
clutter &= floor_region
clutter = np.array(Image.fromarray((clutter * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
clutter &= floor_region
# The whole floor made a classroom's: wooden boards, in the warehouse floor's own light (a smooth fit of it).
ys, xs = np.nonzero(floor_region & ~clutter)
basis = lambda x, y: np.stack([np.ones_like(x), x, y, x * x, y * y, x * y], 1).astype(float) / [1, 240, 160, 240 ** 2, 160 ** 2, 240 * 160]
coef, *_ = np.linalg.lstsq(basis(xs, ys), room[ys, xs, :3].mean(axis=1), rcond=None)
fy, fx = np.nonzero(floor_region)
light = (basis(fx, fy) @ coef) / 255.0
plank = (fy // 6) % 2
joint = ((fx + (fy // 6) * 23) % 40 == 0) | (fy % 6 == 0)
grain = np.array([rng.uniform(-0.04, 0.04) for _ in range(len(fx))])
k = (0.62 + 0.5 * light + grain + plank * 0.03 - joint * 0.12)[:, None]
room[fy, fx, :3] = (k * np.array([212, 160, 104])).clip(0, 255)
blackboard(room, 92, 10, 58, 22)
lockers(room, 36, 30, 4)
teacher_desk(room, 96, 46)
DESKS = [(x, y) for y in (5, 7) for x in (3, 5, 9, 11)]   # (tiles: two rows of four, an aisle down the middle)
for (tx, ty) in DESKS: pupil_desk(room, tx * 16, ty * 16 - 2)
save('DH_02', room, np.zeros_like(room))

# ---------- The maps ----------
# (Walls and things: '#'. Exits: 'v' down off the screen, 'D' a door stepped into, 'm' out onto Domino City's map.
# Signs: 's'.)
GRIDS = {
    'DH_00': ['###############',
              '###############',
              '###############',
              '###############',
              '#######D#######',
              '#####s...######',
              '#####.....#####',
              '#####.....#####',
              '#####.....#####',
              '....mmmmmmm....'],
    'DH_01': ['###############',
              '###############',
              '###############',
              '##.D...########',
              '##.....##s#####',
              '##...........##',
              '#####.#####.###',
              '#####.#####.###',
              '#####.#####.###',
              '###..vvvvv...##'],
    'DH_02': ['###############',
              '###############',
              '#####.......###',
              '#####.###....##',
              '##............#',
              '##.#.#...#.#..#',
              '##............#',
              '##.#.#...#.#..#',
              '##............#',
              '###...vvv...###']}
ARROW = {'v': 0x65, '^': 0x64}
links = {   # (each map's exits: the map they lead to, and which of its warps you arrive on)
    'DH_00': {'D': ('DH_01', 'v')},
    'DH_01': {'v': ('DH_00', 'D'), 'D': ('DH_02', 'v')},
    'DH_02': {'v': ('DH_01', 'D')}}
maps = {}
for name, grid in GRIDS.items():
    collision, behavior, warps = [], [], []
    for y, row in enumerate(grid):
        for x, c in enumerate(row):
            collision.append(1 if c in '#s' else 0)
            behavior.append(ARROW.get(c, 0x61 if c == 'D' else 0))
            if c in links[name]: warps.append({'x': x, 'y': y, 'kind': c})
    triggers = [{'x': x, 'y': y, 'script': 'Domino_WorldMap'} for y, row in enumerate(grid) for x, c in enumerate(row) if c == 'm']
    maps[name] = {'grid': grid, 'collision': collision, 'behavior': behavior, 'warps': warps, 'triggers': triggers}
def first_warp(name, kind):
    ws = [i for i, w in enumerate(maps[name]['warps']) if w['kind'] == kind]
    return ws[len(ws) // 2] if ws else 0
TITLE = 'Domino High School'
out = {}
for name, m in maps.items():
    ws = []
    for w in m['warps']:
        dest, kind = links[name][w['kind']]
        idx = first_warp(dest, kind)
        ws.append({'x': w['x'], 'y': w['y'], 'map': dest, 'warp': idx})
    people, signs = [], []
    for y, row in enumerate(m['grid']):
        for x, c in enumerate(row):
            if c == 's' and name == 'DH_00': signs.append({'x': x, 'y': y, 'script': 'DominoHigh_Sign', 'text': ['DOMINO HIGH SCHOOL']})
            if c == 's' and name == 'DH_01': signs.append({'x': x, 'y': y, 'script': 'DominoHigh_Reception', 'text': ['Reception: The staff room is through\nhere. Pupils only with a teacher!']})
    out[name] = {
        'name': name, 'title': TITLE, 'width': W, 'height': H, 'type': 'indoor', 'realm': 'yugioh',
        'music': 'mus_celadon' if name == 'DH_00' else 'mus_school', 'cycling': False, 'showName': name == 'DH_00', 'top': True,
        'borderWidth': 2, 'borderHeight': 2, 'fixedCamera': True, 'overTop': [1] * (W * H),
        'collision': m['collision'], 'elevation': [3] * (W * H), 'behavior': m['behavior'], 'encounter': [0] * (W * H),
        'connections': [], 'warps': ws, 'signs': signs, 'triggers': m['triggers'], 'hidden': [], 'people': people, 'wild': None}
# Yugi and his friends, and three pupils (The Sacred Cards' and Reshef's townsfolk): one in front, one in the hall, one
# in the classroom.
def person(id_, x, y, sprite, move, text):
    return {'id': id_, 'x': x, 'y': y, 'movement': move, 'rangeX': 1, 'rangeY': 1, 'script': 'DominoHigh_Person%d' % id_, 'flag': None,
            'text': text, 'sprite': sprite, 'width': 32, 'height': 32, 'frames': 9, 'localId': 'LOCALID_DOMINO_HIGH_%d' % id_}
out['DH_00']['people'] = [person(7, 6, 8, 'rd_person_050', 'wander_around', ["I was up all night building my deck.", "Now I'm going to fall asleep in\nmath class..."])]
out['DH_01']['people'] = [person(9, 11, 7, 'sc_person_27', 'face_up', ["I traded my lunch for a Kuriboh card.", "Totally worth it."])]
out['DH_02']['people'] = [person(4, 4, 6, 'rd_person_053', 'face_up', ['Psst! Did you bring your deck?', "Let's duel at lunch!"]),
                          # (Yugi and his friends, by the windows)
                          person(12, 10, 3, 'rd_yugi', 'face_down', ["Yugi: Hi! I'm Yugi Muto.", "My grandpa runs the Kame Game shop.\nHe has the best cards in Domino!",
                                                                    "Do you play Duel Monsters too?\nLet's be friends!"]),
                          person(13, 11, 3, 'rd_tea', 'face_down', ["Téa: Hi there! I'm Téa Gardner.", "I'm friends with Yugi and the guys.\nSomeone has to keep them out of\ntrouble!",
                                                                   "Someday I'm going to dance on\nstage in New York!"]),
                          person(14, 12, 4, 'rd_joey', 'face_left', ["Joey: Hey! The name's Joey Wheeler.", "Yugi's teachin' me to duel. I'm gonna\nbe the best duelist in Domino City!",
                                                                    "...Well, after Yugi, anyway."]),
                          person(15, 13, 4, 'sc_person_49', 'face_left', ["Tristan: Yo! I'm Tristan Taylor.", "Joey and I go way back. Now we've\ngot Yugi's back, too.",
                                                                          "That's what friends are for!"])]
START = '// Domino High School (tools/build-domino-high.py): its front, hall and classroom.\n'
END = '// (End of Domino High School.)\n'
js = START + ''.join('window.WORLD_MAPS[%s] = %s;\n' % (json.dumps(k), json.dumps(v, separators=(',', ':'))) for k, v in out.items()) + \
    '''(function () {
  // The Kame Game shop (Reshef's screen 6, outside; 7, inside): out of it, Domino City's map (its east edge, and the
  // road north at its west), and not Reshef's next screen; and Yugi's grandpa at its counter.
  const W = window.WORLD_MAPS, shop = W.RD_06, inside = W.RD_07;
  if (!shop || !inside) return;
  const out = [[14, 0], [14, 1], [14, 2], [14, 3], [14, 4], [14, 5], [14, 6], [14, 7], [3, 0], [4, 0]];
  const kept = {};
  shop.warps = shop.warps.filter((w, i) => w.map === "RD_07" && ((kept[i] = Object.keys(kept).length), true));
  for (const m of Object.values(W)) for (const w of m.warps || []) if (w.map === "RD_06") w.warp = kept[w.warp] != null ? kept[w.warp] : 0;
  for (const [x, y] of out) {
    shop.behavior[y * shop.width + x] = 0;
    if (!shop.triggers.some((t) => t.x === x && t.y === y)) shop.triggers.push({ x, y, script: "Domino_WorldMap" });
  }
  shop.realm = inside.realm = "yugioh";
  shop.title = inside.title = "Kame Game Shop";
  if (!inside.people.some((p) => p.script === "KameGame_Grandpa"))
    inside.people.push({ id: 0, x: 5, y: 4, movement: "face_down", rangeX: 1, rangeY: 1, script: "KameGame_Grandpa", flag: null, text: null,
      sprite: "rd_grandpa", width: 32, height: 32, frames: 9, localId: "LOCALID_KAME_GAME_GRANDPA" });
  // (Kaiba Corporation, The Sacred Cards' (screens 22, 23, 41 and 40): out of its gate, Domino City's map, and not the
  // Sacred Cards' street; it's on the map once Yugi's sent you there.)
  const kc = W.SC_22;
  if (kc) {
    for (const w of kc.warps) if (w.map === "SC_01") { kc.behavior[w.y * kc.width + w.x] = 0; kc.triggers.push({ x: w.x, y: w.y, script: "Domino_WorldMap" }); }
    kc.warps = kc.warps.filter((w) => w.map !== "SC_01");
  }
  // (and the fountains' menu: Domino City's places)
  if (window.RESHEF && !window.RESHEF.areas.some((a) => a.title === "Domino High School"))
    window.RESHEF.areas.splice(1, 0, { title: "Domino High School", map: "DH_00", x: 7, y: 8, facing: "up" });
})();
''' + END
path = os.path.join(ROOT, 'data/emerald-maps.js')
text = open(path, encoding='utf8').read()
a0 = text.find(START)
if a0 >= 0: text = text[:a0] + text[text.index(END, a0) + len(END):]
open(path, 'w', encoding='utf8').write(text + js)
print('Domino High School: front, hall, classroom')
