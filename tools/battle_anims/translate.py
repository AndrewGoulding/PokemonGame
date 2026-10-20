# Runs c2js over pokeemerald-expansion's battle animation C, writing
# ui/battle-anim-code.js. Part of tools/build-battle-anims.py.
import os
import re
import clang.cindex as ci
from c2js import Translator, Unsupported, K, is_array

FILES_GLOB = "src/battle_anim*.c"
# The engine they run on, translated too: sprites (and their animations and
# affine animations), tasks, palettes (and fades), backgrounds, scanline
# effects, the sine table.
ENGINE_FILES = ["src/sprite.c", "src/task.c", "src/palette.c", "src/bg.c", "src/scanline_effect.c", "src/trig.c"]


def parse_all(pex, stubs):
    import glob
    import subprocess
    res = subprocess.run(["clang", "-print-resource-dir"], capture_output=True, text=True).stdout.strip()
    args = ["-isystem", os.path.join(res, "include"), "-iquote", os.path.join(pex, "include"), "-I", stubs, "-DMODERN=1", "-DTESTING=0", "-DEMERALD", "-std=gnu17", "-w"]
    idx = ci.Index.create()
    tus = []
    for f in sorted(glob.glob(os.path.join(pex, FILES_GLOB))) + [os.path.join(pex, e) for e in ENGINE_FILES]:
        tu = idx.parse(f, args=args)
        errs = [d for d in tu.diagnostics if d.severity >= ci.Diagnostic.Error]
        if errs:
            raise SystemExit("clang: " + f + ": " + str(errs[0]))
        tus.append((f, tu))
    return tus


def collect(pex, tus):
    """Every function and global defined in the expansion's src/: (kind, name, cursor, file)."""
    src = os.path.join(pex, "src") + os.sep
    seen = set()
    defs = []
    for f, tu in tus:
        for c in tu.cursor.get_children():
            loc = c.location.file
            if loc is None or not loc.name.startswith(src):
                continue
            if c.kind == K.FUNCTION_DECL and c.is_definition():
                key = (loc.name, c.extent.start.line, c.spelling)
                if key in seen:
                    continue
                seen.add(key)
                defs.append(("func", c.spelling, c, loc.name))
            elif c.kind == K.VAR_DECL and c.is_definition() and c.storage_class != ci.StorageClass.EXTERN:
                key = (loc.name, c.extent.start.line, c.spelling)
                if key in seen:
                    continue
                seen.add(key)
                defs.append(("var", c.spelling, c, loc.name))
    return defs


def is_const(t):
    # (libclang's canonical array types drop their elements' const: read the spelling)
    if t.get_canonical().kind in (ci.TypeKind.CONSTANTARRAY, ci.TypeKind.INCOMPLETEARRAY):
        return bool(re.search(r"^const\b|\bconst\s*\[", t.spelling))
    return t.is_const_qualified()


def refs_in(c, out):
    for x in c.walk_preorder():
        if x.kind == K.DECL_REF_EXPR and x.referenced is not None:
            out.add(x.referenced.get_usr())
    return out


def translate(pex, stubs, override=(), log=print):
    tus = parse_all(pex, stubs)
    defs = collect(pex, tus)
    # Clashing names (statics in two files): name__file.
    count = {}
    for kind, name, c, f in defs:
        count[name] = count.get(name, 0) + 1
    rename = {}
    for kind, name, c, f in defs:
        if count[name] > 1:
            tag = re.sub(r"\W", "_", os.path.splitext(os.path.basename(f))[0])
            rename[c.get_usr()] = name + "__" + tag
    # The engine's own state (battle_anim.c's variables: gBattleAnimArgs,
    # gBattleAnimAttacker, the task counts...) is the runtime's: E.<name>.
    override = set(override)
    for kind, name, c, f in defs:
        if kind == "var" and os.path.basename(f) == "battle_anim.c" and not is_const(c.type):
            override.add(name)
    names = set(n for _, n, _, _ in defs)
    problems = []
    tr = Translator(names, rename, override, problems)
    jsname = lambda c: rename.get(c.get_usr(), c.spelling)
    out_funcs = []
    out_vars = {}
    var_deps = {}
    usr_of = {}
    engine_state = {}
    for kind, name, c, f in defs:
        js = jsname(c)
        if js in override and kind == "var":
            try:
                engine_state[js] = tr.zero(c.type)
            except Exception:
                engine_state[js] = "null"
        if js in override:
            continue
        if kind == "func" and name in override:
            continue
        try:
            if kind == "func":
                tr.statics = []
                code = tr.function(c, js)
                for h, val in tr.statics:
                    out_vars[h] = ("let", val)
                    var_deps[h] = set()
                out_funcs.append(code)
            else:
                usr_of[c.get_usr()] = js
                ch = [x for x in c.get_children() if x.kind != K.TYPE_REF]
                initc = None
                for x in ch:
                    if x.kind.is_expression() or x.kind == K.INIT_LIST_EXPR:
                        initc = x
                if is_array(c.type) and initc is not None and initc.kind not in (K.INIT_LIST_EXPR, K.STRING_LITERAL):
                    initc = None   # (that was the array's size)
                if initc is None:
                    val = tr.zero(c.type)
                elif initc.kind == K.INIT_LIST_EXPR:
                    val = tr.init(initc, c.type)
                else:
                    val = tr.init_value(initc, c.type)
                const = c.type.is_const_qualified() or "const" in [t.spelling for t in list(c.get_tokens())[:4]]
                out_vars[js] = ("const" if const else "let", val)
                var_deps[js] = refs_in(c, set())
        except (Unsupported, Exception) as e:
            problems.append((js, str(e)))
            if kind == "func":
                out_funcs.append("function " + js + "() { E.unsupported(" + repr(js) + ", " + repr(str(e)) + "); }")
            else:
                out_vars[js] = ("let", "undefined")
                var_deps[js] = set()
    # Globals in dependency order (a table after the tables it names).
    deps = {js: set(usr_of[u] for u in var_deps[js] if u in usr_of and usr_of[u] != js) for js in out_vars}
    order, state = [], {}

    def visit(n):
        if state.get(n) == 2:
            return
        if state.get(n) == 1:
            return   # (a cycle: leave it where it falls)
        state[n] = 1
        for d in sorted(deps.get(n, ())):
            if d in out_vars:
                visit(d)
        state[n] = 2
        order.append(n)
    for n in out_vars:
        visit(n)
    lines = []
    for n in order:
        kw, val = out_vars[n]
        lines.append(kw + " " + n + " = " + val + ";")
    # The globals the C names but doesn't define (the battle's state:
    # gBattleMons, gBattleSpritesDataPtr...), as zeroes the runtime fills in.
    ext = {}
    for kind, name, c, f in defs:
        for x in c.walk_preorder():
            r = x.referenced if x.kind == K.DECL_REF_EXPR else None
            if r is None or r.kind != K.VAR_DECL or r.spelling in names or r.spelling in ext:
                continue
            if r.semantic_parent is not None and r.semantic_parent.kind != K.TRANSLATION_UNIT:
                continue
            t = r.type.get_canonical()
            try:
                if t.kind == ci.TypeKind.POINTER and t.get_pointee().get_canonical().kind == ci.TypeKind.RECORD:
                    ext[r.spelling] = tr.zero(t.get_pointee())
                elif t.kind == ci.TypeKind.CONSTANTARRAY and t.element_count > 512:
                    ext[r.spelling] = "null"
                else:
                    ext[r.spelling] = tr.zero(t)
            except Exception as e:
                ext[r.spelling] = "null"
    # The structs those point to (gBattleSpritesDataPtr->battlerData[]...): __shapes.<struct>()
    shapes = {}
    for kind, name, c, f in defs:
        for x in c.walk_preorder():
            if x.kind != K.MEMBER_REF_EXPR or x.referenced is None or x.referenced.kind != K.FIELD_DECL:
                continue
            t = x.referenced.type.get_canonical()
            if t.kind == ci.TypeKind.POINTER and t.get_pointee().get_canonical().kind == ci.TypeKind.RECORD:
                rt = t.get_pointee().get_canonical()
                n = rt.get_declaration().spelling
                if n and n not in shapes:
                    try:
                        shapes[n] = tr.zero(rt)
                    except Exception:
                        pass
    lines.insert(0, "const __layouts = { " + ", ".join(k + ": " + v for k, v in sorted(tr.layouts.items()) if v) + " };")
    out_vars["__layouts"] = ("const", "")
    lines.append("const __state = () => ({ " + ", ".join(k + ": " + v for k, v in sorted(engine_state.items())) + " });")
    out_vars["__state"] = ("const", "")
    lines.append("const __shapes = { " + ", ".join(k + ": () => " + v for k, v in sorted(shapes.items())) + " };")
    out_vars["__shapes"] = ("const", "")
    lines.append("const __externs = () => ({ " + ", ".join(k + ": " + v for k, v in sorted(ext.items())) + " });")
    out_vars["__externs"] = ("const", "")
    exports = sorted(set([n for n in out_vars] + [re.match(r"function (\w+)", f).group(1) for f in out_funcs]))
    return lines, out_funcs, exports, problems
