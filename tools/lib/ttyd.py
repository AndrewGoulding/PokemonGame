# Paper Mario: The Thousand-Year Door's character models (the disc's files/a/<name>, its textures in <name>-, a TPL),
# posed at a frame of one of their animations and drawn flat, as tools/build-player-looks.py takes its Piantas,
# Goombas and Koopas from them. After MeltyTool's TTYD importer (FinModelUtility) and PistonMiner's
# MarioSt_AnimGroupBase.bt, and noclip.website's AnimGroup.ts for the animations.
#
# A model (big-endian):
#   0x000  the animations' offset; then three 64-byte names (the model's, its textures', the build's); a mask, a
#          radius and a height (u32s); its bounds (6 floats); then 25 counts and 25 offsets, one of each a block:
#          0 scene graph objects (168 bytes: a name, then (base, count) for positions, normals, colours and eight
#          texture coordinates; its meshes' base and count, blend and cull), 1 polygons (base, count: a fan),
#          2 positions (3 floats), 3 their indices, 4 normals, 5 their indices, 6 colours (RGBA), 7 their indices,
#          8 texture coordinates' indices, 16 texture coordinates (2 floats), 18 samplers (texture, wrap),
#          19 textures (64 bytes: its TPL index at +4, its name at +12), 20 meshes (108 bytes: its sampler at +16, its
#          polygons' base and count at +56, its indices' bases after), 21 visibilities (a byte each), 22 transforms
#          (floats), 23 groups (88 bytes: a name, next, child, scene graph object, visibility, transforms' base,
#          joint), 24 animations (64 bytes: a name, its data's offset at +60)
#   the last group is the root; a group's 24 transforms are a translation, a scale, a rotation (x2 degrees), a
#          second rotation (a joint's, in degrees), then (not a joint) a rotation centre, a scale centre, and their
#          translations
#   an animation: 8 counts and 8 offsets (from its start) for its base info (loop, start, end), its keyframes (a time,
#          then (base, count) for each kind of change), and the changes: to the transforms (index step, value / 16,
#          in and out tangents as angles), to the visibilities (index step, +1 or -1)
import math, os, struct
import numpy as np
from PIL import Image

def be(fmt, d, o): return struct.unpack_from('>' + fmt, d, o)
def cstr(b): return b.split(b'\0')[0].decode('latin-1')

class Model:
    def __init__(self, folder, name):
        d = self.d = open(os.path.join(folder, name), 'rb').read()
        self.name, self.tex_name = cstr(d[4:68]), cstr(d[68:132])
        C, O = be('25i', d, 232), be('25I', d, 332)
        self.groups = [dict(name=cstr(d[p:p + 64]), next=be('i', d, p + 64)[0], child=be('i', d, p + 68)[0], sgo=be('i', d, p + 72)[0],
                            vis=be('i', d, p + 76)[0], tbase=be('i', d, p + 80)[0], joint=be('I', d, p + 84)[0] != 0)
                       for p in (O[23] + 88 * k for k in range(C[23]))]
        self.sgos = []
        for k in range(C[0]):
            v = be('26i', d, O[0] + 168 * k + 64)
            self.sgos.append(dict(vpos=v[0], vcol=v[4], tc=v[6], mesh_base=v[22], mesh_count=v[23], cull=v[25]))
        self.meshes = []
        for k in range(C[20]):
            v = be('27i', d, O[20] + 108 * k)
            self.meshes.append(dict(sampler=v[4], poly_base=v[14], poly_count=v[15], vpos=v[16], vcol=v[18], tc=v[19]))
        self.polys = [be('iI', d, O[1] + 8 * k) for k in range(C[1])]
        self.vpos = [be('3f', d, O[2] + 12 * k) for k in range(C[2])]
        self.vposi = be('%di' % C[3], d, O[3])
        self.cols = [d[O[6] + 4 * k:O[6] + 4 * k + 4] for k in range(C[6])]
        self.coli = be('%di' % C[7], d, O[7])
        self.tci = be('%di' % C[8], d, O[8])
        self.tc = [be('2f', d, O[16] + 8 * k) for k in range(C[16])]
        self.samplers = [be('ii', d, O[18] + 8 * k) for k in range(C[18])]
        self.textures = [dict(tpl=be('i', d, O[19] + 64 * k + 4)[0], name=cstr(d[O[19] + 64 * k + 12:O[19] + 64 * k + 64]).split('/')[-1].rsplit('.', 1)[0])
                         for k in range(C[19])]
        self.gvis = [b != 0 for b in be('%db' % C[21], d, O[21])]
        self.gtr = list(be('%df' % C[22], d, O[22]))
        self.anims = {cstr(d[p:p + 16]): be('I', d, p + 60)[0] for p in (O[24] + 64 * k for k in range(C[24]))}
        self.tpl = read_tpl(os.path.join(folder, self.tex_name + '-'))

    def anim(self, name):
        off, d = self.anims[name], self.d
        h = be('17I', d, off); n, o = h[1:9], h[9:17]
        return dict(end=be('Iff', d, off + o[0])[2], kfs=[be('f10I', d, off + o[1] + 44 * k) for k in range(n[1])],
                    vd=[be('Bb', d, off + o[5] + 2 * k) for k in range(n[5])], gd=[be('Bbbb', d, off + o[6] + 4 * k) for k in range(n[6])])

    def pose(self, a, frame):
        """-> (transforms, visibilities) `frame` frames into the animation `a`."""
        T, V = list(self.gtr), list(self.gvis)
        keys = [(k[0], a['gd'][k[9]:k[9] + k[10]]) for k in a['kfs'] if k[10]]
        def at_once(ds):
            i = 0
            for di, v, _, _ in ds: i += di; T[i] += v / 16
        if len(keys) == 1: at_once(keys[0][1])
        elif keys:
            i1 = next((i for i, (t, _) in enumerate(keys) if frame < t), len(keys))
            for i in range(i1): at_once(keys[i][1])
            if 0 < i1 < len(keys):
                t0, t1 = keys[i1 - 1][0], keys[i1][0]; dur = t1 - t0; t = (frame - t0) / dur; t2, t3 = t * t, t * t * t
                i = 0
                for di, v, tin, tout in keys[i1][1]:
                    i += di; v /= 16
                    if tout == 90: T[i] += v; continue
                    T[i] += (t3 - t2) * dur * TANGENTS[tout + 89] + (-2 * t3 + 3 * t2) * v + (t3 - 2 * t2 + t) * dur * TANGENTS[tin + 89]
        for k in a['kfs']:
            if k[0] > frame: break
            i = 0
            for gid, vis in a['vd'][k[7]:k[7] + k[8]]: i += gid; V[i] = vis == 1
        return T, V

    def world(self, T):
        W = [None] * len(self.groups)
        todo = [(len(self.groups) - 1, None, np.eye(4))]
        while todo:
            i, p, P = todo.pop(); g = self.groups[i]
            W[i] = P @ local(g, T, self.groups[p] if p is not None else None)
            if g['next'] != -1: todo.append((g['next'], p, P))
            if g['child'] != -1: todo.append((g['child'], i, W[i]))
        return W

    def triangles(self, T, V, yaw=0, hide=()):
        """-> [(3 positions, 3 texture coordinates, 3 colours, texture index or -1, cull)], posed and turned `yaw`
        degrees about the up axis; groups named in `hide` left out."""
        W, Y, out = self.world(T), rot((0, math.radians(yaw), 0)), []
        for gi, g in enumerate(self.groups):
            if g['sgo'] == -1 or not V[g['vis']] or g['name'] in hide: continue
            o = self.sgos[g['sgo']]; X = Y @ W[gi]
            for mesh in self.meshes[o['mesh_base']:o['mesh_base'] + o['mesh_count']]:
                if mesh['poly_base'] == -1: continue
                tex = self.samplers[mesh['sampler']][0] if mesh['sampler'] != -1 else -1
                for vb, n in self.polys[mesh['poly_base']:mesh['poly_base'] + mesh['poly_count']]:
                    P, U, C = [], [], []
                    for j in range(n):
                        P.append((X @ np.array([*self.vpos[o['vpos'] + self.vposi[mesh['vpos'] + vb + j]], 1]))[:3])
                        C.append(np.array(list(self.cols[o['vcol'] + self.coli[mesh['vcol'] + vb + j]])) / 255)
                        U.append(self.tc[o['tc'] + self.tci[mesh['tc'] + vb + j]] if tex != -1 else (0, 0))
                    for j in range(1, n - 1):
                        out.append(((P[0], P[j], P[j + 1]), (U[0], U[j], U[j + 1]), (C[0], C[j], C[j + 1]), tex, o['cull']))
        return out

    def draw(self, tris, scale, size, origin):
        """Draws the triangles orthographically, looking down -Z, +Y up, `scale` pixels a unit, the model's (0, 0) at
        `origin`. -> (RGBA floats, each pixel's texture index (-1: none))."""
        w, h = size; img = np.zeros((h, w, 4)); texof = np.full((h, w), -1); zb = np.full((h, w), -1e9)
        texels = {}
        for P, U, C, tex, cull in tris:
            q = [(origin[0] + p[0] * scale, origin[1] - p[1] * scale, p[2]) for p in P]
            (x0, y0, z0), (x1, y1, z1), (x2, y2, z2) = q
            area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
            if abs(area) < 1e-9 or (cull == 0 and area > 0) or (cull == 1 and area < 0) or cull == 2: continue
            xa, xb = max(0, math.floor(min(x0, x1, x2))), min(w - 1, math.ceil(max(x0, x1, x2)))
            ya, yb = max(0, math.floor(min(y0, y1, y2))), min(h - 1, math.ceil(max(y0, y1, y2)))
            if xa > xb or ya > yb: continue
            xs, ys = np.meshgrid(np.arange(xa, xb + 1) + .5, np.arange(ya, yb + 1) + .5)
            l1 = ((xs - x0) * (y2 - y0) - (x2 - x0) * (ys - y0)) / area
            l2 = ((x1 - x0) * (ys - y0) - (xs - x0) * (y1 - y0)) / area
            l0 = 1 - l1 - l2
            inside = (l0 >= -1e-6) & (l1 >= -1e-6) & (l2 >= -1e-6)
            if not inside.any(): continue
            z = l0 * z0 + l1 * z1 + l2 * z2
            col = (l0[..., None] * C[0] + l1[..., None] * C[1] + l2[..., None] * C[2])
            if tex != -1:
                if tex not in texels: texels[tex] = np.asarray(self.tpl[self.textures[tex]['tpl']].convert('RGBA'), dtype=float) / 255
                tx = texels[tex]; th, tw = tx.shape[:2]
                u = l0 * U[0][0] + l1 * U[1][0] + l2 * U[2][0]; v = l0 * U[0][1] + l1 * U[1][1] + l2 * U[2][1]
                col = col * tx[np.clip(v * th, 0, th - 1).astype(int), np.clip(u * tw, 0, tw - 1).astype(int)]
            sub = zb[ya:yb + 1, xa:xb + 1]; ok = inside & (z >= sub - 1e-4) & (col[..., 3] > 0.5)
            sub[ok] = z[ok]; img[ya:yb + 1, xa:xb + 1][ok] = col[ok]; texof[ya:yb + 1, xa:xb + 1][ok] = tex
        return img, texof

def local(g, T, parent):
    t = T[g['tbase']:g['tbase'] + 24]; d2r = math.pi / 180
    S, R1 = scale(t[3:6]), rot([v * 2 * d2r for v in t[6:9]])
    if g['joint']:
        undo = [1, 1, 1]
        if parent is not None and parent['joint']: undo = [1 / v if v else 1 for v in T[parent['tbase'] + 3:parent['tbase'] + 6]]
        return move(t[0:3]) @ scale(undo) @ rot([v * d2r for v in t[9:12]]) @ R1 @ S
    rc, sc, rt, st = (np.array(t[k:k + 3]) for k in (12, 15, 18, 21))
    return move(t[0:3]) @ move(rc + rt) @ R1 @ move(-rc) @ move(sc + st) @ S @ move(-sc)
def move(v): m = np.eye(4); m[:3, 3] = v; return m
def scale(v): return np.diag([*v, 1.0])
def rot(r):
    """Euler angles (radians), applied x, then y, then z."""
    (cx, cy, cz), (sx, sy, sz) = np.cos(r), np.sin(r)
    Rx = np.array([[1, 0, 0, 0], [0, cx, -sx, 0], [0, sx, cx, 0], [0, 0, 0, 1]])
    Ry = np.array([[cy, 0, sy, 0], [0, 1, 0, 0], [-sy, 0, cy, 0], [0, 0, 0, 1]])
    Rz = np.array([[cz, -sz, 0, 0], [sz, cz, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])
    return Rz @ Ry @ Rx

# The game's tangents for its keyframes' angles, -89 to 89 degrees (and 90: the negative of -89's).
TANGENTS = [struct.unpack_from('>f', bytes.fromhex(h))[0] for h in (
    'C26527CC C1E51673 C198A5E3 C164CF4C C136E156 C1183AB8 C1024F26 C0E3B0F5 C0CA0A2A C0B57B11 C0A4A01E C0968C45 C08A9B65 '
    'C0805849 C06ED9DB C05F31BD C0515597 C044F8B6 C039DE8E C02FD6A3 C026B9BF C01E67CA C016C641 C00FBF0C C0093F95 C0033828 '
    'BFFB36C7 BFF0BB9A BFE6EB03 BFDDB3D0 BFD50715 BFCCD7BC BFC51A46 BFBDC489 BFB6CD89 BFB02D43 BFA9DC95 BFA3D51C BF9E1118 '
    'BF988B5E BF933F42 BF8E2889 BF89435E BF848C3E BF7FFFFB BF77375B BF6EB94B BF6680DC BF5E898E BF56CF38 BF4F4DFD BF480252 '
    'BF40E8E7 BF39FEAD BF3340CA BF2CAC94 BF263F91 BF1FF76D BF19D1FD BF13CD38 BF0DE730 BF081E19 BF027040 BEF9B812 BEEEBFDD '
    'BEE3F4FF BED954BF BECEDC83 BEC489D1 BEBA5A4C BEB04BB3 BEA65BDD BE9C88B9 BE92D048 BE8930A1 BE7F4FD3 BE6C68B3 BE59A86A '
    'BE470B9F BE348F0D BE222F85 BE0FE9EE BDFB7675 BDD740E0 BDB32D3F BD8F35C8 BD56A987 BD0F0913 BC8EFDEB 00000000 3C8EFDEB '
    '3D0F0913 3D56A987 3D8F35C8 3DB32D3F 3DD740E0 3DFB7675 3E0FE9EE 3E222F85 3E348F0D 3E470B9F 3E59A86A 3E6C68B3 3E7F4FD3 '
    '3E8930A1 3E92D048 3E9C88B9 3EA65BDD 3EB04BB3 3EBA5A4C 3EC489D1 3ECEDC83 3ED954BF 3EE3F4FF 3EEEBFDD 3EF9B812 3F027040 '
    '3F081E19 3F0DE730 3F13CD38 3F19D1FD 3F1FF76D 3F263F91 3F2CAC94 3F3340CA 3F39FEAD 3F40E8E7 3F480252 3F4F4DFD 3F56CF38 '
    '3F5E898E 3F6680DC 3F6EB94B 3F77375B 3F7FFFFB 3F848C3E 3F89435E 3F8E2889 3F933F42 3F988B5E 3F9E1118 3FA3D51C 3FA9DC95 '
    '3FB02D43 3FB6CD89 3FBDC489 3FC51A46 3FCCD7BC 3FD50715 3FDDB3D0 3FE6EB03 3FF0BB9A 3FFB36C7 40033828 40093F95 400FBF0C '
    '4016C641 401E67CA 4026B9BF 402FD6A3 4039DE8E 4044F8B6 40515597 405F31BD 406ED9DB 40805849 408A9B65 40968C45 40A4A01E '
    '40B57B11 40CA0A2A 40E3B0F5 41024F26 41183AB8 4136E156 4164CF4C 4198A5E3 41E51673').split()]
TANGENTS.append(-TANGENTS[0])

# ---------- TPL textures ----------
def read_tpl(path):
    if not os.path.exists(path): return []
    d = open(path, 'rb').read(); n, at = be('iI', d, 4); out = []
    for k in range(n):
        h, w, fmt, off = be('HHII', d, be('I', d, at + 8 * k)[0])
        out.append(decode(d, off, w, h, fmt))
    return out
def c565(c): return ((c >> 11) * 255 // 31, (c >> 5 & 63) * 255 // 63, (c & 31) * 255 // 31)
def rgb5a3(v):
    if v & 0x8000: return ((v >> 10 & 31) * 255 // 31, (v >> 5 & 31) * 255 // 31, (v & 31) * 255 // 31, 255)
    return ((v >> 8 & 15) * 17, (v >> 4 & 15) * 17, (v & 15) * 17, (v >> 12 & 7) * 255 // 7)
def decode(d, o, w, h, fmt):
    """A TPL image (I4 0, I8 1, IA4 2, IA8 3, RGB565 4, RGB5A3 5, RGBA8 6, CMPR 14), in its tiles, -> an RGBA Image."""
    im = Image.new('RGBA', (w, h)); px = im.load()
    def put(x, y, c):
        if x < w and y < h: px[x, y] = c
    if fmt == 14:   # 8x8 tiles of four 4x4 DXT1 blocks
        for ty in range(0, h, 8):
            for tx in range(0, w, 8):
                for sub in range(4):
                    c0, c1, bits = be('HHI', d, o); o += 8
                    p0, p1 = c565(c0), c565(c1)
                    if c0 > c1: pal = [p0, p1, tuple((2 * a + b) // 3 for a, b in zip(p0, p1)), tuple((a + 2 * b) // 3 for a, b in zip(p0, p1))]
                    else: pal = [p0, p1, tuple((a + b) // 2 for a, b in zip(p0, p1)), None]
                    for i in range(16):
                        c = pal[bits >> (30 - 2 * i) & 3]
                        put(tx + (sub & 1) * 4 + i % 4, ty + (sub >> 1) * 4 + i // 4, c + (255,) if c else (0, 0, 0, 0))
        return im
    bw, bh, size = {0: (8, 8, 32), 1: (8, 4, 32), 2: (8, 4, 32), 3: (4, 4, 32), 4: (4, 4, 32), 5: (4, 4, 32), 6: (4, 4, 64)}[fmt]
    for ty in range(0, h, bh):
        for tx in range(0, w, bw):
            for i in range(bw * bh):
                if fmt == 0: v = (d[o + i // 2] >> (4 if i % 2 == 0 else 0) & 15) * 17; c = (v, v, v, v)
                elif fmt == 1: v = d[o + i]; c = (v, v, v, v)
                elif fmt == 2: b = d[o + i]; c = ((b & 15) * 17,) * 3 + ((b >> 4) * 17,)
                elif fmt == 3: c = (d[o + 2 * i + 1],) * 3 + (d[o + 2 * i],)
                elif fmt == 4: c = c565(be('H', d, o + 2 * i)[0]) + (255,)
                elif fmt == 5: c = rgb5a3(be('H', d, o + 2 * i)[0])
                else: c = (d[o + 2 * i + 1], d[o + 32 + 2 * i], d[o + 33 + 2 * i], d[o + 2 * i])
                put(tx + i % bw, ty + i // bw, c)
            o += size
    return im
