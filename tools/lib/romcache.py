# A cartridge's bytes for the tools that take pictures out of one, kept in the repo so they build without it.
#
#   rom = romcache.load(arg, ['AY7E'])     (arg: the path to the cartridge, or its game code, or None)
#
# Given the cartridge, the tool reads it as ever, and every byte it reads is noted (the ROM is a bytes whose
# indexing, slicing and find/index note what they touch, with struct.unpack_from and numpy.frombuffer watched too);
# when the tool's done, just those bytes go into tools/data/roms/<game code>.bin (LZMA: the ROM's size, then each
# run of bytes read, where it starts and how long it is, then the bytes, then as JSON what its searches of the whole
# cartridge found: rom.found). Given its game code instead (or nothing,
# when the tool knows only one), the tool reads them from there: the same bytes where it read them before, and a
# stop, saying so, if it reads one it didn't then (run it once with the cartridge again).
import atexit, json, lzma, os, struct, sys

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'roms')

class Rom(bytes):
    """The cartridge's bytes, noting (or checking) what's read: `seen` has a 1 for each byte read."""
    def __new__(cls, data, seen, check, meta=None):
        r = super().__new__(cls, data); r.seen = seen; r.check = check; r.meta = meta or {}; r.quiet = False
        return r
    def found(self, key, fn):
        """What a search of the whole cartridge finds (fn()), kept by `key` instead of every byte it looked at: run
        with the cartridge, the search runs (its reads not kept) and what it finds is kept; without, that's read back.
        (As JSON has it: tuples as lists, keys as strings, either way.)"""
        if self.check:
            if key not in self.meta: sys.exit('tools/data/roms/%s.bin hasn\'t what %r finds: run this once with the cartridge' % (self.code, key))
            return self.meta[key]
        self.quiet = True
        try: r = fn()
        finally: self.quiet = False
        self.meta[key] = json.loads(json.dumps(r))
        return self.meta[key]
    def touch(self, a, b):
        if self.quiet: return
        a, b = max(0, a), min(len(self), b)
        if b <= a: return
        if self.check:
            if self.seen.find(0, a, b) >= 0:
                sys.exit('tools/data/roms/%s.bin has no byte at 0x%x: run this once with the cartridge to take them again' % (self.code, self.seen.find(0, a, b)))
        else: self.seen[a:b] = b'\x01' * (b - a)
    def __getitem__(self, k):
        if isinstance(k, slice):
            a, b, step = k.indices(len(self))
            if step == 1: self.touch(a, b)
            else: self.touch(min(a, b), max(a, b) + 1)
            return bytes(super().__getitem__(k))
        i = k + len(self) if k < 0 else k
        self.touch(i, i + 1)
        return super().__getitem__(k)
    def find(self, sub, start=0, end=None):
        r = super().find(sub, start, end)
        self.touch(start, (r + len(sub)) if r >= 0 else (len(self) if end is None else end))
        return r
    def index(self, sub, start=0, end=None):
        r = self.find(sub, start, end)
        if r < 0: raise ValueError('subsection not found')
        return r

def _watch():
    unpack_from = struct.unpack_from
    def watched(fmt, buf, offset=0):
        if isinstance(buf, Rom): buf.touch(offset, offset + struct.calcsize(fmt))
        return unpack_from(fmt, buf, offset)
    struct.unpack_from = watched
    try: import numpy
    except ImportError: return
    frombuffer = numpy.frombuffer
    def watched_np(buf, dtype=float, count=-1, offset=0, **kw):
        if isinstance(buf, Rom):
            size = numpy.dtype(dtype).itemsize
            buf.touch(offset, len(buf) if count < 0 else offset + count * size)
        return frombuffer(buf, dtype, count, offset, **kw)
    numpy.frombuffer = watched_np

def _save(rom):
    # (Along with what's kept already: another tool's reads of the same cartridge, or another part's.)
    path = os.path.join(DIR, rom.code + '.bin')
    if os.path.isfile(path):
        old = _read(path)
        if old and len(old[0]) == len(rom):
            for a, b in old[2]: rom.seen[a:b] = b'\x01' * (b - a)
            rom.meta = dict(old[3], **rom.meta)
            # (the cartridge's own bytes are all here, so the old ones are these too)
    runs, i, n, seen = [], 0, len(rom), rom.seen
    while True:
        a = seen.find(1, i)
        if a < 0: break
        b = seen.find(0, a)
        b = n if b < 0 else b
        runs.append((a, b)); i = b
    os.makedirs(DIR, exist_ok=True)
    body = struct.pack('<II', n, len(runs)) + b''.join(struct.pack('<II', a, b - a) for a, b in runs) + \
        b''.join(bytes.__getitem__(rom, slice(a, b)) for a, b in runs) + (json.dumps(rom.meta, sort_keys=True).encode() if rom.meta else b'')
    open(path, 'wb').write(lzma.compress(body, preset=9 | lzma.PRESET_EXTREME))
    print('tools/data/roms/%s.bin: %d bytes of the cartridge kept' % (rom.code, sum(b - a for a, b in runs)))

def load(arg, codes):
    """-> the ROM's bytes: from the cartridge at `arg` (noting what's read), or from tools/data/roms (`arg` a game
    code of `codes`, or None for the first)."""
    _watch()
    if arg and os.path.isfile(arg):
        data = open(arg, 'rb').read()
        code = data[0xac:0xb0].decode('latin-1')
        if code not in codes: sys.exit('That cartridge\'s game code is %r, not %s.' % (code, ' or '.join(codes)))
        rom = Rom(data, bytearray(len(data)), False); rom.code = code
        atexit.register(_save, rom)
        return rom
    code = arg or codes[0]
    if code not in codes: sys.exit('usage: the path to the cartridge, or its game code (%s)' % ', '.join(codes))
    path = os.path.join(DIR, code + '.bin')
    if not os.path.isfile(path): sys.exit('No tools/data/roms/%s.bin yet: run this once with the cartridge.' % code)
    data, seen, _, meta = _read(path)
    rom = Rom(bytes(data), seen, True, meta); rom.code = code
    return rom

def _read(path):
    """A kept file -> (its bytes, where they are, the runs, what searches found)."""
    body = lzma.decompress(open(path, 'rb').read())
    n, k = struct.unpack_from('<II', body, 0)
    data, seen, at, runs = bytearray(n), bytearray(n), 8 + 8 * k, []
    for j in range(k):
        a, m = struct.unpack_from('<II', body, 8 + 8 * j)
        data[a:a + m] = body[at:at + m]; seen[a:a + m] = b'\x01' * m; at += m; runs.append((a, a + m))
    return data, seen, runs, (json.loads(body[at:]) if at < len(body) else {})
