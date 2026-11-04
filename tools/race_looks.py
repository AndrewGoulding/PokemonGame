#!/usr/bin/env python3
# The character creator's own people: one for each race, this game's own (drawn here, not taken from any game), in
# FireRed's overworld size (32x32, the feet on the bottom row) and its fifteen frames (standing facing you, away and
# to the left; two steps each way; the frames between, standing). tools/build-player-looks.py makes each a part
# ("race_<id>", a whole character) with its hair, clothes, trim and skin apart, so they're coloured as you choose.
#
# Each is drawn from a few shapes: a body (a grown-up's, a child's, a big round one, a Goomba's), a head, a hairstyle,
# ears, and what's the race's own (a Zora's head fin, a Namekian's antennae, horns and plates, a tail, a shell, a
# mushroom cap, a sprout); then shaded (each colour lighter along its top edge, darker along its bottom and right) and
# outlined. RACES: each race's shapes, its name, and its own colours (four shades each, darkest first).
ROLES = ('hair', 'outfit', 'trim', 'skin')
INK, EYE, SHOE, WHITE = (40, 36, 56), (28, 24, 40), (64, 52, 52), (244, 244, 236)

def hexs(*h): return [tuple(int(x[i:i + 2], 16) for i in (0, 2, 4)) for x in h]
SKIN = {'fair': hexs('a46a4a', 'd59473', 'f6bd94', 'ffdec5'), 'tan': hexs('7b4a29', 'b47341', 'd59c62', 'f6c58b'),
        'brown': hexs('4a2910', '7b4a29', 'a46a41', 'c58b5a')}

RACES = {
    'hylian':   dict(name='Hylian', body='adult', hair='fringe', ears='long', shoes='trim',
                     colours={'hair': hexs('6a4a10', 'a47b29', 'd5ac41', 'f6d56a'), 'outfit': hexs('204a6a', '316a9c', '4a94c5', '7bbde6'),
                              'trim': hexs('4a2910', '734118', '9c6229', 'c58b4a'), 'skin': SKIN['fair']}),
    'kokiri':   dict(name='Kokiri', body='kid', hair='bob', ears='pointed', extras=['leafhat'],
                     colours={'hair': hexs('204a10', '397b20', '5aa431', '8bd55a'), 'outfit': hexs('205a29', '398b41', '62b45a', '9cde83'),
                              'trim': hexs('5a3110', '835218', 'ac7b31', 'd5a45a'), 'skin': SKIN['fair']}),
    'zora':     dict(name='Zora', body='adult', hair='none', ears=None, extras=['fin', 'armfins'],
                     colours={'outfit': hexs('5a5a6a', '8b8b9c', 'bdbdcd', 'e6e6f6'), 'trim': hexs('10416a', '206a9c', '318bc5', '62b4e6'),
                              'skin': hexs('20527b', '3983b4', '5aaccd', '94d5ee')}),
    'gerudo':   dict(name='Gerudo', body='tall', hair='ponytail', ears='small', extras=['jewel'],
                     colours={'hair': hexs('6a1008', 'a42910', 'd54a20', 'f67b41'), 'outfit': hexs('4a1852', '732983', 'a441b4', 'cd73de'),
                              'trim': hexs('8b6208', 'c59410', 'e6c529', 'fff07b'), 'skin': SKIN['brown']}),
    'human':    dict(name='Human', body='adult', hair='short', ears='small', extras=['belt', 'wristbands'],
                     colours={'hair': hexs('181818', '312931', '4a414a', '6a626a'), 'outfit': hexs('204a29', '316a39', '4a9452', '73bd73'),
                              'trim': hexs('6a2010', '9c3118', 'c54a29', 'e6734a'), 'skin': SKIN['fair']}),
    'majin':    dict(name='Majin', body='round', hair='none', ears=None, extras=['tendril', 'scarf'],
                     colours={'outfit': hexs('31315a', '4a4a83', '6a6aac', '9494d5'), 'trim': hexs('8b6a08', 'c59c18', 'e6c539', 'fff083'),
                              'skin': hexs('a44a73', 'd5739c', 'f69cbd', 'ffcde6')}),
    'saiyan':   dict(name='Saiyan', body='adult', hair='spiky', ears='small', extras=['tail', 'pads'],
                     colours={'hair': hexs('181010', '312020', '4a3129', '6a4a41'), 'outfit': hexs('202939', '313952', '4a5273', '6a7b9c'),
                              'trim': hexs('7b6a52', 'ac9c7b', 'd5c5a4', 'f6eecd'), 'skin': SKIN['tan']}),
    'namekian': dict(name='Namekian', body='adult', hair='none', ears='pointed', extras=['antennae', 'belt'],
                     colours={'outfit': hexs('4a2962', '6a3983', '8b52ac', 'b47bd5'), 'trim': hexs('20315a', '314a83', '4a6aac', '7394d5'),
                              'skin': hexs('206a10', '399420', '5abd39', '94e66a')}),
    'android':  dict(name='Android', body='adult', hair='short', ears='small', extras=['visor', 'panel'],
                     colours={'hair': hexs('5a5a62', '8b8b94', 'b4b4bd', 'deded6'), 'outfit': hexs('202931', '313d4a', '4a5a6a', '6a8394'),
                              'trim': hexs('8b1010', 'c52020', 'ee4141', 'ff8b7b'), 'skin': SKIN['fair']}),
    'arcosian': dict(name='Frieza Clan', body='adult', hair='horns', ears=None, extras=['dome', 'plates', 'tail_skin'],
                     colours={'hair': hexs('5a4a31', '8b7352', 'b49c7b', 'decdac'), 'outfit': hexs('31394a', '4a5a6a', '6a7b8b', '9cacbd'),
                              'trim': hexs('105a52', '208b7b', '39b4a4', '7be6d5'), 'skin': hexs('6a8394', '94acbd', 'bdd5de', 'e6f6ff')}),
    'kai':      dict(name='Kai', body='adult', hair='mohawk', ears='pointed', extras=['earrings', 'robe'],
                     colours={'hair': hexs('8b8b94', 'b4b4bd', 'deded6', 'ffffff'), 'outfit': hexs('5a3110', '835a20', 'ac8b41', 'd5bd73'),
                              'trim': hexs('10527b', '207bac', '41a4d5', '7bcdee'), 'skin': hexs('5a4183', '7b62ac', 'a48bd5', 'cdb4f6')}),
    'mk_human': dict(name='Human', body='adult', hair='short', ears='small', extras=['flatcap', 'vest'], shoes='trim',
                     colours={'hair': hexs('4a2910', '6a4118', '8b5a29', 'ac7b41'), 'outfit': hexs('205a31', '318b4a', '4ab46a', '83de9c'),
                              'trim': hexs('5a3910', '835218', 'ac7b39', 'd5a462'), 'skin': SKIN['fair']}),
    'toad':     dict(name='Mushroom Person', body='kid', hair='mushroom', ears=None, extras=['vest'],
                     colours={'hair': hexs('4a1883', '6a29ac', '9452d5', 'c58bf6'), 'outfit': hexs('205a6a', '31839c', '4aacc5', '83d5e6'),
                              'trim': hexs('6a5210', '9c7b20', 'c5a439', 'eed573'), 'skin': hexs('c5834a', 'e6a462', 'f6c583', 'ffe6b4')}),
    'pianta':   dict(name='Pianta', body='pianta', hair='sprout', ears=None, extras=[],
                     colours={'hair': hexs('184a10', '296a18', '419429', '6abd4a'),
                              'outfit': hexs('184a83', '2962ac', '4a8bd5', '7bb4ee'), 'trim': hexs('8b6a10', 'bd9420', 'e6bd39', 'ffe67b'),
                              'skin': hexs('a45a10', 'd58320', 'f6a441', 'ffcd7b')}),
    'goomba':   dict(name='Goomba', body='goomba', hair='none', ears=None, extras=[],
                     colours={'outfit': hexs('6a1818', '9c2929', 'cd4141', 'ee7b6a'), 'trim': hexs('5a3918', '835229', 'ac7b4a', 'd5a46a'),
                              'skin': hexs('5a3118', '8b4a20', 'b46a31', 'd59452')}),
    'koopa':    dict(name='Koopa', body='kid', hair='none', ears=None, extras=['shell', 'beak'], shoes='trim',
                     colours={'outfit': hexs('18397b', '2952ac', '4a7bd5', '83acee'), 'trim': hexs('8b4110', 'c56a18', 'ee9431', 'ffc573'),
                              'skin': hexs('a48310', 'd5b420', 'f6d541', 'fff68b')}),
    'kanto':    dict(name='Trainer', body='adult', hair='short', ears='small', extras=['cap', 'bag'],
                     colours={'hair': hexs('292020', '4a3929', '6a5239', '8b7352'), 'outfit': hexs('8b4110', 'c56a18', 'ee9431', 'ffc573'),
                              'trim': hexs('184a20', '297331', '419c4a', '7bcd7b'), 'skin': SKIN['fair']}),
}

# ---------- Drawing ----------
class Canvas:
    def __init__(self): self.p = {}
    def put(self, x, y, role):
        if 0 <= x < 32 and 0 <= y < 31: self.p[(x, y)] = role
    def rect(self, x0, y0, x1, y1, role):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): self.put(x, y, role)
    def oval(self, x0, y0, x1, y1, role):
        cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 0.5, (y1 - y0) / 2 + 0.5
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0: self.put(x, y, role)
    def head(self, x0, y0, x1, y1, role):
        # (a chibi head: a rectangle with its corners cut)
        self.rect(x0 + 1, y0, x1 - 1, y1, role); self.rect(x0, y0 + 1, x1, y1 - 1, role)

# The bodies: where the head and torso are, and how long the legs (each facing; x from the left of the cell).
BODIES = {
    'adult': dict(head=(10, 6, 21, 16), torso=(11, 17, 20, 23), legs=(24, 29), arm=(17, 22)),
    'tall':  dict(head=(10, 4, 21, 14), torso=(11, 15, 20, 22), legs=(23, 29), arm=(15, 21)),
    'kid':   dict(head=(10, 9, 21, 18), torso=(11, 19, 20, 24), legs=(25, 29), arm=(19, 23)),
    'round': dict(head=(11, 5, 20, 13), torso=(8, 14, 23, 26), legs=(27, 29), arm=(16, 22)),
}

def legs(c, d, step, top, bot, shoes):
    """The legs and feet: facing you or away, two apart, one lifted a pixel in a step; side on, together, or apart."""
    shoe = 'trim' if shoes == 'trim' else 'SHOE'
    if d in (0, 1):
        for i, (x0, x1) in enumerate(((12, 14), (17, 19))):
            lift = 1 if (step == 1 and i == 0) or (step == 2 and i == 1) else 0
            c.rect(x0, top, x1, bot - 1 - lift, 'outfit_leg')
            c.rect(x0, bot - lift, x1, bot - lift, shoe)
    else:
        spread = [(14, 16), (15, 17)] if step == 0 else ([(12, 14), (17, 19)] if step == 1 else [(13, 15), (16, 18)])
        for x0, x1 in spread:
            c.rect(x0, top, x1, bot - 1, 'outfit_leg')
            c.rect(x0 - 1, bot, x1, bot, shoe)

def eyes(c, d, hx0, hx1, ey):
    if d == 0:
        for x in (hx0 + 3, hx1 - 3):
            c.put(x, ey, 'EYE'); c.put(x, ey + 1, 'EYE')
    elif d == 2:
        c.put(hx0 + 2, ey, 'EYE'); c.put(hx0 + 2, ey + 1, 'EYE')

def draw(spec, d, step):
    """One frame: d 0 facing you, 1 away, 2 to the left; step 0 standing, 1 and 2 the steps."""
    c = Canvas(); body, ex = spec['body'], spec.get('extras', [])
    if body == 'goomba': return goomba(c, d, step)
    if body == 'pianta': return pianta(c, d, step, spec)
    B = BODIES[body]
    hx0, hy0, hx1, hy1 = B['head']; tx0, ty0, tx1, ty1 = B['torso']; lt, lb = B['legs']; ay0, ay1 = B['arm']
    if d == 2: hx0, hx1, tx0, tx1 = hx0 + 1, hx1 - 1, tx0 + 2, tx1 - 2
    # (behind it all: a shell, a ponytail or a tail, seen past the body)
    if 'shell' in ex and d != 1:
        if d == 0: c.oval(tx0 - 2, ty0 - 2, tx1 + 2, lt, 'outfit')
        else: c.oval(tx1 - 2, ty0 - 2, tx1 + 4, lt + 1, 'outfit'); c.oval(tx1 - 1, ty0 - 1, tx1 + 3, lt, 'outfit')
    if ('tail' in ex or 'tail_skin' in ex) and d != 0:
        role = 'skin' if 'tail_skin' in ex else 'hair'
        if d == 1: c.rect(15, ty1 - 1, 16, lb - 3, role); c.rect(17, lb - 4, 18, lb - 3, role)
        else: c.rect(tx1 + 1, ty1 - 1, tx1 + 4, ty1, role); c.rect(tx1 + 4, ty1 - 4, tx1 + 5, ty1 - 1, role)
    if spec['hair'] == 'ponytail' and d != 0:
        if d == 1: c.rect(15, hy0 + 2, 16, ty0 + 3, 'hair')
        else: c.rect(hx1 + 1, hy0 + 2, hx1 + 2, ty0 + 2, 'hair'); c.put(hx1 + 3, ty0 + 2, 'hair')
    if 'fin' in ex:
        if d == 1: c.rect(14, hy0 + 2, 17, ty1, 'skin'); c.rect(15, ty1 + 1, 16, ty1 + 2, 'skin')
        elif d == 2: c.rect(hx1 - 1, hy0 + 1, hx1 + 3, hy0 + 4, 'skin'); c.rect(hx1 + 1, hy0 + 4, hx1 + 4, ty0 + 3, 'skin'); c.rect(hx1 + 2, ty0 + 3, hx1 + 3, ty0 + 5, 'skin')
    # (the legs, the body and its arms)
    legs(c, d, step, lt, lb, spec.get('shoes'))
    if body == 'round': c.oval(tx0, ty0, tx1, ty1, 'outfit'); c.oval(tx0 + 2, ty0 + 3, tx1 - 2, ty1 - 1, 'skin') if d == 0 else None
    else: c.rect(tx0, ty0, tx1, ty1, 'outfit')
    if 'robe' in ex: c.rect(tx0 - 1, ty1 - 1, tx1 + 1, lt + 2, 'outfit')
    if 'vest' in ex and d == 0: c.rect(tx0 + 3, ty0, tx1 - 3, ty1, 'trim' if spec['body'] != 'kid' else 'skin')
    if 'belt' in ex or 'robe' in ex: c.rect(tx0 - (1 if 'robe' in ex else 0), ty1 - 1, tx1 + (1 if 'robe' in ex else 0), ty1 - 1, 'trim')
    if 'panel' in ex and d == 0: c.rect(tx0 + 3, ty0 + 2, tx1 - 3, ty0 + 3, 'trim')
    if 'plates' in ex: c.rect(tx0, ty0, tx1, ty0 + 1, 'trim')
    if 'pads' in ex:
        if d != 2: c.rect(tx0 - 1, ty0, tx0 + 1, ty0 + 1, 'trim'); c.rect(tx1 - 1, ty0, tx1 + 1, ty0 + 1, 'trim')
        else: c.rect(tx0, ty0, tx0 + 2, ty0 + 1, 'trim')
    if 'scarf' in ex: c.rect(tx0 + 3 if body == 'round' else tx0, ty0, tx1 - 3 if body == 'round' else tx1, ty0 + 1, 'trim')
    # (arms, swinging a pixel in a step)
    if d in (0, 1):
        sw = (1 if step == 1 else -1 if step == 2 else 0)
        for side, x0 in ((0, tx0 - 2), (1, tx1 + 1)):
            off = sw if side == 0 else -sw
            c.rect(x0, ay0 + max(0, off), x0 + 1, ay1 - 1 + max(0, off), 'outfit')
            c.rect(x0, ay1 + max(0, off), x0 + 1, ay1 + max(0, off), 'skin')
            if 'wristbands' in ex: c.rect(x0, ay1 - 1 + max(0, off), x0 + 1, ay1 - 1 + max(0, off), 'trim')
            if 'armfins' in ex: c.put(x0 + (-1 if side == 0 else 2), ay0 + 2 + max(0, off), 'skin')
    else:
        ax = (tx0 + tx1) // 2 + (-1 if step == 1 else 1 if step == 2 else 0)
        c.rect(ax, ay0, ax + 1, ay1 - 1, 'outfit'); c.rect(ax, ay1, ax + 1, ay1, 'skin')
        if 'wristbands' in ex: c.rect(ax, ay1 - 1, ax + 1, ay1 - 1, 'trim')
    if 'bag' in ex:
        if d == 1: c.rect(tx0 + 1, ty0 + 1, tx1 - 1, ty1 - 1, 'trim')
        elif d == 2: c.rect(tx1, ty0 + 1, tx1 + 2, ty1 - 1, 'trim')
        else: c.rect(tx0 + 1, ty0, tx0 + 1, ty1, 'trim')
    if 'shell' in ex and d == 1: c.oval(tx0 - 2, ty0 - 2, tx1 + 2, lt, 'outfit'); c.oval(tx0 - 1, ty0 - 1, tx1 + 1, lt - 1, 'shellmid')
    # (the head)
    hair = spec['hair']
    if hair == 'mushroom':
        # (a Mushroom Person: the face under a big cap, its spots the "hair")
        c.head(hx0 + 1, hy0 + 4, hx1 - 1, hy1, 'skin')
        cap0 = hy0 - 4
        c.oval(hx0 - 3, cap0, hx1 + 3, hy0 + 5, 'CAP')
        spots = [(hx0, cap0 + 3), (hx1 - 2, cap0 + 3), ((hx0 + hx1) // 2 - 1, cap0)] if d != 2 else [(hx0 + 1, cap0 + 2), (hx1 - 1, cap0 + 3)]
        if d == 1: spots.append(((hx0 + hx1) // 2 - 1, cap0 + 5))
        for sx, sy in spots: c.rect(sx, sy, sx + 2, sy + 2, 'hair')
        if d != 1: eyes(c, d, hx0 + 1, hx1 - 1, hy0 + 6)
        return finish(c, spec)
    c.head(hx0, hy0, hx1, hy1, 'skin')
    if 'beak' in ex and d != 1:
        if d == 0: c.rect(14, hy1 - 3, 17, hy1 - 1, 'skin')
        else: c.rect(hx0 - 2, hy1 - 4, hx0, hy1 - 2, 'skin')
    if d != 1: eyes(c, d, hx0, hx1, hy0 + 5 if body != 'round' else hy0 + 4)
    # (ears)
    ears = spec.get('ears')
    if ears and d != 1 or (ears and d == 1):
        ey = hy0 + 5
        if ears in ('long', 'pointed'):
            n = 4 if ears == 'long' else 2
            for k in range(n):
                if d in (0, 1):
                    c.put(hx0 - 1 - k, ey - k // 2, 'skin'); c.put(hx0 - 1 - k, ey + 1 - k // 2, 'skin')
                    c.put(hx1 + 1 + k, ey - k // 2, 'skin'); c.put(hx1 + 1 + k, ey + 1 - k // 2, 'skin')
                else:
                    c.put(hx1 - 3 + k, ey - 1 - k, 'skin'); c.put(hx1 - 3 + k, ey - k, 'skin')
        elif ears == 'small' and d == 2:
            c.rect(hx1 - 3, ey, hx1 - 2, ey + 1, 'skinshade')
        elif ears == 'small':
            c.put(hx0 - 1, ey + 1, 'skin'); c.put(hx1 + 1, ey + 1, 'skin')
        if 'earrings' in ex and d != 1:
            if d == 0: c.put(hx0 - 1, ey + 3, 'trim'); c.put(hx1 + 1, ey + 3, 'trim')
            else: c.put(hx1 - 3, ey + 2, 'trim')
    # (the hair)
    top = hy0
    if hair in ('short', 'fringe', 'spiky', 'bob', 'ponytail'):
        if d == 1: c.head(hx0, hy0, hx1, hy1 - (1 if hair in ('short', 'spiky') else 0), 'hair')
        elif d == 0:
            c.rect(hx0 + 1, hy0, hx1 - 1, hy0 + 2, 'hair'); c.rect(hx0, hy0 + 1, hx0, hy0 + 4, 'hair'); c.rect(hx1, hy0 + 1, hx1, hy0 + 4, 'hair')
            if hair == 'fringe': c.rect(hx0 + 1, hy0 + 3, hx0 + 4, hy0 + 3, 'hair'); c.rect(hx1 - 3, hy0 + 3, hx1 - 1, hy0 + 3, 'hair'); c.put(hx0 + 1, hy0 + 4, 'hair')
            if hair == 'bob': c.rect(hx0, hy0 + 1, hx0 + 1, hy1 - 2, 'hair'); c.rect(hx1 - 1, hy0 + 1, hx1, hy1 - 2, 'hair'); c.rect(hx0 + 2, hy0 + 3, hx1 - 2, hy0 + 3, 'hair')
        else:
            c.rect(hx0 + 1, hy0, hx1, hy0 + 2, 'hair'); c.rect(hx0 + 4, hy0 + 2, hx1, hy0 + 4, 'hair'); c.rect(hx1 - 1, hy0 + 4, hx1, hy1 - 3, 'hair')
            if hair == 'bob': c.rect(hx0 + 5, hy0 + 4, hx1, hy1 - 1, 'hair')
            if hair == 'fringe': c.put(hx0 + 1, hy0 + 3, 'hair'); c.put(hx0 + 2, hy0 + 3, 'hair')
        if hair == 'spiky':
            for k, x in enumerate(range(hx0, hx1 + 1, 3)):
                h = 3 + (k % 2)
                for j in range(h): c.rect(x + j // 2, hy0 - 1 - j, x + 2 - j // 2, hy0 - 1 - j, 'hair')
        if hair == 'ponytail' and d == 0: c.rect(14, hy0 - 2, 17, hy0, 'hair'); c.rect(15, hy0 - 3, 16, hy0 - 3, 'trim')
    elif hair == 'mohawk':
        mx = 14 if d != 2 else hx0 + 4
        c.rect(mx, hy0 - 3, mx + 3, hy0 + (2 if d != 1 else hy1 - hy0 - 2), 'hair')
    elif hair == 'horns':
        if d in (0, 1):
            for k in range(4): c.put(hx0 - 1 + (k // 2), hy0 + 2 - k, 'hair'); c.put(hx0 + (k // 2), hy0 + 2 - k, 'hair'); c.put(hx1 + 1 - (k // 2), hy0 + 2 - k, 'hair'); c.put(hx1 - (k // 2), hy0 + 2 - k, 'hair')
        else:
            for k in range(4): c.put(hx1 - 2 + k // 2, hy0 + 2 - k, 'hair'); c.put(hx1 - 1 + k // 2, hy0 + 2 - k, 'hair')
    elif hair == 'sprout':
        pass
    if 'leafhat' in ex:
        c.rect(hx0 + 2, hy0 - 2, hx1 - 2, hy0, 'outfit'); c.rect(hx0 + 5, hy0 - 4, hx0 + 7, hy0 - 3, 'outfit'); c.put(hx0 + 8, hy0 - 5, 'trim')
    if 'cap' in ex or 'flatcap' in ex:
        c.rect(hx0, hy0 - 1, hx1, hy0 + 2, 'trim')
        if d == 0: c.rect(hx0 + 1, hy0 + 3, hx1 - 1, hy0 + 3, 'trim' if 'cap' in ex else 'hair')
        elif d == 2: c.rect(hx0 - 3, hy0 + 2, hx0, hy0 + 2, 'trim')
    if 'dome' in ex: c.rect(hx0 + 2, hy0, hx1 - 2, hy0 + 2 if d != 1 else hy1 - 3, 'trim')
    if 'antennae' in ex:
        xs = (13, 18) if d != 2 else (hx0 + 4,)
        for x in xs: c.rect(x, hy0 - 3, x, hy0 - 1, 'skin'); c.rect(x - 1 if d != 2 else x, hy0 - 4, x if d != 2 else x + 1, hy0 - 4, 'skin')
    if 'tendril' in ex:
        if d == 2: c.rect(hx0 + 5, hy0 - 2, hx0 + 6, hy0 - 1, 'skin'); c.rect(hx0 + 7, hy0 - 3, hx0 + 9, hy0 - 2, 'skin')
        else: c.rect(15, hy0 - 2, 16, hy0 - 1, 'skin'); c.rect(16, hy0 - 4, 18, hy0 - 3, 'skin')
    if 'fin' in ex and d == 0: c.rect(15, hy0 - 3, 16, hy0, 'skin')
    if 'visor' in ex and d != 1:
        if d == 0: c.rect(hx0 + 1, hy0 + 4, hx1 - 1, hy0 + 6, 'trim')
        else: c.rect(hx0, hy0 + 4, hx0 + 4, hy0 + 6, 'trim')
    if 'jewel' in ex and d == 0: c.put(15, hy0 + 3, 'trim'); c.put(16, hy0 + 3, 'trim')
    return finish(c, spec)

def goomba(c, d, step):
    # (a Goomba: a mushroom-shaped body that's all head, its feet under it; a bandana round its middle)
    c.oval(7, 8, 24, 20, 'skin'); c.oval(9, 17, 22, 25, 'skinlow')
    if d != 1: c.rect(10, 20, 21, 21, 'outfit')
    else: c.rect(9, 20, 22, 21, 'outfit')
    for i, (x0, x1) in enumerate(((8, 13), (18, 23)) if d != 2 else ((10, 15), (14, 19))):
        lift = 1 if (step == 1 and i == 0) or (step == 2 and i == 1) else 0
        c.oval(x0, 25 - lift, x1, 29 - lift, 'trim')
    if d == 0:
        for x in (12, 18):
            c.rect(x, 13, x + 1, 15, 'WHITE'); c.put(x + (1 if x == 12 else 0), 14, 'EYE'); c.put(x + (1 if x == 12 else 0), 15, 'EYE')
        c.rect(11, 11, 13, 11, 'EYE'); c.rect(18, 11, 20, 11, 'EYE')
        c.put(13, 17, 'WHITE'); c.put(18, 17, 'WHITE')
    elif d == 2:
        c.rect(9, 13, 10, 15, 'WHITE'); c.put(9, 14, 'EYE'); c.put(9, 15, 'EYE'); c.rect(8, 11, 10, 11, 'EYE')
    return finish(c, None)

def pianta(c, d, step, spec):
    # (a Pianta: a big round body that's head and all, a little face high on it, a sprout on top; shorts; stubby legs)
    for i, (x0, x1) in enumerate(((10, 13), (18, 21)) if d != 2 else ((13, 16), (15, 18))):
        lift = 1 if (step == 1 and i == 0) or (step == 2 and i == 1) else 0
        c.rect(x0, 25, x1, 29 - lift, 'skin'); c.rect(x0 - 1, 29 - lift, x1, 29 - lift, 'SHOE')
    c.oval(6, 7, 25, 26, 'skin')
    c.rect(7, 21, 24, 25, 'outfit'); c.rect(7, 21, 24, 21, 'trim')
    sw = 1 if step == 1 else -1 if step == 2 else 0
    if d in (0, 1):
        c.rect(4, 14 + max(0, sw), 5, 19 + max(0, sw), 'skin'); c.rect(26, 14 + max(0, -sw), 27, 19 + max(0, -sw), 'skin')
    else: c.rect(14 + sw, 15, 16 + sw, 20, 'skinlow')
    c.rect(15, 3, 16, 7, 'hair'); c.oval(11, 1, 15, 4, 'hair'); c.oval(16, 0, 21, 3, 'hair')
    if d == 0:
        for x in (12, 18): c.rect(x, 11, x + 1, 13, 'EYE')
        c.rect(14, 15, 17, 16, 'skinshade')
    elif d == 2:
        c.rect(8, 11, 9, 13, 'EYE'); c.rect(5, 14, 7, 15, 'skinshade')
    return finish(c, spec)

def finish(c, spec):
    """The canvas's roles -> {(x, y): (role, shade)}: each role shaded (its top edge the lightest shade, its bottom and
    right edges darker; 'skinshade' and 'skinlow' its skin's darker shades, 'shellmid' the clothes' lighter), the fixed
    colours as they are, and an outline round it all."""
    raw = c.p; out = {}
    base = lambda r: {'outfit_leg': 'outfit', 'skinshade': 'skin', 'skinlow': 'skin', 'shellmid': 'outfit'}.get(r, r)
    for (x, y), r in raw.items():
        if r in ('EYE', 'SHOE', 'WHITE', 'CAP'):
            out[(x, y)] = (None, {'EYE': EYE, 'SHOE': SHOE, 'WHITE': WHITE, 'CAP': (236, 232, 224)}[r]); continue
        b = base(r)
        same = lambda xx, yy: base(raw.get((xx, yy), '')) == b
        if r == 'skinshade': s = 1
        elif r == 'skinlow': s = 1 if not same(x, y + 1) else 2
        elif r == 'shellmid': s = 3
        elif r == 'outfit_leg': s = 1 if not same(x + 1, y) else 2
        elif not same(x, y - 1): s = 3
        elif not same(x, y + 1) or not same(x + 1, y): s = 1
        else: s = 2
        out[(x, y)] = (b, s)
    # (the cap's own shading: lighter on top)
    for (x, y), (r, col) in list(out.items()):
        if r is None and col == (236, 232, 224) and (x, y - 1) not in out: out[(x, y)] = (None, WHITE)
        elif r is None and col == (236, 232, 224) and (x, y + 1) not in out: out[(x, y)] = (None, (196, 190, 184))
    for (x, y) in list(out):
        for a, b in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            k = (x + a, y + b)
            if k not in out and 0 <= k[0] < 32 and 0 <= k[1] < 32 and k not in out: out[k] = 'OUTLINE'
    return {k: ((None, INK) if v == 'OUTLINE' else v) for k, v in out.items()}

def frames(rid):
    """A race's fifteen frames, each {(x, y): (role or None, colour)}: its own colours put in for its shades."""
    spec = RACES[rid]; col = spec['colours']
    order = [(0, 0), (1, 0), (2, 0), (0, 1), (0, 2), (1, 1), (1, 2), (2, 1), (2, 2), (0, 0), (0, 0), (1, 0), (1, 0), (2, 0), (2, 0)]
    out = []
    for d, step in order:
        f = draw(spec, d, step)
        out.append({k: (r, v if r is None else col[r][v]) for k, (r, v) in f.items() if r is None or r in col})
    return out
