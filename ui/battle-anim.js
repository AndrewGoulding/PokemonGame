// Battle animations: pokeemerald-expansion's, run as the GBA runs them.
//
// ui/battle-anim-data.js holds every move's animation script, assembled as
// the ROM has it, and the pictures, palettes and tilemaps it names;
// ui/battle-anim-code.js is the C that runs them (src/battle_anim*.c, with
// the engine under them: sprite.c, task.c, palette.c, bg.c,
// scanline_effect.c), translated line for line by tools/build-battle-anims.py.
// This file is the machine they run on: the GBA's memory (VRAM, palette RAM,
// the I/O registers and DMA, including the H-blank DMA of scanline effects),
// the battle around an animation (who is where, their species, the sound
// effects and cries), each frame as the battle's main loop runs it, and a
// renderer that draws the backgrounds, the sprites, windows and blending
// over the battle field.
//
// The Pokémon themselves are this game's pictures, not GBA tiles: each one is
// a sprite (or, moved to a background by `monbg`, a background) whose tiles
// stand for its <img>. Its palette starts as a reference palette, so whatever
// an animation does to it (fades, tints, inversion, greyscale) is read back
// as a colour matrix and drawn as an SVG filter on the picture.
//
//   BattleAnim.play({ move, attacker, target, field, battlers, ... }) -> Promise
//   BattleAnim.play({ anim: "general" | "status" | "special", id, arg, ... })
//                          one of the expansion's other animations (a stat
//                          change, a status, the weather, a ball thrown...)
//   BattleAnim.run(opts)   the same without a screen (tests): { frames, error }
//   BattleAnim.has(move)   whether the move has an animation
//   BattleAnim.hasAnim(kind, id)
(function () {
  "use strict";
  const D = window.BATTLE_ANIM_DATA;
  if (!D || !window.BattleAnimC) return;

  const PTR_BASE = D.ptrBase;
  const b64 = (s) => {
    if (typeof atob === "function") {
      const bin = atob(s), out = new Uint8Array((bin.length + 3) & ~3);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    }
    const buf = Buffer.from(s, "base64"), out = new Uint8Array((buf.length + 3) & ~3);
    out.set(buf);
    return out;
  };
  const SCRIPT = b64(D.script);

  // ---------- integers ----------
  const u8 = (v) => v & 0xFF, s8 = (v) => (v << 24) >> 24;
  const u16 = (v) => v & 0xFFFF, s16 = (v) => (v << 16) >> 16;
  const u32 = (v) => v >>> 0, s32 = (v) => v | 0;
  const bf = (n) => (v) => v & ((1 << n) - 1);
  const bfs = (n) => (v) => (v << (32 - n)) >> (32 - n);

  // ---------- pointers ----------
  // A pointer to a scalar is { a: array, o: index }; to a struct, the object;
  // to a function, the function. As a number (E.addr) a pointer is an
  // address: the GBA's own for VRAM, palette RAM, OAM and the registers, made
  // up for everything else (each buffer, array or object given its own range
  // the first time it's asked for), so that a pointer kept in two s16s of a
  // task's data comes back as the same pointer.
  // (P of a pointer, as a table of script labels has them, is that
  // pointer moved along: the C's array decaying to a pointer)
  const P = (a, o) => (a && typeof a === "object" && !isTyped(a) && a !== IO2 && a !== IO4 && a.a !== undefined && a.o !== undefined ? { a: a.a, o: a.o + (o | 0) } : { a, o: o | 0 });
  const VRAM = new ArrayBuffer(0x18000), PLTT = new ArrayBuffer(0x400), OAMB = new ArrayBuffer(0x400);
  const io = new Uint16Array(0x200);
  const views = new WeakMap();
  function view(buf, size, signed) {
    let v = views.get(buf);
    if (!v) views.set(buf, v = {});
    const k = (signed ? "s" : "u") + size;
    if (!v[k]) {
      const T = signed ? { 1: Int8Array, 2: Int16Array, 4: Int32Array }[size] : { 1: Uint8Array, 2: Uint16Array, 4: Uint32Array }[size];
      v[k] = new T(buf, 0, Math.floor(buf.byteLength / size));
    }
    return v[k];
  }
  const ranges = [];   // sorted by base: { base, end, buf | arr | obj }
  let rangeOf = new WeakMap();
  let nextAddr = 0x02000000, nextHandle = 0x0A000000;
  function addRange(r) {
    let i = ranges.length;
    while (i > 0 && ranges[i - 1].base > r.base) i--;
    ranges.splice(i, 0, r);
    return r;
  }
  addRange({ base: 0x05000000, end: 0x05000400, buf: PLTT });
  addRange({ base: 0x06000000, end: 0x06018000, buf: VRAM });
  addRange({ base: 0x07000000, end: 0x07000400, buf: OAMB });
  rangeOf.set(PLTT, ranges[0]); rangeOf.set(VRAM, ranges[1]); rangeOf.set(OAMB, ranges[2]);
  function findRange(v) {
    let lo = 0, hi = ranges.length - 1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1, r = ranges[m];
      if (v < r.base) hi = m - 1;
      else if (v >= r.end) lo = m + 1;
      else return r;
    }
    return null;
  }
  function rangeFor(x) {
    let r = rangeOf.get(x);
    if (r) return r;
    if (x instanceof ArrayBuffer) {
      r = addRange({ base: nextAddr, end: nextAddr + x.byteLength, buf: x });
      nextAddr = (nextAddr + x.byteLength + 31) & ~15;
    } else if (Array.isArray(x)) {
      r = addRange({ base: nextHandle, end: nextHandle + Math.max(4, x.length * 4), arr: x });
      nextHandle = (nextHandle + x.length * 4 + 31) & ~15;
    } else {
      r = addRange({ base: nextHandle, end: nextHandle + 4, obj: x });
      nextHandle += 16;
    }
    rangeOf.set(x, r);
    return r;
  }
  const isTyped = (a) => ArrayBuffer.isView(a);
  function addr(p) {
    if (p == null) return 0;
    if (typeof p === "number") return p >>> 0;
    if (p.a !== undefined && p.o !== undefined && (isTyped(p.a) || Array.isArray(p.a) || p.a === IO2 || p.a === IO4)) {
      if (p.a === IO2) return 0x04000000 + p.o * 2;
      if (p.a === IO4) return 0x04000000 + p.o * 4;
      if (isTyped(p.a)) return (rangeFor(p.a.buffer).base + p.a.byteOffset + p.o * p.a.BYTES_PER_ELEMENT) >>> 0;
      return (rangeFor(p.a).base + p.o * 4) >>> 0;
    }
    return rangeFor(p).base >>> 0;
  }
  // The script's pointers (PTR_BASE + an index into D.ptrs): a label of the
  // script, or something the C defines.
  const scriptPtrs = [];
  function scriptPtr(i, size) {
    if (scriptPtrs[i] !== undefined) return scriptPtrs[i];
    const [kind, v] = D.ptrs[i];
    let out;
    if (kind === "off") out = P(SCRIPT, v);
    else if (D.labels[v] !== undefined) out = P(SCRIPT, D.labels[v]);
    else {
      const x = C && v in C ? C[v] : E[v];
      if (x === undefined) throw new Error("battle anim: unknown symbol " + v);
      out = isTyped(x) ? P(x, 0) : x;
    }
    return (scriptPtrs[i] = out);
  }
  function ptr(v, size) {
    if (v == null) return null;
    if (typeof v !== "number") return v;
    v >>>= 0;
    if (v === 0) return null;
    if (v >= PTR_BASE && v < PTR_BASE + D.ptrs.length) return scriptPtr(v - PTR_BASE, size);
    if (v >= 0x04000000 && v < 0x04000400) return size === 4 ? P(IO4, (v - 0x04000000) >> 2) : P(IO2, (v - 0x04000000) >> 1);
    const r = findRange(v);
    if (!r) return null;
    if (r.obj !== undefined) return r.obj;
    if (r.arr) return size ? P(r.arr, (v - r.base) >> 2) : sat(r.arr, (v - r.base) >> 2);
    const sz = size || 1;
    return P(view(r.buf, sz), Math.floor((v - r.base) / sz));
  }
  function pcast(p, size) {
    if (p == null || !size || !p.a || !isTyped(p.a)) return p;
    if (p.a.BYTES_PER_ELEMENT === size) return p;
    const bytes = p.a.byteOffset + p.o * p.a.BYTES_PER_ELEMENT;
    return P(view(p.a.buffer, size), Math.floor(bytes / size));
  }
  function padd(p, n, size) {
    if (p == null) return ptr(n, size);
    if (typeof p === "number") return ptr(p + n * size, size);
    if (isTyped(p.a) && p.a.BYTES_PER_ELEMENT !== size) {
      const bytes = p.a.byteOffset + p.o * p.a.BYTES_PER_ELEMENT + n * size;
      if (bytes % p.a.BYTES_PER_ELEMENT === 0) return P(p.a, (bytes - p.a.byteOffset) / p.a.BYTES_PER_ELEMENT);
      return P(view(p.a.buffer, size), Math.floor(bytes / size));
    }
    return P(p.a, p.o + n);
  }
  function peq(a, b) {
    if (a == null || a === 0) return b == null || b === 0;
    if (b == null || b === 0) return false;
    if (a === b) return true;
    if (typeof a === "object" && typeof b === "object" && a.a !== undefined && b.a !== undefined && a.o !== undefined && b.o !== undefined) {
      if (a.a === b.a) return a.o === b.o;
      if (isTyped(a.a) && isTyped(b.a) && a.a.buffer === b.a.buffer)
        return a.a.byteOffset + a.o * a.a.BYTES_PER_ELEMENT === b.a.byteOffset + b.o * b.a.BYTES_PER_ELEMENT;
      return false;
    }
    if (typeof a === "number" || typeof b === "number") return addr(a) === addr(b);
    return false;
  }
  // &obj.field, &variable: a one-cell pointer.
  class FieldCell { constructor(o, k) { this.o = o; this.k = k; } get 0() { return this.o[this.k]; } set 0(v) { this.o[this.k] = v; } }
  class VarCell { constructor(g, s) { this.g = g; this.s = s; } get 0() { return this.g(); } set 0(v) { this.s(v); } }
  const F = (obj, key) => P(new FieldCell(obj, key), 0);
  const V = (get, set) => P(new VarCell(get, set), 0);
  // Struct values: a struct inside a struct is copied with it (E.zero and
  // E.copy mark them), a pointer to one isn't.
  const EMB = Symbol("embedded");
  function zero(o) { o[EMB] = true; return o; }
  function copy(v) {
    if (v == null || typeof v !== "object") return v;
    if (isTyped(v)) return v.slice();
    if (Array.isArray(v)) return v.map(copy);
    const out = {};
    for (const k of Object.keys(v)) {
      const x = v[k];
      out[k] = x && typeof x === "object" && (isTyped(x) || x[EMB] || Array.isArray(x) && x.length && x[0] && x[0][EMB]) ? copy(x) : x;
    }
    out[EMB] = true;
    return out;
  }

  // The animation commands' unions (sprite.h), their members sharing bits:
  // union AnimCmd { s16 type; frame { imageValue:16, duration:6, hFlip:1,
  // vFlip:1 }; loop { type:16, count:6 }; jump { type:16, target:6 } } and
  // union AffineAnimCmd { s16 type; frame { s16 xScale, s16 yScale,
  // u8 rotation, u8 duration }; loop { s16 type, s16 count }; jump / end
  // { s16 type, u16 target / val } }.
  function U(name, init) {
    if (name === "AnimCmd") {
      let w = 0;
      const f = init.frame, l = init.loop || init.jump;
      if (init.type !== undefined) w = init.type & 0xFFFF;
      else if (f) w = (f.imageValue & 0xFFFF) | ((f.duration & 63) << 16) | ((f.hFlip & 1) << 22) | ((f.vFlip & 1) << 23);
      else if (l) w = (l.type & 0xFFFF) | (((init.loop ? l.count : l.target) & 63) << 16);
      const lo = w & 0xFFFF, hi = (w >>> 16) & 63;
      return { type: s16(lo), frame: { imageValue: lo, duration: hi, hFlip: (w >>> 22) & 1, vFlip: (w >>> 23) & 1 },
        loop: { type: lo, count: hi }, jump: { type: lo, target: hi } };
    }
    if (name === "AffineAnimCmd") {
      let a = 0, b = 0, c = 0;
      const f = init.frame, o = init.loop || init.jump || init.end;
      if (init.type !== undefined) a = init.type;
      else if (f) { a = f.xScale; b = f.yScale; c = (f.rotation & 0xFF) | ((f.duration & 0xFF) << 8); }
      else if (o) { a = o.type; b = init.loop ? o.count : init.jump ? o.target : o.val; }
      return { type: s16(a), frame: { xScale: s16(a), yScale: s16(b), rotation: c & 0xFF, duration: (c >> 8) & 0xFF },
        loop: { type: s16(a), count: s16(b) }, jump: { type: s16(a), target: u16(b) }, end: { type: s16(a), val: u16(b) } };
    }
    return init;
  }

  // Pointers to structs in an array, moved along it: E.sat(array or
  // element, i) is &array[i] (or element + i), E.sadd(p, n) is p + n.
  const POS = Symbol("position");
  // (what C reads past an array's end: zeroes)
  const NOTHING = new Proxy(function () {}, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === "length" ? 0 : NOTHING),
    set: () => true,
    apply: () => 0
  });
  function sat(base, i) {
    if (Array.isArray(base)) {
      const x = base[i];
      if (x && typeof x === "object") {
        const p = x[POS];
        if (!p || p[0] !== base || p[1] !== i) x[POS] = [base, i];
      }
      return x === undefined ? NOTHING : x;
    }
    if (base && base.__view) return sat(base.__view[0], base.__view[1] + i);
    if (i === 0) return base;
    return sadd(base, i);
  }
  function sadd(p, n) {
    if (p == null) return null;
    if (Array.isArray(p)) return sat(p, n);
    const pos = p[POS];
    if (!pos) throw new Error("battle anim: pointer arithmetic on a struct outside an array");
    return sat(pos[0], pos[1] + n);
  }
  // A struct laid over an array of integers (sprite->data,
  // gBattleAnimArgs): its fields read and write the array's bytes. A layout
  // (tools/battle_anims/c2js.py) is [name, byte offset, size, signed, bit
  // offset, bit width, count (an array; -1 a pointer, kept beside), nested].
  const overlays = new WeakMap();
  function overlay(p, layout) {
    if (p == null) return null;
    let a = p, o = 0;
    if (p.a !== undefined && p.o !== undefined) { a = p.a; o = p.o; }
    if (!isTyped(a)) return p;
    return overlayAt(a.buffer, a.byteOffset + o * a.BYTES_PER_ELEMENT, layout);
  }
  function overlayAt(buf, base, layout) {
    let m = overlays.get(buf);
    if (!m) overlays.set(buf, m = new Map());
    const key = base + ":" + (layout.__id || (layout.__id = Math.random().toString(36).slice(2)));
    if (m.has(key)) return m.get(key);
    const u8v = view(buf, 1), obj = {};
    const rd = (off, size, signed) => {
      let v = 0;
      for (let i = 0; i < size; i++) v |= (u8v[off + i] || 0) << (8 * i);
      if (size === 4) return signed ? v | 0 : v >>> 0;
      return signed ? (v << (32 - 8 * size)) >> (32 - 8 * size) : v;
    };
    const wr = (off, size, v) => { for (let i = 0; i < size; i++) if (off + i < u8v.length) u8v[off + i] = (v >>> (8 * i)) & 0xFF; };
    for (const [name, off, size, signed, bitOff, bitW, count, nested] of layout) {
      const at = base + off;
      if (nested) {
        const sub = overlayAt(buf, at, C.__layouts[nested]);
        Object.defineProperty(obj, name, { get: () => sub, set: (v) => assign(sub, v), enumerable: true });
      } else if (count > 0) {
        const T = signed ? { 1: Int8Array, 2: Int16Array, 4: Int32Array }[size] : { 1: Uint8Array, 2: Uint16Array, 4: Uint32Array }[size];
        const arr = at % size === 0 && at + count * size <= buf.byteLength ? new T(buf, at, count) : new T(count);
        Object.defineProperty(obj, name, { get: () => arr, enumerable: true });
      } else if (count < 0) {
        let v = null;
        Object.defineProperty(obj, name, { get: () => v, set: (x) => { v = x; }, enumerable: true });
      } else if (bitW) {
        const mask = ((1 << bitW) - 1) >>> 0;
        Object.defineProperty(obj, name, {
          get: () => { const v = (rd(at, size, false) >>> bitOff) & mask; return signed ? (v << (32 - bitW)) >> (32 - bitW) : v; },
          set: (v) => wr(at, size, (rd(at, size, false) & ~(mask << bitOff)) | ((v & mask) << bitOff)), enumerable: true
        });
      } else {
        Object.defineProperty(obj, name, { get: () => rd(at, size, signed), set: (v) => wr(at, size, v), enumerable: true });
      }
    }
    m.set(key, obj);
    return obj;
  }
  // &pointers[i]: an array of pointers seen from i on.
  function aview(arr, i) {
    if (!i || arr == null) return arr;
    return new Proxy(arr, {
      get: (t, k) => (typeof k === "string" && /^\d+$/.test(k) ? t[+k + i] : k === "length" ? t.length - i : t[k]),
      set: (t, k, v) => { if (typeof k === "string" && /^\d+$/.test(k)) t[+k + i] = v; else t[k] = v; return true; }
    });
  }
  // A struct stored over another, in place.
  function assign(dst, src) {
    if (dst == null || src == null || dst === src) return dst;
    for (const k in src) {
      const x = src[k], y = dst[k];
      if (isTyped(x) && isTyped(y) && x.length === y.length) y.set(x);
      else if (x && typeof x === "object" && y && typeof y === "object" && (x[EMB] || y[EMB]) && !isTyped(x)) assign(y, x);
      else if (Array.isArray(x) && x.length && x[0] && x[0][EMB]) dst[k] = copy(x);
      else dst[k] = isTyped(x) ? x.slice() : x;
    }
    return dst;
  }

  // ---------- memory: copies and fills ----------
  // (dest and src are pointers or addresses; n in bytes)
  function bytesAt(p) {
    if (typeof p === "number") p = ptr(p, 1);
    if (p == null) return null;
    if (p.a === IO2 || p.a === IO4) return { io: true, off: (p.a === IO2 ? p.o * 2 : p.o * 4) };
    if (!p.a || !isTyped(p.a)) return null;
    return { u8: view(p.a.buffer, 1), off: p.a.byteOffset + p.o * p.a.BYTES_PER_ELEMENT };
  }
  function copyBytes(dest, src, n) {
    const d = bytesAt(dest), s = bytesAt(src);
    if (!d || !s || n <= 0) return;
    if (d.io || s.io) {
      for (let i = 0; i < n; i += 2) {
        const v = s.io ? io[(s.off + i) >> 1] : s.u8[s.off + i] | (s.u8[s.off + i + 1] << 8);
        if (d.io) ioWrite16(d.off + i, v); else { d.u8[d.off + i] = v & 0xFF; d.u8[d.off + i + 1] = v >> 8; }
      }
      return;
    }
    if (d.off < 0 || s.off < 0 || d.off >= d.u8.length || s.off >= s.u8.length) return;
    const len = Math.max(0, Math.min(n, d.u8.length - d.off, s.u8.length - s.off));
    if (d.u8 === s.u8) d.u8.copyWithin(d.off, s.off, s.off + len);
    else d.u8.set(s.u8.subarray(s.off, s.off + len), d.off);
    if (d.u8.buffer === VRAM) {
      noteWrite(dest, len);
      const pic = specialPics.get(s.u8.buffer);
      if (pic && d.off >= 0x10000) addPicture((d.off - 0x10000) >> 5, len >> 5, pic.url, pic.size);
    }
  }
  function fillBytes(dest, value, n, unit) {
    const d = bytesAt(dest);
    if (!d || n <= 0) return;
    if (d.io) { for (let i = 0; i < n; i += 2) ioWrite16(d.off + i, unit === 4 ? (i & 2 ? value >>> 16 : value & 0xFFFF) : value & 0xFFFF); return; }
    const end = Math.min(d.off + n, d.u8.length);
    for (let i = d.off, k = 0; i < end; i++, k++) d.u8[i] = (value >>> ((k % unit) * 8)) & 0xFF;
    noteWrite(dest, n);
  }
  function readUnit(p, unit) {
    if (p == null) return 0;
    if (p.a && !isTyped(p.a) && p.a !== IO2 && p.a !== IO4 && !Array.isArray(p.a)) return p.a[p.o] >>> 0;   // (a cell)
    const s = bytesAt(p);
    if (!s) return 0;
    if (s.io) return io[s.off >> 1];
    let v = 0;
    for (let i = 0; i < unit; i++) v |= s.u8[s.off + i] << (8 * i);
    return v >>> 0;
  }
  // CpuSet: a word count with the 32-bit and fill flags.
  function CpuSet(src, dest, control) {
    const unit = control & 0x04000000 ? 4 : 2, n = (control & 0x1FFFFF) * unit;
    if (control & 0x01000000) fillBytes(dest, readUnit(src, unit), n, unit);
    else copyBytes(dest, src, n);
  }
  function CpuFastSet(src, dest, control) {
    const n = (control & 0x1FFFFF) * 4;
    if (control & 0x01000000) fillBytes(dest, readUnit(src, 4), n, 4);
    else copyBytes(dest, src, n);
  }

  // ---------- the I/O registers ----------
  // As pointers: P(IO2, halfword index) or P(IO4, word index); a write to a
  // DMA channel's control starts it.
  const IO2 = new Proxy({}, {
    get: (t, k) => io[+k] | 0,
    set: (t, k, v) => { ioWrite16(+k * 2, v); return true; }
  });
  const IO4 = new Proxy({}, {
    get: (t, k) => (io[+k * 2] | (io[+k * 2 + 1] << 16)) >>> 0,
    set: (t, k, v) => { io[+k * 2] = v & 0xFFFF; ioWrite16(+k * 2 * 2 + 2, v >>> 16); return true; }
  });
  const DMA_CNT_H = [0xBA, 0xC6, 0xD2, 0xDE];
  const hdma = [null, null, null, null];
  function ioWrite16(off, v) {
    io[off >> 1] = v & 0xFFFF;
    const ch = DMA_CNT_H.indexOf(off);
    if (ch >= 0) dmaControl(ch);
  }
  function dmaControl(ch) {
    const base = (0xB0 + ch * 12) >> 1, cnt = io[base + 5];
    if (!(cnt & 0x8000)) { hdma[ch] = null; return; }
    const src = (io[base] | (io[base + 1] << 16)) >>> 0, dst = (io[base + 2] | (io[base + 3] << 16)) >>> 0;
    const count = io[base + 4] || (ch === 3 ? 0x10000 : 0x4000), unit = cnt & 0x400 ? 4 : 2;
    const timing = (cnt >> 12) & 3;
    if (timing === 2) {
      hdma[ch] = { src, dst, count, unit, srcCtl: (cnt >> 7) & 3, dstCtl: (cnt >> 5) & 3 };
      return;
    }
    if (timing === 0) {
      dmaCopy(src, dst, count, unit, (cnt >> 7) & 3, (cnt >> 5) & 3);
      if (!(cnt & 0x200)) io[base + 5] = cnt & ~0x8000;
    }
  }
  function dmaCopy(src, dst, count, unit, srcCtl, dstCtl) {
    if (srcCtl === 0 && dstCtl === 0) { copyBytes(dst, src, count * unit); return; }
    for (let i = 0; i < count; i++) {
      const v = readUnit(ptr(src, 1), unit);
      const d = bytesAt(ptr(dst, 1));
      if (d && d.io) ioWrite16(d.off, v & 0xFFFF), unit === 4 && ioWrite16(d.off + 2, v >>> 16);
      else if (d) for (let k = 0; k < unit; k++) d.u8[d.off + k] = (v >>> (8 * k)) & 0xFF;
      if (srcCtl === 0) src += unit; else if (srcCtl === 1) src -= unit;
      if (dstCtl === 0 || dstCtl === 3) dst += unit; else if (dstCtl === 1) dst -= unit;
    }
  }

  // ---------- the backgrounds the Pokémon are moved onto ----------
  // DrawBattlerOnBg: which battler a background shows, and where (BG pixels).
  const bgBattler = [null, null, null, null];
  let moveBg = false;   // (BG3 holds a move's background, LoadMoveBg's)
  function screenBase(bg) { return 0x06000000 + ((io[(0x08 >> 1) + bg] >> 8) & 0x1F) * 0x800; }
  function noteWrite(dest, n) {
    // A background's tilemap rewritten: it no longer shows its battler.
    const a = addr(dest);
    if (a < 0x06000000 || a >= 0x06010000) return;
    for (let bg = 0; bg < 4; bg++) {
      const b = bgBattler[bg];
      if (b && a <= b.map && b.map < a + n) bgBattler[bg] = null;
    }
    if (a <= screenBase(3) && screenBase(3) < a + n) moveBg = false;
  }

  // ---------- E: what the C calls ----------
  let C = null, inst = null;
  const E = {
    P, F, V, U, ptr, addr, pcast, padd, peq, copy, assign, zero, sat, sadd, aview, overlay,
    u8, s8, u16, s16, u32, s32, bool: (v) => (v ? 1 : 0),
    div: (a, b) => (b === 0 ? 0 : Math.trunc(a / b)),
    ints: (T, list) => T.from(list),
    str: (s) => { const a = new Uint8Array(s.length + 1); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xFF; return a; },
    unsupported: (name, why) => { throw new Error("battle anim: " + name + " wasn't translated (" + why + ")"); },
    __builtin_return_address: () => 0,
    AssertfCrashScreen: () => 0,
    FatalfCrashScreen: (ra, fmt, file, line) => { throw new Error("battle anim: fatal at " + (file && file.a) + ":" + line); },
    SoftReset: () => { throw new Error("battle anim: SoftReset"); },
    CpuSet, CpuFastSet,
    memcpy: (d, s, n) => { copyBytes(d, s, n); return d; },
    memmove: (d, s, n) => { copyBytes(d, s, n); return d; },
    memset: (d, v, n) => { fillBytes(d, v & 0xFF, n, 1); return d; },
    RequestDma3Copy: (src, dest, size, mode) => { copyBytes(dest, src, size); return 0; },
    RequestDma3Fill: (value, dest, size, mode) => { fillBytes(dest, value, size, mode === 1 ? 4 : 2); return 0; },
    CheckForSpaceForDma3Request: () => 0,
    // (the pictures are stored decompressed)
    DecompressDataWithHeaderVram: (src, dest) => { copyBytes(dest, src, gfxSize(src)); noteMoveBg(dest); },
    DecompressDataWithHeaderWram: (src, dest) => { copyBytes(dest, src, gfxSize(src)); },
    malloc_and_decompress: (src, sizeOut) => {
      const n = gfxSize(src), buf = P(new Uint8Array((n + 3) & ~3), 0);
      copyBytes(buf, src, n);
      if (sizeOut) sizeOut.a[sizeOut.o] = n;
      return buf;
    },
    Alloc_: (n) => P(new Uint8Array((n + 3) & ~3), 0),
    AllocZeroed_: (n) => P(new Uint8Array((n + 3) & ~3), 0),
    Free: () => {},
    LoadCompressedSpriteSheetUsingHeap: (sheet) => C.LoadSpriteSheet({ data: sheet.data, size: sheet.size, tag: sheet.tag }),
    SetGpuReg: (off, v) => ioWrite16(off, v),
    SetGpuReg_ForcedBlank: (off, v) => ioWrite16(off, v),
    GetGpuReg: (off) => io[off >> 1],
    SetGpuRegBits: (off, mask) => ioWrite16(off, io[off >> 1] | mask),
    ClearGpuRegBits: (off, mask) => ioWrite16(off, io[off >> 1] & ~mask),
    // ---------- maths (the BIOS's) ----------
    ArcTan2: (x, y) => Math.round(Math.atan2(y, x) / (2 * Math.PI) * 0x10000) & 0xFFFF,
    MathUtil_Mul16: (x, y) => s16((x * y) >> 8),
    MathUtil_Inv16: (y) => s16(y ? Math.trunc(0x10000 / y) : 0),
    ObjAffineSet: (src, dest, count, offset) => {
      const list = Array.isArray(src) ? src : [src];
      for (let i = 0; i < (count || 1); i++) {
        const s = Array.isArray(src) ? list[i] : (i === 0 ? src : null);
        if (!s) break;
        const t = (s.rotation >> 8) / 256 * 2 * Math.PI, c = Math.cos(t), n = Math.sin(t);
        const m = [s16(Math.trunc(s.xScale * c)), s16(Math.trunc(-s.xScale * n)), s16(Math.trunc(s.yScale * n)), s16(Math.trunc(s.yScale * c))];
        if (dest && dest.a !== undefined && dest.o !== undefined) {
          const st = (offset || 2) >> 1;
          for (let k = 0; k < 4; k++) dest.a[dest.o + (i * 4 + k) * st] = m[k];
        } else {
          const d = Array.isArray(dest) ? dest[i] : dest;
          d.a = m[0]; d.b = m[1]; d.c = m[2]; d.d = m[3];
        }
      }
    },
    BgAffineSet: (src, dest, count) => {
      const t = (src.alpha >> 8) / 256 * 2 * Math.PI, c = Math.cos(t), n = Math.sin(t);
      const pa = Math.trunc(src.sx * c), pb = Math.trunc(-src.sx * n), pc = Math.trunc(src.sy * n), pd = Math.trunc(src.sy * c);
      dest.pa = s16(pa); dest.pb = s16(pb); dest.pc = s16(pc); dest.pd = s16(pd);
      dest.dx = s32(src.texX - (pa * src.scrX + pb * src.scrY));
      dest.dy = s32(src.texY - (pc * src.scrX + pd * src.scrY));
    },
    BlendPalette: (palOffset, numEntries, coeff, blendColor) => {
      const unf = C.gPlttBufferUnfaded, fad = C.gPlttBufferFaded;
      const br = blendColor & 31, bg = (blendColor >> 5) & 31, bb = (blendColor >> 10) & 31;
      for (let i = 0; i < numEntries; i++) {
        const c = unf[palOffset + i], r = c & 31, g = (c >> 5) & 31, b = (c >> 10) & 31;
        fad[palOffset + i] = (r + (((br - r) * coeff) >> 4)) | ((g + (((bg - g) * coeff) >> 4)) << 5) | ((b + (((bb - b) * coeff) >> 4)) << 10);
      }
    },
    Random: () => (rng() * 0x10000) & 0xFFFF,
    Random2: () => (rng() * 0x10000) & 0xFFFF,
    RtcCalcLocalTime: () => {
      const d = new Date();
      Object.assign(E.gLocalTime, { days: 0, hours: d.getHours(), minutes: d.getMinutes(), seconds: d.getSeconds() });
    },
    CB2_Overworld: function CB2_Overworld() {},
    GetNumberOfActiveOWEs: () => 0,
    RemoveOldestGeneratedOWE: () => {},

    // ---------- the battle ----------
    IsDoubleBattle: () => (inst && inst.doubles ? 1 : 0),
    GetBattlerPosition: (b) => b,
    GetBattlerAtPosition: (p) => p,
    GetBattlerSide: (b) => b & 1,
    IsOnPlayerSide: (b) => ((b & 1) === 0 ? 1 : 0),
    IsBattlerAlly: (a, b) => ((a & 1) === (b & 1) ? 1 : 0),
    GetPartnerBattler: (b) => b ^ 2,
    GetOppositeBattler: (b) => b ^ 1,
    GetBattlerLeftFoe: (b) => (b & 1) ^ 1,
    GetBattlerRightFoe: (b) => ((b & 1) ^ 1) | 2,
    GetBattlerCoordsIndex: () => (inst && inst.doubles ? 1 : 0),
    IsBattlerAlive: (b) => (inst && inst.mons[b] && inst.mons[b].hp > 0 ? 1 : 0),
    GetBattlerMon: (b) => (inst && inst.mons[b]) || NO_MON,
    GetBattlerParty: () => [],
    GetIllusionMonPtr: () => null,
    GetIllusionMonSpecies: () => 0,
    GetMonData2: (mon, field) => monData(mon, field),
    SanitizeSpeciesId: (s) => s,
    IsSpeciesNotUnown: (s) => (s !== D.species.SPECIES_UNOWN ? 1 : 0),
    GetUnownSpeciesId: () => D.species.SPECIES_UNOWN,
    IsPersonalityFemale: () => 0,
    IsMonShiny: (mon) => (mon && mon.shiny ? 1 : 0),
    IsValidForBattle: () => 1,
    GetBattlerAbility: () => 0,
    GetBattlerHoldEffect: () => 0,
    GetItemHoldEffect: () => 0,
    GetItemSecondaryId: () => 0,
    GetBattlerAffectionHearts: () => 0,
    GetAttackerWeather: () => 0,
    GetBattleMoveType: (move) => (inst && inst.moveType) || 0,
    GetMoveEffect: () => 0,
    GetMoveTarget: () => (inst && inst.moveTarget) || 0,
    GetBattlerMoveTargetType: () => (inst && inst.moveTarget) || 0,
    IsBattleMovePhysical: () => (inst && inst.physical ? 1 : 0),
    MoveHasAdditionalEffect: () => 0,
    IsAnyTerrainAffected: () => 0,
    // (balls: a ball's id (D.balls) stands for its item's)
    ItemIdToBallId: (item) => (item >= 1 && item <= D.balls.BALL_CHERISH ? item : D.balls.BALL_POKE),
    GetMoveAnimationScript: (move) => {
      const label = moveLabel[move];
      return label ? E[label] : E.gBattleAnimMove_None || null;
    },
    // The healthboxes (this game's, over the field): hidden while an
    // animation that hides them runs.
    UpdateOamPriorityInAllHealthboxes: (priority, hide) => { if (inst) inst.hideBoxes(!!hide); },
    SetHealthboxSpriteInvisible: (id) => { if (inst) inst.hideBoxes(true); },
    SetHealthboxSpriteVisible: (id) => { if (inst) inst.hideBoxes(false); },
    UpdateHealthboxAttribute: () => {},
    UpdateIndicatorVisibilityAndType: () => {},
    SetBattlerShadowSpriteCallback: () => {},
    CreateEnemyShadowSprite: () => {},
    ClearBehindSubstituteBit: (b) => { if (inst) E.gBattleSpritesDataPtr.battlerData[b].behindSubstitute = 0; },
    SwitchTwoBattlersInParty: () => {},
    // The Pokémon's pictures: this game's (a transformation's new picture
    // is the battle screen's to show: opts.transform(attacker, target,
    // kind) is called when the C changes the picture, in the mosaic).
    BattleLoadMonSpriteGfx: () => {},
    HandleSpeciesGfxDataChange: (attacker, target, kind) => { if (inst && inst.transform) inst.transform(attacker, target, kind); },
    // The Substitute doll: a Pokémon behind one is the doll's tiles, not
    // its picture (battle_gfx_sfx_util.c's BattleLoadSubstituteOrMonSpriteGfx).
    BattleLoadSubstituteOrMonSpriteGfx: (battler, loadMonSprite) => doll(battler, !loadMonSprite),
    LoadBattleMonGfxAndAnimate: (battler, loadMonSprite, spriteId) => {
      doll(battler, !loadMonSprite);
      const s = C.gSprites[spriteId];
      C.StartSpriteAnim(s, 0);
      s.y = loadMonSprite ? coord(battler, 4) : dollY(battler);
    },
    // Another Pokémon's picture (Role Play, Hyperspace Fury...): its tiles
    // stand for this game's picture of it once they're in VRAM.
    LoadSpecialPokePic: (dest, species, personality, isFront) => {
      const m = inst && inst.mons.find((x) => x && x.species === species);
      const url = m && inst.picture ? inst.picture(m.name, m.form, !isFront) : null;
      if (url && dest && dest.a) specialPics.set(dest.a.buffer, { url, size: isFront ? 72 : 96 });
    },
    GetMonSpritePalFromSpeciesAndPersonality: () => P(Uint16Array.from(REF_PAL), 0),
    CreateBattlerSprite: () => {},
    DrawBattlerOnBg: (bgId, x, y, position, paletteId, tiles, tilemap, tilesOffset) => {
      if (inst && inst.doll[position]) {
        // (the doll: its tiles, as battle_intro.c draws a Pokémon's)
        copyBytes(tiles, P(dollTiles(position), 0), 0x800);
        C.LoadBgTiles(bgId, tiles, 0x1000, tilesOffset);
        const t = pcast(tilemap, 2);
        let off = tilesOffset;
        for (let i = y; i < y + 8; i++) for (let j = x; j < x + 8; j++) t.a[t.o + i * 32 + j] = (off++) | (paletteId << 12);
        C.LoadBgTilemap(bgId, tilemap, 0x800, 0);
        bgBattler[bgId] = null;
        return;
      }
      bgBattler[bgId] = { battler: position, x: x * 8, y: y * 8, pal: paletteId, map: screenBase(bgId) };
    },
    DrawMainBattleBackground: () => { endMoveBg(); },
    DrawTerrainTypeBattleBackground: () => { endMoveBg(); },
    LoadContestBgAfterMoveAnim: () => {},
    // (Poké Balls, items and icons: not in moves' animations)
    LoadBallGfx: () => {}, FreeBallGfx: () => {}, UpdateMonIconFrame: () => 0,
    // A held item's icon (Bestow, Poltergeist, Thief, Knock Off): this game's.
    AddItemIconSprite: (tilesTag, paletteTag, item) => {
      const tile = C.LoadSpriteSheet({ data: P(new Uint8Array(0x200), 0), size: 0x200, tag: tilesTag });
      C.LoadSpritePalette({ data: P(Uint16Array.from(REF_PAL), 0), tag: paletteTag });
      const id = C.CreateSprite({ tileTag: tilesTag, paletteTag, oam: Object.assign({}, BATTLER_OAM, { size: 2, priority: 1 }),
        anims: C.gDummySpriteAnimTable, images: null, affineAnims: C.gDummySpriteAffineAnimTable, callback: C.SpriteCallbackDummy }, 0, 0, 0);
      if (id < 64 && tile !== 0xFFFF && inst.itemPicture) addPicture(tile, 16, inst.itemPicture, 24);
      return id;
    },
    SpriteCB_TrainerThrowObject: function SpriteCB_TrainerThrowObject() {},
    SpriteCB_SetInvisible: function SpriteCB_SetInvisible(sprite) { sprite.invisible = 1; },
    CreateInvisibleSpriteWithCallback: (callback) => {
      const id = C.CreateSprite(C.gDummySpriteTemplate, 248, 168, 14);
      C.gSprites[id].invisible = 1;
      C.gSprites[id].callback = callback;
      return id;
    },
    AnimSetCenterToCornerVecX: () => {},
    // ---------- sound ----------
    PlaySE: (id) => playSE(id, 0),
    PlaySE12WithPanning: (id, pan) => playSE(id, pan),
    PlaySE1WithPanning: (id, pan) => playSE(id, pan),
    PlaySE2WithPanning: (id, pan) => playSE(id, pan),
    SE12PanpotControl: () => {},
    IsSEPlaying: () => (inst && inst.frame < inst.seUntil ? 1 : 0),
    PlayCry_ByMode: (species, pan, mode) => playCry(species, mode),
    PlayCry_DuckNoRestore: (species, pan, mode) => playCry(species, mode),
    IsCryPlaying: () => (inst && inst.frame < inst.cryUntil ? 1 : 0),
    StopCryAndClearCrySongs: () => {},
    m4aMPlayAllStop: () => {}, m4aMPlayStop: () => {}, m4aMPlayVolumeControl: () => {},

    // ---------- the replaced C ----------
    // Where each Pokémon is: its picture's middle on the field (GBA pixels).
    GetBattlerSpriteCoord: (battler, type) => coord(battler, type),
    GetBattlerSpriteFinal_Y: (battler, species, a3) => coord(battler, a3 ? 3 : 4),
    GetBattlerSpriteCoordAttr: (battler, attr) => coordAttr(battler, attr),
    SetAnimBgAttribute: (bg, attr, value) => {
      if (bg >= 4) return;
      const off = 0x08 + bg * 2, [shift, bits] = BGCNT_FIELDS[attr];
      const mask = ((1 << bits) - 1) << shift;
      ioWrite16(off, (io[off >> 1] & ~mask) | ((value << shift) & mask));
    },
    GetAnimBgAttribute: (bg, attr) => {
      if (bg >= 4) return 0;
      const [shift, bits] = BGCNT_FIELDS[attr];
      return (io[(0x08 >> 1) + bg] >> shift) & ((1 << bits) - 1);
    },
    AnimTask_RandomBool: function AnimTask_RandomBool(taskId) {
      E.gBattleAnimArgs[7] = rng() < 0.5 ? 1 : 0;
      C.DestroyAnimVisualTask(taskId);
    }
  };
  // (struct BgCnt: priority 2, charBaseBlock 2, dummy 2, mosaic 1, palettes 1,
  // screenBaseBlock 5, areaOverflowMode 1, screenSize 2; by BG_ANIM_* id)
  const BGCNT_FIELDS = { 0: [14, 2], 1: [13, 1], 2: [6, 1], 3: [2, 2], 4: [0, 2], 5: [7, 1], 6: [8, 5] };
  for (const n of [1, 2, 3, 4, 5, 6, 8, 9, 10, 15]) { E["bf" + n] = bf(n); E["bfs" + n] = bfs(n); }

  // The pictures, palettes and tilemaps, decompressed, as the C declares
  // them (u8 / u16 / u32 arrays).
  const gfxBytes = new Map();
  for (const [name, [kind, width, data]] of Object.entries(D.gfx)) {
    const u = b64(data);
    const arr = width === 4 ? new Uint32Array(u.buffer) : width === 2 ? new Uint16Array(u.buffer) : u;
    E[name] = arr;
    gfxBytes.set(u.buffer, Buffer_len(data));
  }
  function Buffer_len(s) { const pad = s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0; return s.length / 4 * 3 - pad; }
  // How much of a picture there is from `p` on.
  function gfxSize(p) {
    if (p == null || !p.a || !isTyped(p.a)) return 0;
    const total = gfxBytes.get(p.a.buffer) || p.a.buffer.byteLength;
    return Math.max(0, total - (p.a.byteOffset + p.o * p.a.BYTES_PER_ELEMENT));
  }
  function noteMoveBg(dest) {
    const a = addr(dest);
    if (a >= 0x06000000 && a < 0x06010000 && a === screenBase(3)) moveBg = true;
  }
  function endMoveBg() {
    moveBg = false;
    new Uint8Array(VRAM, screenBase(3) - 0x06000000, 0x800).fill(0);
    setRefPalette(BG_REF_SLOT);
  }
  // The script's labels: E.gBattleAnimMove_Pound and the rest.
  for (const [name, off] of Object.entries(D.labels)) E[name] = P(SCRIPT, off);
  const moveLabel = {};
  for (const m of Object.values(D.moves)) if (m.id != null) moveLabel[m.id] = m.script;

  // ---------- randomness (seeded for the tests) ----------
  let seed = 0;
  function rng() {
    if (!seed) return Math.random();
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return (seed >>> 8) / 0x1000000;
  }

  // ---------- the Pokémon ----------
  const NO_MON = { species: 0, personality: 0, hp: 0, maxHP: 1, shiny: 0 };
  function monData(mon, field) {
    if (!mon) return 0;
    switch (field) {
      case 0: return mon.personality >>> 0;   // MON_DATA_PERSONALITY
      case 10: return mon.hp;                  // MON_DATA_HP
      case 11: return mon.shiny ? 1 : 0;       // MON_DATA_IS_SHINY
      case 18: return mon.species;             // MON_DATA_SPECIES
      case 47: return mon.ball || D.balls.BALL_POKE;   // MON_DATA_POKEBALL
      case 65: return mon.maxHP;               // MON_DATA_MAX_HP
    }
    return 0;
  }
  // This game's species -> pokeemerald-expansion's SPECIES_ constant.
  function speciesId(name, form) {
    if (!name) return 0;
    const key = (s) => "SPECIES_" + String(s).toUpperCase().replace(/[♀]/g, "_F").replace(/[♂]/g, "_M").replace(/É/g, "E")
      .replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    return D.species[key(name + (form ? "-" + form : ""))] || D.species[key(name)] || 0;
  }

  // The Substitute doll in place of a Pokémon: the doll's tiles in its
  // sprite's (the front doll facing you, the back one from behind) and its
  // palette in the Pokémon's slot; or the Pokémon back (its picture again).
  const dollTiles = (b) => ((b & 1) ? E.gBattleAnimSpriteGfx_Substitute : E.gBattleAnimSpriteGfx_SubstituteBack);
  function doll(b, on) {
    if (!inst || !inst.mons[b]) return;
    const id = E.gBattlerSpriteIds[b], s = C.gSprites[id];
    if (!s || id >= 64) return;
    const tiles = P(new Uint8Array(VRAM), 0x10000 + s.oam.tileNum * 32);
    if (on) copyBytes(tiles, P(dollTiles(b), 0), 0x800); else fillBytes(tiles, 0, 0x800, 1);
    const pal = on ? E.gBattleAnimSpritePal_Substitute : REF_PAL;
    for (let i = 0; i < 16; i++) C.gPlttBufferUnfaded[0x100 + b * 16 + i] = C.gPlttBufferFaded[0x100 + b * 16 + i] = pal[i];
    inst.doll[b] = on;
    E.gBattleSpritesDataPtr.battlerData[b].behindSubstitute = on ? 1 : 0;
  }
  // Where the doll stands: its feet where the Pokémon's picture's are (the
  // front doll's bottom is 15 rows under its middle, the back one's 21).
  const DOLL_FEET = [22, 16];
  const dollY = (b) => u8(Math.round(coordAttr(b, 3)) - DOLL_FEET[b & 1]);
  function dollPlace(box, back) {
    const bottom = box.cy + box.size / 2 - box.bottom;
    return { cx: box.cx, cy: bottom - DOLL_FEET[back ? 0 : 1], size: 64 };
  }

  // Where a Pokémon is: from its picture (the instance's `boxes`, measured
  // from the page), as sBattlerCoords would have it.
  const BASE_Y = [[80, 40, 80, 40], [80, 40, 88, 32]];
  function coord(b, type) {
    const box = inst && inst.boxes[b];
    if (!box) return [0, 1].includes(type) ? 0 : 0;
    switch (type) {
      case 0: case 2: return u8(Math.round(box.cx));
      case 1: return BASE_Y[inst.doubles ? 1 : 0][b];
      case 3: {   // BATTLER_COORD_Y_PIC_OFFSET
        let y = Math.round(box.cy) + ((b & 1) ? 0 : 8);
        return u8(Math.min(y, 104));
      }
      default: return u8(Math.round(box.cy));   // BATTLER_COORD_Y_PIC_OFFSET_DEFAULT
    }
  }
  // BATTLER_COORD_ATTR_HEIGHT, WIDTH, TOP, BOTTOM, LEFT, RIGHT, RAW_BOTTOM:
  // the picture's opaque part.
  function coordAttr(b, attr) {
    const box = inst && inst.boxes[b];
    if (!box) return 0;
    const top = box.cy - box.size / 2 + box.top, bottom = box.cy + box.size / 2 - box.bottom;
    const w = box.size * 0.7;
    switch (attr) {
      case 0: return Math.round(bottom - top);
      case 1: return Math.round(w);
      case 2: return Math.round(top);
      case 3: return Math.round(bottom);
      case 4: return Math.round(box.cx - w / 2);
      case 5: return Math.round(box.cx + w / 2);
      default: return Math.round(bottom);
    }
  }

  // ---------- sound ----------
  function playSE(id, pan) {
    if (!inst) return;
    inst.seUntil = inst.frame + 30;
    const name = D.songs[id];
    const secs = name && inst.sound ? inst.sound(name.toLowerCase(), pan) : null;
    if (typeof secs === "number") inst.seUntil = inst.frame + Math.ceil(secs * 60);
  }
  function playCry(species, mode) {
    if (!inst) return;
    inst.cryUntil = inst.frame + 60;
    for (let b = 0; b < 4; b++) {
      const m = inst.mons[b];
      if (m && m.species === species && inst.cry) { inst.cry(m.name, mode); return; }
    }
  }

  // ---------- pictures standing in for tiles ----------
  const specialPics = new WeakMap();   // (a buffer LoadSpecialPokePic filled -> its picture)
  function addPicture(tile, tiles, url, size) {
    if (!inst || typeof Image === "undefined") return;
    const img = new Image();
    img.src = url;
    inst.pictures = inst.pictures.filter((p) => p.tile + p.tiles <= tile || p.tile >= tile + tiles);
    inst.pictures.push({ tile, tiles, img, size });
  }

  // ---------- the reference palette ----------
  // Each Pokémon's palette (OBJ palette 0-3, as the battle has them) and the
  // battle background's (BG palette 2) start as this; what an animation does
  // to it is fitted as a colour matrix and drawn as a filter on the picture.
  const REF = [[0, 0, 0], [31, 0, 0], [0, 31, 0], [0, 0, 31], [31, 31, 0], [31, 0, 31], [0, 31, 31], [31, 31, 31],
    [16, 16, 16], [8, 24, 16], [24, 8, 16], [16, 8, 24], [8, 16, 8], [24, 24, 8], [4, 12, 28], [28, 20, 4]];
  const REF_PAL = REF.map(([r, g, b]) => r | (g << 5) | (b << 10));
  const BG_REF_SLOT = 2;
  function setRefPalette(bgSlot) {
    for (let i = 0; i < 16; i++) C.gPlttBufferUnfaded[bgSlot * 16 + i] = C.gPlttBufferFaded[bgSlot * 16 + i] = REF_PAL[i];
  }
  // The colour matrix (4x5, sRGB 0-1) that turns REF into palette `pal`
  // (16 colours from `offset` in palette RAM): least squares, per channel.
  const XtX = (() => {
    const m = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    for (let i = 1; i < 16; i++) {
      const x = [REF[i][0] / 31, REF[i][1] / 31, REF[i][2] / 31, 1];
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) m[a][b] += x[a] * x[b];
    }
    return invert4(m);
  })();
  function invert4(m) {
    const n = 4, a = m.map((r, i) => [...r, ...[0, 0, 0, 0].map((_, j) => (i === j ? 1 : 0))]);
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      [a[c], a[p]] = [a[p], a[c]];
      const d = a[c][c];
      for (let k = 0; k < 2 * n; k++) a[c][k] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = a[r][c]; for (let k = 0; k < 2 * n; k++) a[r][k] -= f * a[c][k]; }
    }
    return a.map((r) => r.slice(n));
  }
  function fitMatrix(pltt16, offset) {
    const rows = [];
    for (let ch = 0; ch < 3; ch++) {
      const xty = [0, 0, 0, 0];
      for (let i = 1; i < 16; i++) {
        const c = pltt16[offset + i], v = ((c >> (5 * ch)) & 31) / 31;
        const x = [REF[i][0] / 31, REF[i][1] / 31, REF[i][2] / 31, 1];
        for (let k = 0; k < 4; k++) xty[k] += x[k] * v;
      }
      const w = [0, 0, 0, 0];
      for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) w[a] += XtX[a][b] * xty[b];
      rows.push(w);
    }
    return rows;   // [[r_r, r_g, r_b, r_1], [g...], [b...]]
  }
  const IDENTITY = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]];
  const isIdentity = (m) => m.every((r, i) => r.every((v, j) => Math.abs(v - IDENTITY[i][j]) < 0.02));

  // ---------- an instance: the GBA, set up as a battle is ----------
  const BATTLE_BG_TEMPLATES = [
    { bg: 0, charBaseIndex: 0, mapBaseIndex: 24, screenSize: 2, paletteMode: 0, priority: 0, baseTile: 0 },
    { bg: 1, charBaseIndex: 1, mapBaseIndex: 28, screenSize: 2, paletteMode: 0, priority: 0, baseTile: 0 },
    { bg: 2, charBaseIndex: 1, mapBaseIndex: 30, screenSize: 1, paletteMode: 0, priority: 1, baseTile: 0 },
    { bg: 3, charBaseIndex: 2, mapBaseIndex: 26, screenSize: 1, paletteMode: 0, priority: 3, baseTile: 0 }
  ];
  const BATTLER_OAM = { y: 0, affineMode: 0, objMode: 0, mosaic: 0, bpp: 0, shape: 0, x: 0, matrixNum: 0, size: 3, tileNum: 0, priority: 2, paletteNum: 0, affineParam: 0 };
  // The Pokémon sprites' affine animations (src/data.c): BATTLER_AFFINE_NORMAL,
  // EMERGE (out of a ball), RETURN (into one), and the rest by index.
  const AF = (x, y, r, d) => U("AffineAnimCmd", { frame: { xScale: x, yScale: y, rotation: r, duration: d } });
  const AF_END = () => U("AffineAnimCmd", { type: 0x7FFF }), AF_JUMP = (t) => U("AffineAnimCmd", { jump: { type: 0x7FFE, target: t } });
  const BATTLER_AFFINE = {
    normal: [AF(0x100, 0x100, 0, 0), AF_END()],
    emerge: [AF(0x28, 0x28, 0, 0), AF(0x12, 0x12, 0, 12), AF_END()],
    ret: [AF(-0x2, -0x2, 0, 18), AF(-0x10, -0x10, 0, 15), AF_END()],
    squish: [AF(0xA0, 0x100, 0, 0), AF(0x4, 0x0, 0, 8), AF(-0x4, 0x0, 0, 8), AF_JUMP(1)],
    grow: [AF(0x2, 0x2, 0, 20), AF_END()],
    shrink: [AF(-0x2, -0x2, 0, 20), AF_END()],
    bigToSmall: [AF(0x100, 0x100, 0, 0), AF(-0x10, -0x10, 0, 9), AF_END()],
    growLarge: [AF(0x4, 0x4, 0, 63), AF_END()],
    tipRight: [AF(0, 0, -3, 5), AF(0, 0, 3, 5), AF_END()],
    spinShrink: [AF(-0x4, -0x4, 4, 63), AF_END()],
    tipLeft: [AF(0, 0, 3, 5), AF(0, 0, -3, 5), AF_END()],
    rotateUpAndBack: [AF(0, 0, -5, 20), AF(0, 0, 0, 20), AF(0, 0, 5, 20), AF_END()],
    spin: [AF(0, 0, 9, 110), AF_END()]
  };
  const B = BATTLER_AFFINE;
  const BATTLER_AFFINE_PLAYER = [B.normal, B.emerge, B.ret, B.squish, B.grow, B.shrink, B.growLarge, B.tipRight, B.bigToSmall].map((t) => sat(t, 0));
  const BATTLER_AFFINE_OPPONENT = [B.normal, B.emerge, B.ret, B.squish, B.grow, B.shrink, B.spinShrink, B.tipLeft, B.rotateUpAndBack, B.bigToSmall, B.spin].map((t) => sat(t, 0));

  function init() {
    if (C) return;
    C = window.BattleAnimC(E);
    // (sprite ids past the 64 — MAX_SPRITES, "none" — are read and written
    // by animations that look for a Pokémon who isn't there: spare sprites)
    while (C.gSprites.length < 256) C.gSprites.push(copy(C.gSprites[64]));
  }

  // opts: { move (name or id), attacker, target (0 p1, 1 p2, 2 p1b, 3 p2b),
  //   doubles, mons: [{ name, form, hp, maxHP, shiny, personality, ball }...],
  //   boxes: [{ cx, cy, size, top, bottom }...] (GBA px), hidden: [bools],
  //   substitute: [bools] (behind a Substitute: the doll shows), shown:
  //   [bools] (seen whatever the page says),
  //   sound(name, pan), cry(name, mode), hideBoxes(on), seed,
  //   transform(attacker, target, kind) }
  // Or, instead of a move: { anim: "general" | "status" | "special", id (a
  //   B_ANIM_ name without the prefix, or its number), arg (a stat change's:
  //   STAT_ANIM_PLUS1 + STAT_ATK...), ball (a ball's name, "great-ball"),
  //   ballCase (0 no shakes, 1-2 shakes, 3 three and out, 4 caught, 5 a
  //   trainer blocks it, 6 the ghost dodges), effectBattler, environment
  //   ("grass", "cave"...: Secret Power's and Camouflage's) }
  const ANIM_TYPES = { general: 0, move: 1, status: 2, special: 3 };
  function setup(opts) {
    init();
    seed = opts.seed >>> 0;
    const mons = [0, 1, 2, 3].map((b) => {
      const m = opts.mons && opts.mons[b];
      if (!m || (b >= 2 && !opts.doubles)) return null;
      return { name: m.name, form: m.form, species: speciesId(m.name, m.form), personality: m.personality >>> 0 || 0x12345678,
        hp: m.hp == null ? 1 : m.hp, maxHP: m.maxHP || 1, shiny: !!m.shiny, ball: ballIdOf(m.ball) };
    });
    inst = { doubles: !!opts.doubles, mons, boxes: opts.boxes || [], frame: 0, seUntil: 0, cryUntil: 0,
      sound: opts.sound, cry: opts.cry, hideBoxes: opts.hideBoxes || (() => {}),
      moveType: D.types["TYPE_" + String(opts.type || "").toUpperCase()] || 0, physical: opts.category === "Physical",
      moveTarget: 0, battlerTiles: [], pictures: [], picture: opts.picture, itemPicture: opts.itemPicture,
      doll: [false, false, false, false], transform: opts.transform };
    // The machine, cleared.
    new Uint8Array(VRAM).fill(0); new Uint8Array(PLTT).fill(0); new Uint8Array(OAMB).fill(0); io.fill(0);
    hdma.fill(null); bgBattler.fill(null); moveBg = false;
    for (const r of ranges.splice(0)) if (r.buf === PLTT || r.buf === VRAM || r.buf === OAMB) ranges.push(r);
    ranges.sort((a, b) => a.base - b.base);
    rangeOf = new WeakMap();
    for (const r of ranges) rangeOf.set(r.buf, r);
    nextAddr = 0x02000000; nextHandle = 0x0A000000;
    const ext = C.__externs();
    for (const k of Object.keys(ext)) if (!(k in D.gfx) && D.labels[k] === undefined) E[k] = ext[k];
    Object.assign(E, C.__state());
    E.gAffineAnims_BattleSpritePlayerSide = BATTLER_AFFINE_PLAYER;
    E.gAffineAnims_BattleSpriteOpponentSide = BATTLER_AFFINE_OPPONENT;
    // Where the battle is (Secret Power's and Camouflage's animations go by it).
    const env = D.environments[String(opts.environment || "plain").toUpperCase().replace(/[^A-Z0-9]+/g, "_")] || D.environments.PLAIN || {};
    E.gBattleEnvironment = 0;
    E.gBattleEnvironmentInfo = [{ secretPowerAnimation: (env.secretPower && E[env.secretPower]) || E.gBattleAnimMove_Slam || null, camouflageBlend: env.camouflageBlend || 0x7FFF }];
    E.gBattleSpritesDataPtr = zero({ battlerData: [0, 1, 2, 3].map(() => zero(C.__shapes.BattleSpriteInfo())),
      healthBoxesData: [0, 1, 2, 3].map(() => zero(C.__shapes.BattleHealthboxInfo())),
      animationData: zero(C.__shapes.BattleAnimationInfo()), battleBars: [] });
    E.gMonSpritesGfxPtr = E.gMonSpritesGfxPtr || {};
    E.gBattleAnimBgTileBuffer = P(new Uint8Array(0x2000), 0);
    E.gBattleAnimBgTilemapBuffer = P(new Uint8Array(0x1000), 0);
    E.gSpeciesInfo = SPECIES_INFO;
    E.gMain.inBattle = 1;
    E.gMain.callback2 = null;
    E.gBattleTypeFlags = inst.doubles ? 1 : 0;   // (BATTLE_TYPE_DOUBLE)
    E.gBattlersCount = inst.doubles ? 4 : 2;
    E.gAbsentBattlerFlags = 0;
    for (let b = 0; b < 4; b++) {
      if (b >= E.gBattlersCount || !mons[b]) E.gAbsentBattlerFlags |= 1 << b;
      if (mons[b]) { E.gBattleMons[b].species = mons[b].species; E.gBattleMons[b].hp = mons[b].hp; E.gBattleMons[b].maxHP = mons[b].maxHP; E.gAnimBattlerSpecies[b] = mons[b].species; }
    }
    // The engine, reset as the battle starts it.
    C.ResetSpriteData();
    C.ResetTasks();
    C.FreeAllSpritePalettes();
    C.ResetPaletteFade();
    C.ScanlineEffect_Clear();
    C.ResetBgsAndClearDma3BusyFlags(0);
    C.InitBgsFromTemplates(0, BATTLE_BG_TEMPLATES, 4);
    for (let bg = 0; bg < 4; bg++) C.ShowBg(bg);
    // (BG1 and BG2's tilemap buffers: the battle's windows' (window.c InitWindows))
    C.SetBgTilemapBuffer(1, P(new Uint16Array(0x800), 0));
    C.SetBgTilemapBuffer(2, P(new Uint16Array(0x800), 0));
    // As the battle's intro leaves them (battle_intro.c): BG1 and BG2 on
    // character block 0, the windows on (and letting everything show).
    C.SetBgAttribute(1, 1, 0); C.SetBgAttribute(2, 1, 0);   // (BG_ATTR_CHARBASEINDEX)
    E.SetGpuReg(0x0A, 0x9C00);   // BG1CNT: priority 0, char 0, screen 28, 256x512
    E.SetGpuReg(0x0C, 0x5E00);   // BG2CNT: priority 0, char 0, screen 30, 512x256
    E.SetGpuReg(0x00, 0x8000 | 0x2000 | 0x1000 | 0x0040 | 0x0F00);   // DISPCNT: OBJ window, WIN0, OBJ (1D), BG0-3
    E.SetGpuReg(0x48, 0x3F3F); E.SetGpuReg(0x4A, 0x3F3F);   // WININ, WINOUT
    E.SetGpuReg(0x50, 0); E.SetGpuReg(0x52, 0); E.SetGpuReg(0x54, 0);
    C.ClearBattleAnimationVars();
    C.gReservedSpritePaletteCount = 4;   // (OBJ palettes 0-3: the Pokémon's, as the battle reserves them)
    // The Pokémon: sprites 0-3 whose tiles stand for their pictures.
    for (let b = 0; b < 4; b++) {
      E.gBattlerSpriteIds[b] = 64;
      if (!mons[b] || b >= E.gBattlersCount) continue;
      // (As the GBA has them: rotating and scaling by their own affine
      // animations, with an OAM matrix each, except during a move's
      // animation: SetBattlerSpriteAffineMode(ST_OAM_AFFINE_OFF).)
      const template = { tileTag: 0xFFFF, paletteTag: 0xFFFF, oam: Object.assign({}, BATTLER_OAM, { affineMode: 1 }),
        anims: C.gDummySpriteAnimTable, images: sat([{ data: P(new Uint8Array(2048), 0), size: 2048, relativeFrames: 0 }], 0),
        affineAnims: (b & 1) ? BATTLER_AFFINE_OPPONENT : BATTLER_AFFINE_PLAYER, callback: C.SpriteCallbackDummy };
      const id = C.CreateSprite(template, coord(b, 2), coord(b, 4), C.GetBattlerSpriteSubpriority(b));
      const s = C.gSprites[id];
      if (!opts.anim) { E.gBattleSpritesDataPtr.healthBoxesData[b].matrixNum = s.oam.matrixNum; s.oam.affineMode = 0; s.oam.matrixNum = 0; }
      s.oam.paletteNum = b;
      s.invisible = opts.hidden && opts.hidden[b] ? 1 : 0;
      E.gBattlerSpriteIds[b] = id;
      inst.battlerTiles[b] = s.oam.tileNum;
      for (let i = 0; i < 16; i++) C.gPlttBufferUnfaded[0x100 + b * 16 + i] = C.gPlttBufferFaded[0x100 + b * 16 + i] = REF_PAL[i];
      E.gBattleSpritesDataPtr.battlerData[b].invisible = s.invisible;
    }
    for (let b = 0; b < 4; b++) {
      const id = C.CreateSprite(C.gDummySpriteTemplate, 0, 0, 0);
      C.gSprites[id].invisible = 1;
      E.gHealthboxSpriteIds[b] = id;
    }
    setRefPalette(BG_REF_SLOT);
    for (let b = 0; b < 4; b++) {
      if (!opts.substitute || !opts.substitute[b] || !mons[b] || b >= E.gBattlersCount) continue;
      doll(b, true);
      C.gSprites[E.gBattlerSpriteIds[b]].y = dollY(b);
    }
    C.TransferPlttBuffer();
    // The move, or another animation.
    const kind = opts.anim || "move";
    let id = kind === "move" ? (typeof opts.move === "number" ? opts.move : moveIdOf(opts.move)) : animIdOf(kind, opts.id);
    if (id == null) throw new Error("battle anim: no " + kind + " animation " + opts.id);
    E.gBattlerAttacker = E.gBattleAnimAttacker = opts.attacker | 0;
    E.gBattlerTarget = E.gBattleAnimTarget = opts.target == null ? (kind === "move" ? (opts.attacker ^ 1) : opts.attacker | 0) : opts.target;
    E.gEffectBattler = opts.effectBattler == null ? E.gBattleAnimTarget : opts.effectBattler;
    E.gCurrentMove = E.gAnimMoveIndex = kind === "move" ? id : 0;
    E.gLastUsedItem = ballIdOf(opts.ball);
    E.gBattleSpritesDataPtr.animationData.animArg = opts.arg | 0;
    E.gBattleSpritesDataPtr.animationData.ballThrowCaseId = opts.ballCase | 0;
    E.gAnimMoveTurn = opts.turn | 0;
    E.gAnimMoveDmg = opts.damage | 0;
    E.gAnimMovePower = opts.power | 0;
    E.gAnimFriendship = opts.friendship == null ? 255 : opts.friendship;
    E.gWeatherMoveAnim = opts.weather | 0;
    E.gBattleScripting.animTurn = opts.turn | 0;
    E.gBattleScripting.animTargetsHit = opts.targetsHit | 0;
    E.gAnimDisableStructPtr = { rolloutTimer: opts.rolloutTimer | 0, furyCutterCounter: opts.furyCutterCounter | 0,
      stockpileCounter: opts.stockpileCounter | 0, syrupBombIsShiny: 0 };
    E.gFieldTimers.terrain = opts.terrain | 0;
    E.gDoingBattleAnim = 1;
    C.LaunchBattleAnimation(ANIM_TYPES[kind], id);
    return inst;
  }
  // Pokémon XD's Shadow moves have no animation of their own here: each plays the nearest move's (ui/battle-screen.js
  // wraps it in the user's dark aura).
  const STAND_IN = {
    "Shadow Blitz": "Tackle", "Shadow Rush": "Take Down", "Shadow Break": "Double-Edge", "Shadow End": "Giga Impact",
    "Shadow Wave": "Dark Pulse", "Shadow Rave": "Night Daze", "Shadow Storm": "Twister", "Shadow Fire": "Flamethrower",
    "Shadow Bolt": "Thunderbolt", "Shadow Chill": "Ice Beam", "Shadow Blast": "Air Slash", "Shadow Half": "Pain Split",
    "Shadow Sky": "Haze", "Shadow Hold": "Mean Look", "Shadow Mist": "Mist", "Shadow Panic": "Confuse Ray",
    "Shadow Down": "Screech", "Shadow Shed": "Defog"
  };
  function moveIdOf(name) {
    const m = D.moves[name] || D.moves[STAND_IN[name]] || D.moves[normName[norm(name)]];
    return m ? m.id : 0;
  }
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  // "STATS_CHANGE", "stats change", 0: the id in its table.
  function animIdOf(kind, id) {
    const table = D.anims[kind];
    if (!table) return null;
    if (typeof id === "number") return Object.values(table).includes(id) ? id : null;
    const key = String(id).toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    if (table[key] != null) return table[key];
    const k = Object.keys(table).find((n) => norm(n) === norm(id));
    return k == null ? null : table[k];
  }
  // "poke-ball", "Great Ball", a BALL_ name or its number: the ball's id.
  function ballIdOf(ball) {
    if (ball == null || ball === "") return 0;
    if (typeof ball === "number") return ball;
    const key = "BALL_" + String(ball).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^BALL_/, "").replace(/_?BALL$/, "");
    return D.balls[key] || D.balls.BALL_POKE;
  }
  const normName = {};
  for (const n of Object.keys(D.moves)) normName[norm(n)] = n;

  // gSpeciesInfo: what the C reads of it (the coordinates are this game's).
  const SPECIES_INFO = new Proxy({}, { get: () => SPECIES_ROW });
  const SPECIES_ROW = { frontPicYOffset: 0, backPicYOffset: 0, enemyMonElevation: 0, frontPicSize: 0x88, backPicSize: 0x88,
    backPicFemale: null, frontPicFemale: null, backPicSizeFemale: 0x88, frontPicSizeFemale: 0x88, frontAnimFrames: null };

  // One frame, as the battle's main loop runs it: the controller runs the
  // script, then BattleMainCB2 (sprites, OAM, palette fade, tasks), then
  // VBlankCB_Battle (the scroll and window registers, OAM, palette RAM and
  // the scanline effect's DMA).
  function frame() {
    if (E.gAnimScriptActive && E.gAnimScriptCallback) E.gAnimScriptCallback();
    C.AnimateSprites();
    C.BuildOamBuffer();
    C.UpdatePaletteFade();
    C.RunTasks();
    vblank();
    inst.frame++;
  }
  function vblank() {
    ioWrite16(0x10, E.gBattle_BG0_X); ioWrite16(0x12, E.gBattle_BG0_Y);
    ioWrite16(0x14, E.gBattle_BG1_X); ioWrite16(0x16, E.gBattle_BG1_Y);
    ioWrite16(0x18, E.gBattle_BG2_X); ioWrite16(0x1A, E.gBattle_BG2_Y);
    ioWrite16(0x1C, E.gBattle_BG3_X); ioWrite16(0x1E, E.gBattle_BG3_Y);
    ioWrite16(0x40, E.gBattle_WIN0H); ioWrite16(0x44, E.gBattle_WIN0V);
    ioWrite16(0x42, E.gBattle_WIN1H); ioWrite16(0x46, E.gBattle_WIN1V);
    C.ProcessSpriteCopyRequests();
    C.TransferPlttBuffer();
    C.ScanlineEffect_InitHBlankDmaTransfer();
  }
  const done = () => !E.gAnimScriptActive;

  // Run a move's animation without a screen: { frames, error }.
  function run(opts) {
    const max = opts.maxFrames || 3600;
    try {
      setup(opts);
      let n = 0;
      while (!done() && n < max) { frame(); if (opts.onFrame) opts.onFrame(n, api); n++; }
      return { frames: n, finished: done() };
    } catch (e) {
      return { frames: inst ? inst.frame : 0, error: e };
    }
  }

  // ---------- the screen ----------
  // Each frame the GBA's picture is drawn on a canvas over the field (240 x
  // 112 GBA pixels, the battle scene above the text box), in the order the
  // GBA layers it: by priority, backgrounds (BG3 furthest) then sprites (the
  // lowest OAM index on top). The backgrounds and the animation's sprites
  // are drawn pixel by pixel (scanline effects and windows included); a
  // Pokémon is its <img>, drawn with its sprite's (or background's)
  // position, rotation and scale, palette (as a colour matrix), blending and
  // window. The battle background is the page's: shifted and recoloured as
  // BG3 would be, unless a move's background covers it.
  const W = 240, H = 112;
  const OBJ_SIZES = [[[8, 8], [16, 16], [32, 32], [64, 64]], [[16, 8], [32, 8], [32, 16], [64, 32]], [[8, 16], [8, 32], [16, 32], [32, 64]], [[8, 8], [8, 8], [8, 8], [8, 8]]];
  const LINE_REGS = 0x58 >> 1;
  function rgb(c) {
    const r = c & 31, g = (c >> 5) & 31, b = (c >> 10) & 31;
    return (0xFF000000 | (((b << 3) | (b >> 2)) << 16) | (((g << 3) | (g >> 2)) << 8) | ((r << 3) | (r >> 2))) >>> 0;
  }
  // The registers on each line, after the H-blank DMA's writes.
  function lineRegs() {
    const out = new Uint16Array(H * LINE_REGS), lio = io.slice(0, LINE_REGS);
    const active = hdma.filter((d) => d && d.dst >= 0x04000000 && d.dst < 0x04000000 + LINE_REGS * 2);
    for (let y = 0; y < H; y++) {
      if (y > 0) for (const d of active) {
        const src = d.src + (y - 1) * d.count * d.unit * (d.srcCtl === 2 ? 0 : 1);
        for (let k = 0; k < d.count; k++) {
          const v = readUnit(ptr(src + k * d.unit, 1), d.unit), off = d.dst - 0x04000000 + (d.dstCtl === 2 ? 0 : k * d.unit);
          lio[off >> 1] = v & 0xFFFF;
          if (d.unit === 4) lio[(off >> 1) + 1] = v >>> 16;
        }
      }
      out.set(lio, y * LINE_REGS);
    }
    return out;
  }
  function makeRenderer(o) {
    const canvas = document.createElement("canvas");
    const fr = o.field.getBoundingClientRect();
    const K = Math.max(1, Math.min(6, Math.round(fr.width * (window.devicePixelRatio || 1) / W)));
    canvas.width = W * K; canvas.height = H * K;
    canvas.className = "battle-anim-screen";
    Object.assign(canvas.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", pointerEvents: "none", imageRendering: "pixelated" });
    if (o.before && o.before.parentNode === o.field) o.field.insertBefore(canvas, o.before); else o.field.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const layer = document.createElement("canvas");
    layer.width = W; layer.height = H;
    const lctx = layer.getContext("2d");
    const img = lctx.createImageData(W, H), px = new Uint32Array(img.data.buffer);
    // The colour matrices, as SVG filters.
    const svgNS = "http://www.w3.org/2000/svg";
    let svg = document.getElementById("battle-anim-filters");
    if (!svg) {
      svg = document.createElementNS(svgNS, "svg");
      svg.id = "battle-anim-filters";
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
      svg.style.position = "absolute";
      document.body.appendChild(svg);
    }
    const filters = new Map();
    function filterFor(m, bright) {
      // m: 3x4 (REF -> palette); bright: -1..1 (BLDY darken / lighten)
      let rows = m.map((r) => r.slice());
      if (bright > 0) rows = rows.map((r, i) => r.map((v, j) => v * (1 - bright) + (j === 3 ? bright : 0)));
      else if (bright < 0) rows = rows.map((r) => r.map((v) => v * (1 + bright)));
      if (!bright && isIdentity(rows)) return "";
      const vals = rows.map((r) => [r[0], r[1], r[2], 0, r[3]].map((v) => v.toFixed(3)).join(" ")).join(" ") + " 0 0 0 1 0";
      let id = filters.get(vals);
      if (!id) {
        id = "battle-anim-cm-" + Math.random().toString(36).slice(2, 9);
        const f = document.createElementNS(svgNS, "filter");
        f.id = id;
        f.setAttribute("color-interpolation-filters", "sRGB");
        const cm = document.createElementNS(svgNS, "feColorMatrix");
        cm.setAttribute("type", "matrix");
        cm.setAttribute("values", vals);
        f.appendChild(cm);
        svg.appendChild(f);
        filters.set(vals, id);
      }
      return "url(#" + id + ")";
    }
    const pal = new Uint32Array(512), pltt = view(PLTT, 2), vram8 = view(VRAM, 1), vram16 = view(VRAM, 2);
    // (the OBJ window, where a picture stands in a sprite: drawn here and read back)
    const wcan = document.createElement("canvas");
    wcan.width = W; wcan.height = H;
    const wctx = wcan.getContext("2d", { willReadFrequently: true });
    const terrainBase = (o.terrain || []).map((t) => ({ el: t, filter: t.style.filter, transform: t.style.transform, posX: t.style.backgroundPositionX }));

    // A background, line by line, into px (where its window lets it).
    function drawBg(bg, L, mask, brightLines) {
      const mode = L[0] & 7;
      const affine = (mode === 1 && bg === 2) || (mode === 2 && bg >= 2);
      for (let y = 0; y < H; y++) {
        const bright = brightLines ? brightLines[y] : 0;
        const R = y * LINE_REGS, cnt = L[R + 4 + bg], cb = ((cnt >> 2) & 3) * 0x4000, sb = ((cnt >> 8) & 31) * 0x800;
        const row = y * W;
        if (!affine) {
          const size = cnt >> 14, BW = size & 1 ? 512 : 256, BH = size & 2 ? 512 : 256, c256 = cnt & 0x80;
          const hofs = L[R + 8 + bg * 2] & 0x1FF, vofs = L[R + 9 + bg * 2] & 0x1FF;
          const by = (y + vofs) & (BH - 1), blockRow = (by >> 8) * (BW >> 8), ty = (by & 255) >> 3;
          for (let x = 0; x < W; x++) {
            if (mask && !(mask[row + x] & (1 << bg))) continue;
            const bx = (x + hofs) & (BW - 1);
            const se = vram16[((sb + (blockRow + (bx >> 8)) * 0x800) >> 1) + ty * 32 + ((bx & 255) >> 3)];
            let tx = bx & 7, tyy = by & 7;
            if (se & 0x400) tx = 7 - tx;
            if (se & 0x800) tyy = 7 - tyy;
            let c;
            if (c256) {
              const i = vram8[cb + (se & 0x3FF) * 64 + tyy * 8 + tx];
              if (!i) continue;
              c = pal[i];
            } else {
              const v = vram8[cb + (se & 0x3FF) * 32 + tyy * 4 + (tx >> 1)], i = tx & 1 ? v >> 4 : v & 15;
              if (!i) continue;
              c = pal[(se >> 12) * 16 + i];
            }
            px[row + x] = bright ? brighten(c, bright) : c;
          }
        } else {
          const size = 128 << (cnt >> 14), wrap = cnt & 0x2000, base = bg === 2 ? 0x10 : 0x18;
          const pa = s16(L[R + base]), pb = s16(L[R + base + 1]), pc = s16(L[R + base + 2]), pd = s16(L[R + base + 3]);
          const refX = ((L[R + base + 4] | (L[R + base + 5] << 16)) << 4) >> 4, refY = ((L[R + base + 6] | (L[R + base + 7] << 16)) << 4) >> 4;
          let X = refX + pb * y, Y = refY + pd * y;
          for (let x = 0; x < W; x++, X += pa, Y += pc) {
            if (mask && !(mask[row + x] & (1 << bg))) continue;
            let tx = X >> 8, ty = Y >> 8;
            if (wrap) { tx &= size - 1; ty &= size - 1; } else if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;
            const t = vram8[sb + (ty >> 3) * (size >> 3) + (tx >> 3)];
            const i = vram8[cb + t * 64 + (ty & 7) * 8 + (tx & 7)];
            if (!i) continue;
            px[row + x] = bright ? brighten(pal[i], bright) : pal[i];
          }
        }
      }
    }
    function brighten(c, b) {
      let r = c & 255, g = (c >> 8) & 255, bl = (c >> 16) & 255;
      if (b > 0) { r += (255 - r) * b; g += (255 - g) * b; bl += (255 - bl) * b; } else { r *= 1 + b; g *= 1 + b; bl *= 1 + b; }
      return (0xFF000000 | (bl << 16) | (g << 8) | r) >>> 0;
    }
    function objBox(e) {
      const [w, h] = OBJ_SIZES[e.shape & 3][e.size & 3];
      let x = e.x & 511, y = e.y & 255;
      if (x >= 256) x -= 512;
      if (y >= 160) y -= 256;
      const dbl = (e.affineMode & 3) === 3, bw = dbl ? w * 2 : w, bh = dbl ? h * 2 : h;
      return { w, h, x, y, bw, bh };
    }
    function matrixOf(e, oam) {
      if (!(e.affineMode & 1)) return null;
      const m = (e.matrixNum & 31) * 4;
      return [s16(oam[m].affineParam), s16(oam[m + 1].affineParam), s16(oam[m + 2].affineParam), s16(oam[m + 3].affineParam)];
    }
    // An animation's sprite, into px (or into the OBJ window's mask).
    function drawObj(e, oam, mask, brightLines, winMask) {
      const { w, h, x, y, bw, bh } = objBox(e), M = matrixOf(e, oam), c256 = e.bpp & 1;
      const tileBase = 0x10000 + (e.tileNum & 1023) * 32, rowTiles = (w >> 3) * (c256 ? 2 : 1), palBase = 256 + (c256 ? 0 : (e.paletteNum & 15) * 16);
      const hf = !M && e.matrixNum & 8, vf = !M && e.matrixNum & 16;
      for (let sy = 0; sy < bh; sy++) {
        const Y = y + sy;
        if (Y < 0 || Y >= H) continue;
        for (let sx = 0; sx < bw; sx++) {
          const X = x + sx;
          if (X < 0 || X >= W) continue;
          let tx, ty;
          if (M) {
            const dx = sx - (bw >> 1), dy = sy - (bh >> 1);
            tx = ((M[0] * dx + M[1] * dy) >> 8) + (w >> 1); ty = ((M[2] * dx + M[3] * dy) >> 8) + (h >> 1);
            if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
          } else { tx = hf ? w - 1 - sx : sx; ty = vf ? h - 1 - sy : sy; }
          const k = Y * W + X;
          if (mask && !(mask[k] & 16)) continue;
          let i;
          if (c256) i = vram8[tileBase + (ty >> 3) * rowTiles * 32 + (tx >> 3) * 64 + (ty & 7) * 8 + (tx & 7)];
          else { const v = vram8[tileBase + (ty >> 3) * rowTiles * 32 + (tx >> 3) * 32 + (ty & 7) * 4 + ((tx & 7) >> 1)]; i = tx & 1 ? v >> 4 : v & 15; }
          if (!i) continue;
          if (winMask) { winMask[k] = 1; continue; }
          const bright = brightLines ? brightLines[Y] : 0;
          px[k] = bright ? brighten(pal[palBase + i], bright) : pal[palBase + i];
        }
      }
    }
    // Where each window lets each layer show: per pixel, bits 0-3 the
    // backgrounds, 4 the sprites, 5 the colour effects (null: everywhere).
    function windowMask(L, oam) {
      const disp = L[0];
      if (!(disp & 0xE000)) return null;
      let open = true;   // (every window letting everything show: as none)
      for (let y = 0; y < H && open; y++) open = (L[y * LINE_REGS + 0x24] & 0x3F3F) === 0x3F3F && (L[y * LINE_REGS + 0x25] & 0x3F3F) === 0x3F3F;
      if (open) return null;
      let objWin = null;
      if (disp & 0x8000) {
        objWin = new Uint8Array(W * H);
        let pics = null;
        for (const e of oam) {
          if ((e.objMode & 3) !== 2 || (e.affineMode & 3) === 2) continue;
          const who = battlerOf(e);
          if (!who) { drawObj(e, oam, null, 0, objWin); continue; }
          // (A Pokémon's picture as the window, a stat change's: its opaque pixels.)
          const im = who.img;
          if (!im || !im.complete || !im.naturalWidth) continue;
          if (!pics) { pics = wctx; wctx.setTransform(1, 0, 0, 1, 0, 0); wctx.clearRect(0, 0, W, H); }
          const { x, y, bw, bh } = objBox(e), M = matrixOf(e, oam), S = who.size;
          let a = 1, bb = 0, c = 0, d = 1;
          if (M) {
            const det = (M[0] * M[3] - M[1] * M[2]) / 65536;
            if (Math.abs(det) < 1e-6) continue;
            a = M[3] / 256 / det; bb = -M[1] / 256 / det; c = -M[2] / 256 / det; d = M[0] / 256 / det;
          } else { if (e.matrixNum & 8) a = -1; if (e.matrixNum & 16) d = -1; }
          wctx.setTransform(a, c, bb, d, x + bw / 2, y + bh / 2);
          wctx.drawImage(im, -S / 2, -S / 2, S, S);
        }
        if (pics) {
          const data = wctx.getImageData(0, 0, W, H).data;
          for (let k = 0; k < W * H; k++) if (data[k * 4 + 3] > 127) objWin[k] = 1;
        }
      }
      const mask = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) {
        const R = y * LINE_REGS, winin = L[R + 0x24], winout = L[R + 0x25];
        const in0 = disp & 0x2000 && inV(L[R + 0x22], y), in1 = disp & 0x4000 && inV(L[R + 0x23], y);
        for (let x = 0; x < W; x++) {
          let m;
          if (in0 && inH(L[R + 0x20], x)) m = winin & 0x3F;
          else if (in1 && inH(L[R + 0x21], x)) m = (winin >> 8) & 0x3F;
          else if (objWin && objWin[y * W + x]) m = (winout >> 8) & 0x3F;
          else m = winout & 0x3F;
          mask[y * W + x] = m;
        }
      }
      return mask;
    }
    const inH = (r, x) => { const l = r >> 8, rr = r & 255; return l <= rr ? x >= l && x < rr : x >= l || x < rr; };
    const inV = (r, y) => { const t = r >> 8, b = r & 255; return t <= b ? y >= t && y < b : y >= t || y < b; };
    function clipFor(mask, bit) {
      if (!mask) return null;
      const path = new Path2D();
      let any = false;
      for (let y = 0; y < H; y++) {
        let x0 = -1;
        for (let x = 0; x <= W; x++) {
          const on = x < W && mask[y * W + x] & bit;
          if (on && x0 < 0) x0 = x;
          else if (!on && x0 >= 0) { path.rect(x0 * K, y * K, (x - x0) * K, K); x0 = -1; any = true; }
        }
      }
      return any ? path : new Path2D();
    }
    // A sprite whose tiles stand for a picture: a Pokémon's, or another
    // (pictures(): { img, size, tint }).
    function battlerOf(e) {
      const t = e.tileNum & 1023;
      for (let b = 0; b < 4; b++) {
        if (inst.doll[b]) continue;   // (the doll: tiles)
        if (inst.battlerTiles[b] != null && t >= inst.battlerTiles[b] && t < inst.battlerTiles[b] + 64 && inst.boxes[b])
          return { img: o.sprites[b], size: inst.boxes[b].size, tint: o.tint ? o.tint(b) : "" };
      }
      for (const p of inst.pictures) if (t >= p.tile && t < p.tile + p.tiles) return p;
      return null;
    }
    const battlerPic = (b) => (inst.boxes[b] ? { img: o.sprites[b], size: inst.boxes[b].size, tint: o.tint ? o.tint(b) : "" } : null);
    // A picture, where its sprite (or background) has it.
    // (mosaic: the picture in blocks that many GBA pixels wide, as REG_MOSAIC has it)
    const mcan = document.createElement("canvas"), mctx = mcan.getContext("2d");
    function drawBattler(pic, cx, cy, M, hf, vf, palOffset, alpha, comp, bright, clip, strips, mosaic) {
      let im = pic && pic.img;
      if (!im || !im.complete || !im.naturalWidth) return;
      const S = pic.size;
      if (mosaic > 1) {
        const n = Math.max(1, Math.ceil(S / mosaic));
        mcan.width = n; mcan.height = n;
        mctx.imageSmoothingEnabled = false;
        mctx.clearRect(0, 0, n, n);
        mctx.drawImage(im, 0, 0, n, n);
        im = mcan;
      }
      ctx.save();
      if (clip) ctx.clip(clip);
      const tint = pic.tint || "";
      const f = filterFor(fitMatrix(pltt, palOffset), bright);
      ctx.filter = [tint, f].filter(Boolean).join(" ") || "none";
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = comp;
      if (strips) {
        // (a background scrolled line by line: a strip of the picture a line)
        const ih = im.naturalHeight, iw = im.naturalWidth;
        for (const [y, scx, scy] of strips) {
          const top = scy - S / 2, row = (y - top) / S;
          if (row < 0 || row >= 1) continue;
          ctx.drawImage(im, 0, Math.floor(row * ih), iw, Math.max(1, Math.round(ih / S)), (scx - S / 2) * K, y * K, S * K, K);
        }
      } else {
        let a = 1, bb = 0, c = 0, d = 1;
        if (M) {
          const det = (M[0] * M[3] - M[1] * M[2]) / 65536;
          if (Math.abs(det) < 1e-6) { ctx.restore(); return; }
          a = M[3] / 256 / det; bb = -M[1] / 256 / det; c = -M[2] / 256 / det; d = M[0] / 256 / det;
        } else { if (hf) a = -1; if (vf) d = -1; }
        ctx.setTransform(K * a, K * c, K * bb, K * d, K * cx, K * cy);
        ctx.drawImage(im, -S / 2, -S / 2, S, S);
      }
      ctx.restore();
    }

    function render() {
      const L = lineRegs(), disp = L[0];
      for (let i = 0; i < 512; i++) pal[i] = rgb(pltt[i]);
      const oam = E.gMain.oamBuffer;
      const mask = windowMask(L, oam);
      // A layer's blending on each line (BLDCNT, BLDALPHA, BLDY can change
      // line by line): its alpha and composite operation, its brightness.
      const blends = new Map();
      const blendOf = (bit, semi) => {
        const k = bit + (semi ? "s" : "");
        if (blends.has(k)) return blends.get(k);
        const alpha = new Float32Array(H), comp = [], bright = new Float32Array(H);
        let anyBright = false, key = "";
        for (let y = 0; y < H; y++) {
          const R = y * LINE_REGS, bldcnt = L[R + 0x28], effect = (bldcnt >> 6) & 3, ba = L[R + 0x29];
          const eva = Math.min(16, ba & 31), evb = Math.min(16, (ba >> 8) & 31), evy = Math.min(16, L[R + 0x2A] & 31) / 16;
          alpha[y] = 1; comp[y] = "source-over";
          if (semi || (effect === 1 && bldcnt & bit)) {
            // (EVA of this over EVB of what's under: as alpha, or added)
            alpha[y] = eva / 16;
            if (evb >= 16 && eva < 16) comp[y] = "lighter";
          } else if (effect >= 2 && bldcnt & bit) { bright[y] = effect === 2 ? evy : -evy; anyBright = anyBright || !!bright[y]; }
          key += alpha[y] + comp[y][0] + bright[y] + ",";
        }
        const bl = { key, alpha, comp, bright: anyBright ? bright : null, at: (y) => Math.max(0, Math.min(H - 1, Math.round(y))) };
        blends.set(k, bl);
        return bl;
      };
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (moveBg && disp & 0x800) { ctx.fillStyle = "#" + (pal[0] & 0xFFFFFF).toString(16).padStart(6, "0").replace(/(..)(..)(..)/, "$3$2$1"); ctx.fillRect(0, 0, canvas.width, canvas.height); }
      // The layers, back to front.
      const items = [];
      for (let prio = 3; prio >= 0; prio--) {
        for (let bg = 3; bg >= 0; bg--) if (disp & (0x100 << bg) && (L[4 + bg] & 3) === prio) items.push({ bg });
        if (disp & 0x1000) for (let i = oam.length - 1; i >= 0; i--) {
          const e = oam[i];
          if ((e.priority & 3) !== prio || (e.affineMode & 3) === 2 || (e.objMode & 3) === 2) continue;
          items.push({ obj: e });
        }
      }
      let pending = null;   // (a software layer being drawn: its blend)
      const flush = () => {
        if (!pending) return;
        lctx.putImageData(img, 0, 0);
        ctx.save();
        // (in bands of lines blended alike)
        for (let y0 = 0; y0 < H;) {
          let y1 = y0 + 1;
          while (y1 < H && pending.alpha[y1] === pending.alpha[y0] && pending.comp[y1] === pending.comp[y0]) y1++;
          if (pending.alpha[y0] > 0) {
            ctx.globalAlpha = pending.alpha[y0]; ctx.globalCompositeOperation = pending.comp[y0];
            ctx.drawImage(layer, 0, y0, W, y1 - y0, 0, y0 * K, canvas.width, (y1 - y0) * K);
          }
          y0 = y1;
        }
        ctx.restore();
        pending = null;
      };
      const begin = (bl) => {
        if (pending && pending.key === bl.key) return;
        flush();
        px.fill(0);
        pending = bl;
      };
      for (const it of items) {
        if (it.bg != null) {
          const bg = it.bg, bl = blendOf(1 << bg, false);
          begin(bl);
          drawBg(bg, L, mask, bl.bright);
          const bb = bgBattler[bg];
          if (bb && inst.boxes[bb.battler]) {
            flush();
            const strips = [];
            for (let y = 0; y < H; y++) {
              const R = y * LINE_REGS, hofs = L[R + 8 + bg * 2] & 0x1FF, vofs = L[R + 9 + bg * 2] & 0x1FF;
              strips.push([y, wrapPos(bb.x + 32 - hofs), wrapPos(bb.y + 32 - vofs)]);
            }
            const same = strips.every((s) => s[1] === strips[0][1] && s[2] === strips[0][2]);
            const ly = bl.at(strips[0][2]);
            const mosaic = L[4 + bg] & 0x40 ? Math.max(L[0x26] & 15, (L[0x26] >> 4) & 15) + 1 : 0;
            drawBattler(battlerPic(bb.battler), strips[0][1], strips[0][2], null, false, false, bb.pal * 16, bl.alpha[ly], bl.comp[ly], bl.bright ? bl.bright[ly] : 0, clipFor(mask, 1 << bg), same ? null : strips, mosaic);
          }
        } else {
          const e = it.obj, who = battlerOf(e), bl = blendOf(16, (e.objMode & 3) === 1);
          if (who) {
            flush();
            const { x, y, bw, bh } = objBox(e);
            const ly = bl.at(y + bh / 2);
            const mosaic = e.mosaic ? Math.max((L[0x26] >> 8) & 15, (L[0x26] >> 12) & 15) + 1 : 0;
            drawBattler(who, x + bw / 2, y + bh / 2, matrixOf(e, oam), e.matrixNum & 8, e.matrixNum & 16, 256 + (e.paletteNum & 15) * 16, bl.alpha[ly], bl.comp[ly], bl.bright ? bl.bright[ly] : 0, clipFor(mask, 16), null, mosaic);
          } else {
            begin(bl);
            drawObj(e, oam, mask, bl.bright, null);
          }
        }
      }
      flush();
      // The battle background (the page's): BG3's scroll and palette.
      if (o.terrain) {
        const m = fitMatrix(pltt, BG_REF_SLOT * 16);
        const bl = blendOf(8, false);
        const f = moveBg ? "" : filterFor(m, bl.bright ? bl.bright[H >> 1] : 0);
        const dx = s16(L[8 + 6] << 7) >> 7, dy = s16(L[9 + 6] << 7) >> 7;
        const fw = o.field.clientWidth / W;
        for (const t of terrainBase) {
          t.el.style.filter = [t.filter, f].filter(Boolean).join(" ");
          // (the picture repeats across: moved within itself, as BG3 wraps)
          t.el.style.backgroundPositionX = dx ? (-dx * fw) + "px" : t.posX;
          t.el.style.transform = dy ? "translateY(" + (-dy * fw) + "px)" : t.transform;
        }
      }
    }
    const wrapPos = (v) => { v = ((v % 512) + 512) % 512; return v > 384 ? v - 512 : v; };
    function destroy() {
      canvas.remove();
      for (const t of terrainBase) { t.el.style.filter = t.filter; t.el.style.transform = t.transform; t.el.style.backgroundPositionX = t.posX; }
    }
    return { render, destroy };
  }

  // Play a move's animation over the battle field: resolves when it ends.
  // opts as run's, and: field (the element), sprites ([<img>] by battler),
  // before (the element the canvas goes under), terrain ([elements] that
  // are the battle background), metrics ([{ top, bottom }] empty rows of
  // each picture, of 96), tint(b) (a CSS filter for a picture).
  let playing = null;
  function play(o) {
    if (playing) playing.cancel();
    const fr = o.field.getBoundingClientRect(), k = W / fr.width;
    o.boxes = o.sprites.map((im, b) => {
      if (!im) return null;
      const r = im.getBoundingClientRect();
      if (!r.width) return null;
      const size = r.width * k, m = (o.metrics && o.metrics[b]) || { top: 0, bottom: 0 };
      return { cx: (r.left + r.width / 2 - fr.left) * k, cy: (r.top + r.width / 2 - fr.top) * k, size, top: m.top * size / 96, bottom: m.bottom * size / 96 };
    });
    o.hidden = o.sprites.map((im, b) => (o.substitute && o.substitute[b] || o.shown && o.shown[b] ? false
      : !im || getComputedStyle(im).opacity === "0" || getComputedStyle(im).visibility === "hidden" || getComputedStyle(im).display === "none"));
    try { setup(o); } catch (e) { console.error(e); return Promise.resolve(false); }
    const vis = o.sprites.map((im) => im && im.style.visibility);
    o.sprites.forEach((im) => { if (im) im.style.visibility = "hidden"; });
    const rd = makeRenderer(o);
    try { frame(); } catch (e) { console.error(e); }
    return new Promise((resolve) => {
      let last = performance.now(), acc = 0, n = 0, stopped = false;
      const FRAME = 1000 / 60, MAX = 60 * 30;
      const finish = (ok) => {
        if (stopped) return;
        stopped = true;
        // (o.hold: the last frame stays up until o.hold.release(), for what's to take its place to be drawn first.)
        if (o.hold && ok) o.hold.release = () => rd.destroy(); else rd.destroy();
        o.sprites.forEach((im, b) => { if (im) im.style.visibility = vis[b] || ""; });
        if (o.hideBoxes) o.hideBoxes(false);
        playing = null;
        resolve(ok);
      };
      playing = { cancel: () => finish(false) };
      const tick = (now) => {
        if (stopped) return;
        acc += Math.min(250, now - last); last = now;
        try {
          while (acc >= FRAME && !done() && n < MAX) { frame(); acc -= FRAME; n++; }
          rd.render();
        } catch (e) { console.error(e); finish(false); return; }
        if (done() || n >= MAX) finish(true); else requestAnimationFrame(tick);
      };
      try { rd.render(); } catch (e) { console.error(e); }
      requestAnimationFrame(tick);
    });
  }

  const api = {
    run, play, has: (move) => !!moveIdOf(move) || false, moveId: moveIdOf, speciesId,
    hasAnim: (kind, id) => animIdOf(kind, id) != null, animId: animIdOf, ballId: ballIdOf, dollPlace,
    // (where a thrown ball comes to rest: 24 under its target's base line, in GBA px)
    ballRest: (b, doubles) => BASE_Y[doubles ? 1 : 0][b] + 24,
    get stats() { return D.stats; },
    get E() { return E; }, get C() { return C; },
    // (for the renderer)
    _: { io, VRAM, PLTT, hdma, bgBattler, get moveBg() { return moveBg; }, get inst() { return inst; },
      setup, frame, done, fitMatrix, isIdentity, readUnit, ptr, bytesAt, view }
  };
  window.BattleAnim = api;
})();
