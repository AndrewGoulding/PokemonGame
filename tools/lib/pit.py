# Mario & Luigi: Partners in Time (the USA cartridge, ARME): its field sprites (FObj.dat and the like), for
# tools/build-player-looks.py's Toadsworth. Decoded here from the cartridge itself:
#   the cartridge's files: the NDS file name table and allocation table (header 0x40: FNT offset, size, FAT offset, size)
#   FObj.dat: a u32 offset table (its count the first offset / 4; 0xFFFFFFFF unused), its sub-files padded with FF
#   sub-file 0, the sprite table: u32 count, u32 palette count, then each sprite's u16 animation file, palette, an
#     extra file (0xFFFF none) and flags; its tiles the animation file + 1; palette p the sub-file after the last
#     tiles + p, BGR555, colour 0 clear
#   animation and tiles: AlphaDream's DS compression (decompress: as Bowser's Inside Story's, mnllib's): two varints
#     (the size, the blocks less one), then each block a u16 size and command bytes, four 2-bit commands each: 0 the
#     block's end, 1 a byte, 2 a copy back (offset b0 | (b1 & 0xF0) << 4, length (b1 & 0xF) + 2), 3 a byte repeated
#     (count + 2)
#   an animation: u32 flags, 8 bytes, u16 counts (sequences, steps, frames, pieces), u32 0; then the sequences (u16
#     first step, end step, u32 flags), steps (u16 frame, duration), frames (u16 first piece, end piece) and pieces
#     (12 bytes, OAM's: y s8 and bit 13 8bpp and the shape; x s9, flips and the size; the tile, in tiles of its depth)
#   (worked out for this game, the first piece drawn on top)
import struct
from PIL import Image

def files(rom):
    fnt_off, fnt_len, fat_off, fat_len = struct.unpack_from('<IIII', rom, 0x40)
    fat = [struct.unpack_from('<II', rom, fat_off + 8 * i) for i in range(fat_len // 8)]
    out = {}
    def walk(did, path):
        off, first, _ = struct.unpack_from('<IHH', rom, fnt_off + 8 * (did & 0xfff))
        p = fnt_off + off; fid = first
        while True:
            t = rom[p]; p += 1
            if t == 0: break
            n = t & 0x7f; name = rom[p:p + n].decode('latin1'); p += n
            if t & 0x80:
                sub = struct.unpack_from('<H', rom, p)[0]; p += 2
                walk(sub, path + name + '/')
            else:
                out[path + name] = fat[fid]; fid += 1
    walk(0xf000, '')
    return out

def varint(d, o):
    b = d[o]; n = b >> 6; r = b & 0x3f; o += 1
    for i in range(n): r |= d[o] << ((i + 1) * 6); o += 1
    return r, o
def decompress(d, o=0, strict=True):
    size, o = varint(d, o); nb, o = varint(d, o); nb += 1
    out = bytearray()
    for _ in range(nb):
        bs = struct.unpack_from('<H', d, o)[0]; o += 2; start = o
        done = False
        for _ in range(256):
            cb = d[o]; o += 1
            for _ in range(4):
                c = cb & 3; cb >>= 2
                if c == 0: done = True; break
                if c == 1: out.append(d[o]); o += 1
                elif c == 2:
                    a, b = d[o], d[o+1]; o += 2
                    off = a | ((b & 0xf0) << 4); n = (b & 0xf) + 2
                    if off == 0 or off > len(out): raise ValueError('bad off')
                    for _ in range(n): out.append(out[-off])
                else:
                    n = d[o] + 2; out += bytes([d[o+1]]) * n; o += 2
            if done: break
        if strict and o - start != bs: raise ValueError('block size %d != %d' % (o-start, bs))
        o = start + bs
    if strict and len(out) != size: raise ValueError('size %d != %d' % (len(out), size))
    return bytes(out), o

SIZES = {(0, 0): (8, 8), (0, 1): (16, 16), (0, 2): (32, 32), (0, 3): (64, 64),
         (1, 0): (16, 8), (1, 1): (32, 8), (1, 2): (32, 16), (1, 3): (64, 32),
         (2, 0): (8, 16), (2, 1): (8, 32), (2, 2): (16, 32), (2, 3): (32, 64)}

class Archive:
    def __init__(self, data):
        self.d = data
        n = struct.unpack_from('<I', self.d, 0)[0] // 4
        self.offs = list(struct.unpack_from('<%dI' % n, self.d, 0))
    def raw(self, i):
        a = self.offs[i]
        nxt = [o for o in self.offs[i + 1:] if o != 0xFFFFFFFF]
        return self.d[a:nxt[0] if nxt else len(self.d)]
    def lz(self, i):
        return decompress(self.d, self.offs[i])[0]

def palette(raw):
    raw = raw.rstrip(b'\xff')  # padding to 0x200
    if len(raw) % 2: raw += b'\xff'
    cols = []
    for k in range(len(raw) // 2):
        c = struct.unpack_from('<H', raw, 2 * k)[0]
        cols.append(((c & 31) * 255 // 31, (c >> 5 & 31) * 255 // 31, (c >> 10 & 31) * 255 // 31, 255))
    while len(cols) < 256: cols.append((255, 0, 255, 255))
    return cols

class Anim:
    """Header: u32 flags, 8 unknown bytes, u16 nseq, nsteps, nframes, npieces, u32 0.
    Then nseq x (u16 first step, u16 end step, u32 flags), nsteps x (u16 frame, u16 duration),
    nframes x (u16 first piece, u16 end piece), npieces x 12-byte OAM piece:
    u16 attr0 (y s8, bit13 8bpp, bits14-15 shape), u16 attr1 (x s9, bit12 hflip, bit13 vflip, bits14-15 size),
    u16 tile (in units of one tile of the piece's depth: 32 bytes 4bpp, 64 bytes 8bpp), u16 ?, u32 ?."""
    def __init__(self, data):
        self.data = data
        self.flags = struct.unpack_from('<I', data, 0)[0]
        ns, nst, nf, npc = struct.unpack_from('<4H', data, 12)
        o = 0x18
        self.seqs = [struct.unpack_from('<HHI', data, o + 8 * k) for k in range(ns)]; o += 8 * ns
        self.steps = [struct.unpack_from('<HH', data, o + 4 * k) for k in range(nst)]; o += 4 * nst
        self.frames = [struct.unpack_from('<HH', data, o + 4 * k) for k in range(nf)]; o += 4 * nf
        self.pieces = [struct.unpack_from('<HHHHI', data, o + 12 * k) for k in range(npc)]

def render_frame(anim, tiles, pal, fi):
    """Return (image, (ox, oy)) with ox, oy the position of the sprite origin inside the image."""
    a, b = anim.frames[fi]
    parts = []
    for p in anim.pieces[a:b]:
        a0, a1, t, u, _ = p
        y = a0 & 0xff; y = y - 256 if y >= 128 else y
        x = a1 & 0x1ff; x = x - 512 if x >= 256 else x
        w, h = SIZES.get((a0 >> 14, a1 >> 14), (8, 8))
        parts.append((x, y, w, h, bool(a0 & 0x2000), t & 0x3ff, (t >> 12) & 15, a1 >> 12 & 1, a1 >> 13 & 1))
    if not parts: return None, (0, 0)
    x0 = min(p[0] for p in parts); y0 = min(p[1] for p in parts)
    x1 = max(p[0] + p[2] for p in parts); y1 = max(p[1] + p[3] for p in parts)
    img = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    px = img.load()
    for x, y, w, h, bpp8, t, pb, hf, vf in reversed(parts):  # first piece drawn on top
        tb = 64 if bpp8 else 32
        base = t * tb
        for ty in range(h // 8):
            for tx in range(w // 8):
                off = base + (ty * (w // 8) + tx) * tb
                for yy in range(8):
                    for xx in range(8):
                        if bpp8:
                            k = off + yy * 8 + xx
                            ci = tiles[k] if k < len(tiles) else 0
                        else:
                            k = off + yy * 4 + xx // 2
                            v = tiles[k] if k < len(tiles) else 0
                            ci = (v >> 4) if xx & 1 else (v & 15)
                            if ci: ci += pb * 16
                        if not ci: continue
                        X = tx * 8 + xx; Y = ty * 8 + yy
                        if hf: X = w - 1 - X
                        if vf: Y = h - 1 - Y
                        px[x - x0 + X, y - y0 + Y] = pal[ci]
    return img, (-x0, -y0)

class Sprites:
    def __init__(self, data, first_palette=None):
        self.ar = Archive(data)
        t = self.ar.raw(0)
        cnt, npal = struct.unpack_from('<II', t, 0)
        self.table = [struct.unpack_from('<HHHH', t, 8 + 8 * k) for k in range(cnt)]
        if first_palette is None:  # palettes are the last npal files before the extra (hitbox) files
            first_palette = max(e[0] for e in self.table if e[0] != 0xFFFF) + 2
        self.first_palette = first_palette
    def load(self, k):
        ai, pi, _, _ = self.table[k]
        anim = Anim(self.ar.lz(ai))
        tiles = self.ar.lz(ai + 1)
        pal = palette(self.ar.raw(self.first_palette + pi))
        return anim, tiles, pal

def frames_aligned(anim, tiles, pal, indices):
    """Render frames on one canvas so their origins (feet) line up."""
    out = [render_frame(anim, tiles, pal, i) for i in indices]
    L = max(o[0] for im, o in out if im); T = max(o[1] for im, o in out if im)
    R = max(im.width - o[0] for im, o in out if im); B = max(im.height - o[1] for im, o in out if im)
    res = []
    for im, o in out:
        c = Image.new('RGBA', (L + R, T + B), (0, 0, 0, 0))
        if im: c.alpha_composite(im, (L - o[0], T - o[1]))
        res.append(c)
    return res


# Toadsworth (grown up) in FObj.dat: the sprite table's 176 (animation file 409, tiles 410, palette 49): his walks
# facing you (sequence 2), away (0) and to the left (3), each its standing frame and four (the game goes a, b, c, b,
# a, d, e, d).
TOADSWORTH = {'entry': 176, 'seqs': {'down': 2, 'up': 0, 'left': 3}}
def toadsworth(rom):
    """-> 15 frames, down 0-4, up 0-4, left 0-4, each 32x32, his feet on the bottom row, his middle in the middle."""
    a, b = files(rom)['FObj/FObj.dat']
    anim, tiles, pal = Sprites(rom[a:b]).load(TOADSWORTH['entry'])
    order = []
    for name, si in TOADSWORTH['seqs'].items():
        s0, s1, _ = anim.seqs[si]; seen = []
        for st in range(s0, s1):
            f = anim.steps[st][0]
            if f not in seen: seen.append(f)
        order += seen[:5]
    ims = frames_aligned(anim, tiles, pal, order)
    out = []
    for im in ims:
        x0, y0, x1, y1 = ims[0].getbbox()
        c = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
        c.alpha_composite(im, (16 - (x0 + x1) // 2, 32 - y1))
        out.append(c)
    return out
