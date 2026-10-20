# Translates pokeemerald-expansion's battle animation C (src/battle_anim*.c and
# the data headers they include) to JavaScript, through libclang's typed
# syntax tree. Used by tools/build-battle-anims.py; see there.
#
# The output is one function body: every C function becomes a JS function of
# the same name, every static or global table a JS value. Names the C uses
# but doesn't define (gSprites, CreateSprite, SetGpuReg, ...) are the
# runtime's: E.<name> (ui/battle-anim.js).
#
# C's integers keep their C behaviour: a store to a u8 / s8 / u16 / s16 / u32
# variable or field wraps as the C type does, integer division truncates, an
# unsigned 32-bit result stays unsigned, constants are folded by clang.
# Pointers: a struct pointer is the object itself; a pointer to a scalar is
# E.P(array, offset), read and written through .a[.o + i]; a function
# pointer is the function. A struct value that's copied is copied
# (E.copy); a union initialised through one member is { member: value }.
import ctypes
import clang.cindex as ci

K = ci.CursorKind
T = ci.TypeKind
lib = ci.conf.lib

# ---------- libclang C API bits the Python bindings don't expose ----------
lib.clang_getCursorBinaryOperatorKind.argtypes = [ci.Cursor]
lib.clang_getCursorBinaryOperatorKind.restype = ctypes.c_int
lib.clang_getCursorUnaryOperatorKind.argtypes = [ci.Cursor]
lib.clang_getCursorUnaryOperatorKind.restype = ctypes.c_int
lib.clang_getBinaryOperatorKindSpelling.argtypes = [ctypes.c_int]
lib.clang_getBinaryOperatorKindSpelling.restype = ci._CXString
lib.clang_getUnaryOperatorKindSpelling.argtypes = [ctypes.c_int]
lib.clang_getUnaryOperatorKindSpelling.restype = ci._CXString
lib.clang_Cursor_Evaluate.argtypes = [ci.Cursor]
lib.clang_Cursor_Evaluate.restype = ctypes.c_void_p
lib.clang_EvalResult_getKind.argtypes = [ctypes.c_void_p]
lib.clang_EvalResult_getKind.restype = ctypes.c_int
lib.clang_EvalResult_getAsLongLong.argtypes = [ctypes.c_void_p]
lib.clang_EvalResult_getAsLongLong.restype = ctypes.c_longlong
lib.clang_EvalResult_isUnsignedInt.argtypes = [ctypes.c_void_p]
lib.clang_EvalResult_isUnsignedInt.restype = ctypes.c_uint
lib.clang_EvalResult_getAsUnsigned.argtypes = [ctypes.c_void_p]
lib.clang_EvalResult_getAsUnsigned.restype = ctypes.c_ulonglong
lib.clang_EvalResult_dispose.argtypes = [ctypes.c_void_p]


def _str(cx):
    return ci._CXString.from_result(cx)


def binop(c):
    return _str(lib.clang_getBinaryOperatorKindSpelling(lib.clang_getCursorBinaryOperatorKind(c)))


def unop(c):
    return _str(lib.clang_getUnaryOperatorKindSpelling(lib.clang_getCursorUnaryOperatorKind(c)))


lib.clang_EvalResult_getAsDouble.argtypes = [ctypes.c_void_p]
lib.clang_EvalResult_getAsDouble.restype = ctypes.c_double


def const_float(c):
    r = lib.clang_Cursor_Evaluate(c)
    if not r:
        return None
    try:
        k = lib.clang_EvalResult_getKind(r)
        if k == 2:   # CXEval_Float
            return lib.clang_EvalResult_getAsDouble(r)
        if k == 1:
            return float(lib.clang_EvalResult_getAsLongLong(r))
        return None
    finally:
        lib.clang_EvalResult_dispose(r)


def const_int(c):
    """The integer value of a constant expression, or None."""
    r = lib.clang_Cursor_Evaluate(c)
    if not r:
        return None
    try:
        if lib.clang_EvalResult_getKind(r) != 1:   # CXEval_Int
            return None
        if lib.clang_EvalResult_isUnsignedInt(r):
            return lib.clang_EvalResult_getAsUnsigned(r)
        return lib.clang_EvalResult_getAsLongLong(r)
    finally:
        lib.clang_EvalResult_dispose(r)


# ---------- types ----------
INT_WRAP = {
    T.BOOL: "E.bool", T.CHAR_U: "E.u8", T.UCHAR: "E.u8", T.CHAR_S: "E.s8", T.SCHAR: "E.s8",
    T.USHORT: "E.u16", T.SHORT: "E.s16", T.UINT: "E.u32", T.INT: "E.s32",
    T.ULONG: "E.u32", T.LONG: "E.s32", T.ULONGLONG: "", T.LONGLONG: "",
}
INT_KINDS = set(INT_WRAP) | {T.ENUM}
WIDTH = {T.BOOL: 1, T.CHAR_U: 8, T.UCHAR: 8, T.CHAR_S: 8, T.SCHAR: 8, T.USHORT: 16, T.SHORT: 16,
         T.UINT: 32, T.INT: 32, T.ULONG: 32, T.LONG: 32, T.ULONGLONG: 64, T.LONGLONG: 64}
UNSIGNED = {T.BOOL, T.CHAR_U, T.UCHAR, T.USHORT, T.UINT, T.ULONG, T.ULONGLONG}


def canon(t):
    return t.get_canonical()


def is_int(t):
    k = canon(t).kind
    return k in INT_KINDS


def int_kind(t):
    t = canon(t)
    if t.kind == T.ENUM:
        return canon(t.get_declaration().enum_type).kind
    return t.kind


def wrap_fn(t):
    if not is_int(t):
        return ""
    return INT_WRAP.get(int_kind(t), "")


def is_float(t):
    return canon(t).kind in (T.FLOAT, T.DOUBLE, T.LONGDOUBLE)


def is_ptr(t):
    return canon(t).kind == T.POINTER


def pointee(t):
    return canon(t).get_pointee()


def is_record(t):
    return canon(t).kind == T.RECORD


def is_array(t):
    return canon(t).kind in (T.CONSTANTARRAY, T.INCOMPLETEARRAY)


def scalar_ptr(t):
    """A pointer to an integer (or a pointer): kept as E.P(array, offset)."""
    if not is_ptr(t):
        return False
    p = canon(pointee(t))
    return p.kind in INT_KINDS


def is_func_ptr(t):
    t = canon(t)
    return t.kind == T.POINTER and canon(t.get_pointee()).kind in (T.FUNCTIONPROTO, T.FUNCTIONNOPROTO)


def kids(c):
    return list(c.get_children())


JS_RESERVED = {"var", "new", "class", "delete", "function", "this", "in", "let", "yield", "arguments", "eval", "static",
               "await", "export", "import", "super", "typeof", "instanceof", "with", "debugger", "finally", "catch",
               "try", "throw", "package", "private", "protected", "public", "interface", "implements", "null", "true",
               "false", "undefined", "NaN", "Infinity", "E"}


def jsid(n):
    return n + "_" if n in JS_RESERVED else n


class Unsupported(Exception):
    pass


class Translator:
    def __init__(self, names, rename=None, override=(), log=None):
        self.layouts = {}
        # names: every name the translation defines (functions and globals);
        # rename: { cursor usr: js name } for clashing statics
        self.names = set(names)
        self.rename = rename or {}
        self.override = set(override)
        self.log = log if log is not None else []
        self.temps = 0
        self.statics = []   # (js name, code) of function-local statics, hoisted

    # ---------- names ----------
    def ref_name(self, decl):
        if decl is None:
            return "undefined"
        usr = decl.get_usr()
        if usr in self.rename:
            return self.rename[usr]
        n = decl.spelling
        if decl.kind in (K.VAR_DECL, K.FUNCTION_DECL) and decl.semantic_parent and decl.semantic_parent.kind == K.TRANSLATION_UNIT:
            if n in self.names and n not in self.override:
                return jsid(n)
            return "E." + n
        return jsid(n)

    # ---------- expressions ----------
    def expr(self, c):
        """The JS for expression `c` (its C value)."""
        k = c.kind
        t = c.type
        if is_int(t) and k not in (K.INTEGER_LITERAL,) and not self._has_side_effects(c):
            v = const_int(c)
            if v is not None and k != K.DECL_REF_EXPR or (v is not None and k == K.DECL_REF_EXPR and c.referenced is not None and c.referenced.kind == K.ENUM_CONSTANT_DECL):
                return str(self._wrap_const(v, t))
        if k == K.INTEGER_LITERAL:
            v = const_int(c)
            if v is None:
                v = int(list(c.get_tokens())[0].spelling.rstrip("uUlL"), 0)
            return str(v)
        if k == K.CHARACTER_LITERAL:
            return str(const_int(c))
        if k == K.FLOATING_LITERAL:
            v = const_float(c)
            if v is None:
                raise Unsupported("float literal")
            return repr(v)
        if k == K.STRING_LITERAL:
            return c.spelling
        if k == K.PAREN_EXPR:
            return "(" + self.expr(kids(c)[0]) + ")"
        if k == K.DECL_REF_EXPR:
            d = c.referenced
            if d is not None and d.kind == K.ENUM_CONSTANT_DECL:
                return str(d.enum_value)
            return self.ref_name(d)
        if k == K.MEMBER_REF_EXPR:
            ch = kids(c)
            base = self.expr(ch[0]) if ch else "this"
            return base + "." + c.spelling
        if k == K.ARRAY_SUBSCRIPT_EXPR:
            a, i = kids(c)
            # (an array decaying to a pointer to be indexed: index the array)
            if a.kind == K.UNEXPOSED_EXPR and kids(a) and is_array(kids(a)[0].type):
                return self.expr(kids(a)[0]) + "[" + self.expr(i) + "]"
            if scalar_ptr(a.type):
                p = self.once(a)
                return "(" + p + ").a[" + self.ptr_o(p) + " + " + self.expr(i) + "]"
            if self.struct_ptr(a.type):
                return "E.sat(" + self.expr(a) + ", " + self.expr(i) + ")"
            return self.expr(a) + "[" + self.expr(i) + "]"
        if k == K.CALL_EXPR:
            return self.call(c)
        if k == K.UNEXPOSED_EXPR or k == K.CSTYLE_CAST_EXPR:
            return self.cast(c)
        if k == K.BINARY_OPERATOR:
            return self.binary(c)
        if k == K.COMPOUND_ASSIGNMENT_OPERATOR:
            return self.compound(c)
        if k == K.UNARY_OPERATOR:
            if unop(c) in ("++", "--"):
                return self.incdec(c, True)
            return self.unary(c)
        if k == K.CONDITIONAL_OPERATOR:
            a, b, d = kids(c)
            return "(" + self.cond(a) + " ? " + self.expr(b) + " : " + self.expr(d) + ")"
        if k == K.CXX_UNARY_EXPR or k.name in ("UNARY_EXPR", "UNEXPOSED_EXPR") and const_int(c) is not None:   # sizeof
            v = const_int(c)
            if v is None:
                raise Unsupported("sizeof")
            return str(v)
        if k == K.INIT_LIST_EXPR:
            return self.init(c, c.type)
        if k == K.COMPOUND_LITERAL_EXPR:
            ch = kids(c)
            return self.init(ch[-1], c.type)
        if k == K.STMTEXPR if hasattr(K, "STMTEXPR") else False:
            raise Unsupported("statement expression")
        raise Unsupported(str(k))

    def _wrap_const(self, v, t):
        k = int_kind(t)
        w = WIDTH.get(k, 32)
        if w == 1:
            return 1 if v else 0
        if w >= 64:
            return v
        v &= (1 << w) - 1
        if k not in UNSIGNED and v >= 1 << (w - 1):
            v -= 1 << w
        return v

    def _has_side_effects(self, c):
        k = c.kind
        if k in (K.CALL_EXPR, K.COMPOUND_ASSIGNMENT_OPERATOR):
            return True
        if k == K.BINARY_OPERATOR and binop(c) == "=":
            return True
        if k == K.UNARY_OPERATOR and unop(c) in ("++", "--"):
            return True
        return any(self._has_side_effects(ch) for ch in c.get_children())

    def _is_ptr_expr(self, a):
        return is_ptr(a.type) and not is_record(pointee(a.type)) and not is_func_ptr(a.type)

    def layout(self, t):
        """A struct's layout for E.overlay: [name, byte offset, size, signed, bit offset, bit width, count, nested]."""
        t = canon(t)
        import re as _re
        name = t.get_declaration().spelling
        if not name or not _re.match(r"^\w+$", name):
            name = "anon_" + str(t.get_declaration().location.line) + "_" + _re.sub(r"\W", "_", str(t.get_declaration().location.file or ""))[-20:]
        if name in self.layouts:
            return name
        self.layouts[name] = None
        out = []
        for f in t.get_fields():
            off = t.get_offset(f.spelling)
            ft = canon(f.type)
            if is_int(ft):
                w = WIDTH.get(int_kind(ft), 32)
                size = max(1, w // 8)
                if f.is_bitfield():
                    out.append([f.spelling, (off // 8) & ~(size - 1), size, int_kind(ft) not in UNSIGNED, off - ((off // 8) & ~(size - 1)) * 8, f.get_bitfield_width(), 0, None])
                else:
                    out.append([f.spelling, off // 8, size, int_kind(ft) not in UNSIGNED, 0, 0, 0, None])
            elif ft.kind == T.CONSTANTARRAY and canon(ft.element_type).kind in INT_KINDS:
                el = canon(ft.element_type)
                size = max(1, WIDTH.get(int_kind(el), 32) // 8)
                out.append([f.spelling, off // 8, size, int_kind(el) not in UNSIGNED, 0, 0, ft.element_count, None])
            elif ft.kind == T.RECORD:
                out.append([f.spelling, off // 8, 0, False, 0, 0, 0, self.layout(ft)])
            else:
                out.append([f.spelling, off // 8, 0, False, 0, 0, -1, None])   # (a pointer: kept beside)
        import json
        self.layouts[name] = json.dumps(out).replace("true", "1").replace("false", "0")
        return name

    def struct_ptr(self, t):
        return is_ptr(t) and is_record(pointee(t))

    def once(self, a):
        """A pointer expression to use twice (.a and .o): through a temporary if it has side effects."""
        if not self._has_side_effects(a):
            return self.expr(a)
        self.temps += 1
        tmp = "_t" + str(self.temps)
        return tmp + " = " + self.expr(a) + ", " + tmp

    def ptr_o(self, p):
        # (for once()'s "_tN = ..., _tN": the temporary's .o)
        if p.startswith("_t") and ", _t" in p:
            return p.rsplit(", ", 1)[1] + ".o"
        return "(" + p + ").o"

    def cond(self, c):
        return self.expr(c)

    def cast(self, c):
        ch = kids(c)
        if not ch:
            # ImplicitValueInitExpr and the like: a zero of its type
            return self.zero(c.type)
        inner = ch[-1]
        to, frm = c.type, inner.type
        s = self.expr(inner)
        if canon(to).kind == T.VOID:
            return s
        # An integer to a pointer: an address (VRAM, palette RAM) or a script's
        # pointer id, looked up by the runtime (E.ptr: null for 0).
        if is_ptr(to) and is_int(frm):
            v = const_int(inner)
            if v == 0:
                return "null"
            return "E.ptr(" + s + ", " + str(self.elem_size(to)) + ")"
        # Array (or a scalar pointer) to a scalar pointer: E.P(array, 0).
        if scalar_ptr(to):
            if is_array(frm):
                s = "E.P(" + s + ", 0)"
                el = canon(canon(frm).element_type)
                if el.kind in INT_KINDS and max(1, WIDTH.get(int_kind(el), 8) // 8) != self.elem_size(to):
                    return "E.pcast(" + s + ", " + str(self.elem_size(to)) + ")"
                return s
            if is_ptr(frm) and (scalar_ptr(frm) or canon(pointee(frm)).kind == T.VOID) and (self.elem_size(frm) or 1) != self.elem_size(to):
                return "E.pcast(" + s + ", " + str(self.elem_size(to)) + ")"
            return s
        if is_ptr(to) and is_record(pointee(to)) and is_ptr(frm) and canon(pointee(frm)).kind == T.VOID:
            # (a struct allocated: Alloc(sizeof(struct X)) -> a zeroed X)
            x = inner
            while x.kind in (K.UNEXPOSED_EXPR, K.PAREN_EXPR, K.CSTYLE_CAST_EXPR) and kids(x):
                x = kids(x)[-1]
            if x.kind == K.CALL_EXPR and x.spelling in ("Alloc_", "AllocZeroed_"):
                return self.zero(pointee(to))
            # (void * to a struct: laid over the bytes, if it points at integers)
            return "E.overlay(" + s + ", __layouts." + self.layout(pointee(to)) + ")"
        if is_ptr(to) and is_record(pointee(to)) and (scalar_ptr(frm) or is_array(frm) and canon(canon(frm).element_type).kind in INT_KINDS):
            # (a struct laid over an array of integers: sprite->data, gBattleAnimArgs)
            if is_array(frm):
                s = "E.P(" + s + ", 0)"
            return "E.overlay(" + s + ", __layouts." + self.layout(pointee(to)) + ")"
        if is_ptr(to) and is_array(frm):
            # (an array of structs decaying: its first element, which knows
            # where it is; an array of pointers: the array, read as [i])
            if is_record(pointee(to)):
                return "E.sat(" + s + ", 0)"
            return s
        if is_int(to):
            if is_float(frm):
                return wrap_fn(to) + "(Math.trunc(" + s + "))" if wrap_fn(to) else "Math.trunc(" + s + ")"
            if is_ptr(frm):
                return "E.addr(" + s + ")"   # (a pointer as a number: its address)
            if is_int(frm):
                kt, kf = int_kind(to), int_kind(frm)
                if kt == T.BOOL:
                    return "E.bool(" + s + ")"
                wt, wf = WIDTH.get(kt, 32), WIDTH.get(kf, 32)
                if wt < wf or (wt == wf and (kt in UNSIGNED) != (kf in UNSIGNED)) or c.kind == K.CSTYLE_CAST_EXPR and wt < 32:
                    return wrap_fn(to) + "(" + s + ")"
                if wt > wf and kf not in UNSIGNED and kt in UNSIGNED and wt == 32:
                    return "E.u32(" + s + ")"
            return s
        return s

    def elem_size(self, t):
        """The size of what a pointer points to (1 for void and unknowns)."""
        p = canon(pointee(t))
        if p.kind in INT_KINDS:
            return max(1, WIDTH.get(int_kind(p), 8) // 8)
        return 0   # (a struct, a function, a pointer: an object)

    def zero(self, t):
        t = canon(t)
        if t.kind in INT_KINDS or t.kind in (T.FLOAT, T.DOUBLE):
            return "0"
        if t.kind == T.POINTER:
            return "null"
        if t.kind == T.CONSTANTARRAY:
            return self.array_zero(t)
        if t.kind == T.RECORD:
            return "E.zero(" + self.struct_shape(t) + ")"
        return "0"

    def array_zero(self, t):
        t = canon(t)
        el = canon(t.element_type)
        n = t.element_count
        if el.kind in INT_KINDS:
            return self.typed_array(el, n)
        return "Array.from({ length: " + str(n) + " }, () => " + self.zero(el) + ")"

    def typed_array(self, el, n):
        k = int_kind(el)
        cls = {8: "Uint8Array" if k in UNSIGNED else "Int8Array", 16: "Uint16Array" if k in UNSIGNED else "Int16Array",
               32: "Uint32Array" if k in UNSIGNED else "Int32Array", 1: "Uint8Array"}.get(WIDTH.get(k, 32), "Int32Array")
        return "new " + cls + "(" + str(n) + ")"

    def struct_shape(self, t):
        """A JS object literal of a struct type's zeroes."""
        t = canon(t)
        parts = []
        for f in t.get_fields():
            parts.append(f.spelling + ": " + self.zero(f.type))
        return "{ " + ", ".join(parts) + " }"

    def call(self, c):
        ch = kids(c)
        callee = ch[0]
        args = ch[1:]
        # (the callee, under its implicit function-to-pointer cast)
        fn = callee
        while fn.kind == K.UNEXPOSED_EXPR and kids(fn):
            fn = kids(fn)[0]
        if fn.kind == K.DECL_REF_EXPR and fn.referenced is not None and fn.referenced.kind == K.FUNCTION_DECL:
            name = self.ref_name(fn.referenced)
            if fn.referenced.spelling in ("memset", "memcpy", "CpuFill16", "CpuFill32", "CpuCopy16", "CpuCopy32"):
                pass
        else:
            name = self.expr(callee)
        return name + "(" + ", ".join(self.expr(a) for a in args) + ")"

    # ---------- operators ----------
    def lvalue_wrap(self, lhs):
        """How a store to `lhs` wraps: the function name, or ""."""
        f = lhs.referenced if lhs.kind == K.MEMBER_REF_EXPR else None
        if f is not None and f.kind == K.FIELD_DECL and f.is_bitfield() and is_int(lhs.type):
            w = f.get_bitfield_width()
            if w < 32:
                return ("E.bfs" if int_kind(lhs.type) not in UNSIGNED else "E.bf") + str(w)
        if is_int(lhs.type):
            return wrap_fn(lhs.type)
        return ""

    def lval(self, c):
        return self.expr(c)

    def store(self, lhs, value_js):
        """`lhs = value` (an expression, its value the stored one)."""
        L = self.lval(lhs)
        if is_record(lhs.type):
            # (a struct stored where it is: pointers to it stay good)
            return "E.assign(" + L + ", " + value_js + ")"
        w = self.lvalue_wrap(lhs)
        if w:
            return L + " = " + w + "(" + value_js + ")"
        return L + " = " + value_js

    def binary(self, c):
        op = binop(c)
        a, b = kids(c)
        if op == "=":
            return "(" + self.store(a, self.expr(b)) + ")"
        if op == ",":
            return "(" + self.expr(a) + ", " + self.expr(b) + ")"
        A, B = self.expr(a), self.expr(b)
        t = c.type
        if op in ("&&", "||"):
            return "((" + A + ") " + op + " (" + B + ") ? 1 : 0)"
        if op in ("==", "!=", "<", ">", "<=", ">="):
            jsop = {"==": "===", "!=": "!=="}.get(op, op)
            if (is_ptr(a.type) or is_ptr(b.type)) and op in ("==", "!="):
                return "(E.peq(" + A + ", " + B + ")" + (" ? 1 : 0)" if op == "==" else " ? 0 : 1)")
            return "(" + A + " " + jsop + " " + B + " ? 1 : 0)"
        if is_ptr(t) and op in ("+", "-"):
            # pointer arithmetic on a scalar pointer (void *: bytes, as GCC does)
            if scalar_ptr(t) or canon(pointee(t)).kind == T.VOID:
                if is_ptr(b.type):
                    A, B = B, A
                return "E.padd(" + A + ", " + ("-" if op == "-" else "") + "(" + B + "), " + str(self.elem_size(t) or 1) + ")"
            if self.struct_ptr(t):
                if is_ptr(b.type):
                    A, B = B, A
                return "E.sadd(" + A + ", " + ("-" if op == "-" else "") + "(" + B + "))"
            raise Unsupported("pointer arithmetic")
        if op == "-" and is_ptr(a.type) and is_ptr(b.type):
            raise Unsupported("pointer difference")
        if is_float(t):
            return "(" + A + " " + op + " " + B + ")"
        u32 = int_kind(t) in UNSIGNED and WIDTH.get(int_kind(t), 32) == 32 if is_int(t) else False
        if op == "/":
            return "E.div(" + A + ", " + B + ")" + (" >>> 0" if u32 else "")
        if op == "%":
            return "(" + A + " % " + B + ")"
        if op == ">>":
            return "(" + A + (" >>> " if u32 else " >> ") + B + ")"
        if op in ("<<", "&", "|", "^"):
            return "((" + A + " " + op + " " + B + ")" + (" >>> 0" if u32 else "") + ")"
        if op == "*":
            if u32:
                return "(Math.imul(" + A + ", " + B + ") >>> 0)"
            return "(" + A + " * " + B + ")"
        if op in ("+", "-"):
            if u32:
                return "((" + A + " " + op + " " + B + ") >>> 0)"
            return "(" + A + " " + op + " " + B + ")"
        raise Unsupported("binary " + op)

    def compound(self, c):
        a, b = kids(c)
        op = list(c.get_tokens())  # (fallback)
        sop = binop(c)  # e.g. "+="
        base = sop[:-1]
        L = self.lval(a)
        B = self.expr(b)
        if is_ptr(a.type) and scalar_ptr(a.type):
            return "(" + L + " = E.P(" + L + ".a, " + L + ".o " + base + " " + B + "))"
        if self.struct_ptr(a.type):
            return "(" + L + " = E.sadd(" + L + ", " + base + "(" + B + ")))"
        val = self._arith(base, L, B, a.type)
        w = self.lvalue_wrap(a)
        return "(" + L + " = " + (w + "(" + val + ")" if w else val) + ")"

    def _arith(self, op, A, B, t):
        if is_float(t):
            return "(" + A + " " + op + " " + B + ")"
        if op == "/":
            return "E.div(" + A + ", " + B + ")"
        if op == ">>":
            return "(" + A + (" >>> " if int_kind(t) in UNSIGNED and WIDTH.get(int_kind(t), 32) == 32 else " >> ") + B + ")"
        if op == "*":
            return "(" + A + " * " + B + ")"
        return "(" + A + " " + op + " " + B + ")"

    def unary(self, c):
        op = unop(c)
        ch = kids(c)
        a = ch[0] if ch else None
        if op in ("++", "--") or op in ("++ (pre)", "-- (pre)"):
            pass
        if op.startswith("++") or op.startswith("--"):
            raise Unsupported("unary " + op)
        if op == "&":
            # address-of: of a struct (itself), an array element (E.P), a function (itself)
            x = a
            while x.kind == K.PAREN_EXPR:
                x = kids(x)[0]
            if x.kind == K.UNARY_OPERATOR and unop(x) == "*":
                # (&*p, &REG_BG1HOFS: the pointer)
                return self.expr(kids(x)[0])
            if is_array(a.type) and canon(canon(a.type).element_type).kind in INT_KINDS:
                # (&array2d[i]: a pointer to that row)
                return "E.P(" + self.expr(a) + ", 0)"
            if a.kind == K.ARRAY_SUBSCRIPT_EXPR and is_record(a.type):
                arr, idx = kids(a)
                inner = arr
                if inner.kind == K.UNEXPOSED_EXPR and kids(inner) and is_array(kids(inner)[0].type):
                    inner = kids(inner)[0]
                return "E.sat(" + self.expr(inner) + ", " + self.expr(idx) + ")"
            if a.kind == K.ARRAY_SUBSCRIPT_EXPR and not is_record(a.type) and not is_func_ptr(c.type) and canon(a.type).kind != T.FUNCTIONPROTO:
                arr, idx = kids(a)
                if is_ptr(canon(a.type)):
                    # (&pointers[i]: the array of pointers from i on)
                    inner = arr
                    if inner.kind == K.UNEXPOSED_EXPR and kids(inner) and is_array(kids(inner)[0].type):
                        inner = kids(inner)[0]
                    return "E.aview(" + self.expr(inner) + ", " + self.expr(idx) + ")"
                if self._is_ptr_expr(arr):
                    p = self.expr(arr)
                    return "E.P((" + p + ").a, (" + p + ").o + " + self.expr(idx) + ")"
                if is_int(a.type):
                    return "E.P(" + self.expr(arr) + ", " + self.expr(idx) + ")"
            if a.kind == K.DECL_REF_EXPR and is_record(a.type) and canon(a.type).get_declaration().kind == K.UNION_DECL:
                # (&oneAnimCmd: a one-command animation, read as cmds[i])
                return "[" + self.expr(a) + "]"
            if is_int(a.type) or is_ptr(a.type) and not is_record(pointee(a.type)):
                # &scalarVar / &obj.field: a one-cell box only when it's an array element; else a reference cell
                if a.kind == K.MEMBER_REF_EXPR:
                    base = self.expr(kids(a)[0])
                    return "E.F(" + base + ", " + repr(a.spelling) + ")"
                if a.kind == K.DECL_REF_EXPR:
                    return "E.V(() => " + self.expr(a) + ", (v) => { " + self.expr(a) + " = v; })"
            return self.expr(a)
        if op == "*":
            if is_record(c.type) or canon(c.type).kind in (T.FUNCTIONPROTO,):
                return self.expr(a)
            if is_ptr(canon(c.type)):
                # (*pointers: an array of pointers' first)
                return self.expr(a) + "[0]"
            p = self.once(a)
            return "(" + p + ").a[" + self.ptr_o(p) + "]"
        A = self.expr(a)
        if op == "-":
            return "(-" + A + ")"
        if op == "+":
            return "(+" + A + ")"
        if op == "!":
            return "(" + A + " ? 0 : 1)"
        if op == "~":
            if int_kind(c.type) in UNSIGNED and WIDTH.get(int_kind(c.type), 32) == 32:
                return "(~" + A + " >>> 0)"
            return "(~" + A + ")"
        if op == "__extension__":
            return A
        raise Unsupported("unary " + op)

    # ---------- increments (as statements, or with their value) ----------
    def incdec(self, c, want_value):
        op = unop(c)
        a = kids(c)[0]
        L = self.lval(a)
        d = "+" if "++" in op else "-"
        pre = "pre" in op or op in ("++", "--") and False
        # libclang spells post/pre the same; tell them apart by the token order
        toks = [t.spelling for t in c.get_tokens()]
        pre = bool(toks) and toks[0] in ("++", "--")
        if is_ptr(a.type) and scalar_ptr(a.type):
            upd = L + " = E.P(" + L + ".a, " + L + ".o " + d + " 1)"
        elif self.struct_ptr(a.type):
            upd = L + " = E.sadd(" + L + ", " + d + "1)"
        else:
            w = self.lvalue_wrap(a)
            upd = L + " = " + (w + "(" + L + " " + d + " 1)" if w else L + " " + d + " 1")
        if not want_value:
            return upd
        if pre:
            return "(" + upd + ")"
        self.temps += 1
        tmp = "_t" + str(self.temps)
        return "(" + tmp + " = " + L + ", " + upd + ", " + tmp + ")"

    # ---------- initializers ----------
    def init(self, c, t):
        """An initializer list for type `t` as a JS value."""
        t = canon(t)
        ch = kids(c)
        if t.kind in (T.CONSTANTARRAY, T.INCOMPLETEARRAY):
            el = canon(t.element_type)
            n = t.element_count if t.kind == T.CONSTANTARRAY else -1
            items = {}
            i = 0
            for x in ch:
                idx, val = self.designator(x)
                if idx is not None and not isinstance(idx, str):
                    i = idx
                items[i] = self.init_value(val, el)
                i += 1
            size = max(n, (max(items) + 1) if items else 0)
            if el.kind in INT_KINDS and all(v == "0" for v in items.values()):
                return self.typed_array(el, size)
            if el.kind in INT_KINDS and all(isinstance(v, str) for v in items.values()):
                vals = [items.get(j, "0") for j in range(size)]
                return "E.ints(" + self.typed_array(el, size).replace("new ", "").split("(")[0] + ", [" + ", ".join(vals) + "])"
            return "[" + ", ".join(items.get(j, self.zero(el)) for j in range(size)) + "]"
        if t.kind == T.RECORD:
            decl = t.get_declaration()
            fields = list(t.get_fields())
            union = decl.kind == K.UNION_DECL
            parts = []
            fi = 0
            for x in ch:
                idx, val = self.designator(x)
                if isinstance(idx, str):
                    f = next((f for f in fields if f.spelling == idx), None)
                    if f is None:
                        raise Unsupported("designator ." + idx)
                    fi = fields.index(f)
                elif fi >= len(fields):
                    break
                f = fields[fi]
                parts.append(f.spelling + ": " + self.init_value(val, f.type))
                fi += 1
            if union:
                # (a union's members share their bits: E.U packs them)
                return "E.U(" + repr(decl.spelling) + ", { " + ", ".join(parts) + " })"
            # (the fields not named are zero)
            given = set(pp.split(":")[0] for pp in parts)
            parts += [f.spelling + ": " + self.zero(f.type) for f in fields if f.spelling not in given]
            return "{ " + ", ".join(parts) + " }"
        if len(ch) == 1:
            return self.init_value(ch[0], t)
        if not ch:
            return self.zero(t)
        raise Unsupported("init of " + t.spelling)

    def designator(self, x):
        """(field name or index or None, value cursor) of an init list item."""
        if x.kind == K.UNEXPOSED_EXPR and canon(x.type).kind == T.VOID:
            ch = kids(x)
            if len(ch) >= 2:
                d, v = ch[0], ch[-1]
                if d.kind == K.MEMBER_REF:
                    return d.spelling, v
                iv = const_int(d)
                if iv is not None:
                    return iv, v
            if len(ch) == 1:
                return None, ch[0]
        return None, x

    def init_value(self, v, t):
        if v.kind == K.INIT_LIST_EXPR:
            return self.init(v, t)
        if (is_record(t) or is_array(t)) and not (is_record(v.type) or is_array(v.type)):
            return self.zero(t)   # ({0})
        if v.kind == K.UNEXPOSED_EXPR and not kids(v):
            return self.zero(t)
        if v.kind == K.STRING_LITERAL and is_array(t):
            return "E.str(" + v.spelling + ")"
        js = self.expr(v)
        if is_int(t):
            if js.lstrip("-").isdigit():
                return str(self._wrap_const(int(js), t))
            w = wrap_fn(t)
            return w + "(" + js + ")" if w else js
        return js

    # ---------- statements ----------
    def stmt(self, c, ind):
        k = c.kind
        p = "  " * ind
        if k == K.COMPOUND_STMT:
            out = [p + "{"]
            for s in c.get_children():
                out.append(self.stmt(s, ind + 1))
            out.append(p + "}")
            return "\n".join(out)
        if k == K.DECL_STMT:
            return "\n".join(self.local(d, ind) for d in c.get_children())
        if k == K.RETURN_STMT:
            ch = kids(c)
            if not ch:
                return p + "return;"
            return p + "return " + self.expr_stmt_value(ch[0]) + ";"
        if k == K.IF_STMT:
            ch = kids(c)
            s = p + "if (" + self.cond(ch[0]) + ")\n" + self.block(ch[1], ind)
            if len(ch) > 2:
                s += "\n" + p + "else\n" + self.block(ch[2], ind)
            return s
        if k == K.WHILE_STMT:
            a, b = kids(c)
            return p + "while (" + self.cond(a) + ")\n" + self.block(b, ind)
        if k == K.DO_STMT:
            a, b = kids(c)
            return p + "do\n" + self.block(a, ind) + "\n" + p + "while (" + self.cond(b) + ");"
        if k == K.FOR_STMT:
            # libclang lists only the parts that are there; tell them apart by the tokens
            init, cond, inc, body = self.for_parts(c)
            s_init = self.for_init(init) if init is not None else ""
            s_cond = self.cond(cond) if cond is not None else ""
            s_inc = self.expr_stmt(inc) if inc is not None else ""
            return p + "for (" + s_init + "; " + s_cond + "; " + s_inc + ")\n" + self.block(body, ind)
        if k == K.SWITCH_STMT:
            a, b = kids(c)
            return p + "switch (" + self.expr(a) + ")\n" + self.block(b, ind)
        if k == K.CASE_STMT:
            ch = kids(c)
            v = const_int(ch[0])
            if v is None:
                v = self.expr(ch[0])
            s = p + "case " + str(v) + ":"
            if len(ch) > 1:
                s += "\n" + self.stmt(ch[-1], ind + 1)
            return s
        if k == K.DEFAULT_STMT:
            ch = kids(c)
            return p + "default:" + ("\n" + self.stmt(ch[0], ind + 1) if ch else "")
        if k == K.BREAK_STMT:
            return p + "break;"
        if k == K.CONTINUE_STMT:
            return p + "continue;"
        if k == K.NULL_STMT:
            return p + ";"
        if k == K.LABEL_STMT or k == K.GOTO_STMT:
            raise Unsupported("goto")
        if k == K.ASM_STMT:
            raise Unsupported("asm")
        # an expression statement
        return p + self.expr_stmt(c) + ";"

    def block(self, c, ind):
        if c.kind == K.COMPOUND_STMT:
            return self.stmt(c, ind)
        return "  " * ind + "{\n" + self.stmt(c, ind + 1) + "\n" + "  " * ind + "}"

    def expr_stmt(self, c):
        """An expression whose value isn't used."""
        k = c.kind
        if k == K.UNARY_OPERATOR and unop(c) in ("++", "--"):
            return self.incdec(c, False)
        if k == K.BINARY_OPERATOR and binop(c) == "=":
            a, b = kids(c)
            return self.store(a, self.expr(b))
        if k == K.BINARY_OPERATOR and binop(c) == ",":
            a, b = kids(c)
            return self.expr_stmt(a) + ", " + self.expr_stmt(b)
        if k == K.COMPOUND_ASSIGNMENT_OPERATOR:
            s = self.compound(c)
            return s[1:-1]
        if k == K.UNEXPOSED_EXPR and kids(c) and canon(c.type).kind == T.VOID:
            return self.expr_stmt(kids(c)[0])
        if k == K.CSTYLE_CAST_EXPR and canon(c.type).kind == T.VOID:
            return self.expr_stmt(kids(c)[-1])
        if k == K.PAREN_EXPR:
            return self.expr_stmt(kids(c)[0])
        return self.expr(c)

    def expr_stmt_value(self, c):
        return self.expr(c)

    def for_parts(self, c):
        ch = kids(c)
        toks = [t.spelling for t in c.get_tokens()]
        if "(" not in toks or toks[0] != "for":
            # (written in a macro: no tokens of its own; tell the parts apart by what they are)
            body = ch[-1]
            parts = ch[:-1]
            if len(parts) == 3:
                return parts[0], parts[1], parts[2], body
            def role(x, first):
                if x.kind == K.DECL_STMT:
                    return "init"
                if x.kind == K.COMPOUND_ASSIGNMENT_OPERATOR or x.kind == K.UNARY_OPERATOR and unop(x) in ("++", "--"):
                    return "inc"
                if x.kind == K.BINARY_OPERATOR and binop(x) in ("=", ","):
                    return "init" if first else "inc"
                return "cond"
            got = {"init": None, "cond": None, "inc": None}
            for i, x in enumerate(parts):
                got[role(x, i == 0)] = x
            return got["init"], got["cond"], got["inc"], body
        # (for (A; B; C) body): which of A, B, C are present, from the tokens between the parentheses
        depth = 0
        semis = []
        i0 = toks.index("(")
        for i in range(i0, len(toks)):
            tk = toks[i]
            if tk == "(":
                depth += 1
            elif tk == ")":
                depth -= 1
                if depth == 0:
                    close = i
                    break
            elif tk == ";" and depth == 1:
                semis.append(i)
        has = [semis[0] > i0 + 1, semis[1] > semis[0] + 1, close > semis[1] + 1]
        it = iter(ch)
        parts = [next(it) if h else None for h in has]
        body = next(it)
        return parts[0], parts[1], parts[2], body

    def for_init(self, c):
        if c.kind == K.DECL_STMT:
            return "let " + ", ".join(self.local(d, 0, bare=True) for d in c.get_children())
        return self.expr_stmt(c)

    def local(self, d, ind, bare=False):
        p = "" if bare else "  " * ind
        if d.kind != K.VAR_DECL:
            if d.kind in (K.STRUCT_DECL, K.ENUM_DECL, K.TYPEDEF_DECL, K.UNION_DECL, K.STATIC_ASSERT):
                return p + "// (type)"
            raise Unsupported("local " + str(d.kind))
        name = jsid(d.spelling)
        t = d.type
        init = [x for x in d.get_children() if x.kind not in (K.TYPE_REF, K.INTEGER_LITERAL) or x.kind == K.INTEGER_LITERAL and False]
        # (the initializer is the last child that's an expression)
        ch = [x for x in d.get_children() if x.kind not in (K.TYPE_REF,)]
        initc = None
        for x in ch:
            if x.kind.is_expression() or x.kind == K.INIT_LIST_EXPR:
                initc = x
        if is_array(t) and initc is not None and initc.kind not in (K.INIT_LIST_EXPR, K.STRING_LITERAL):
            initc = None   # (that was the array's size)
        static = d.storage_class == ci.StorageClass.STATIC
        if initc is None:
            val = self.zero(t)
        elif initc.kind == K.INIT_LIST_EXPR:
            val = self.init(initc, t)
        elif is_record(t):
            val = "E.copy(" + self.expr(initc) + ")"
        else:
            val = self.init_value(initc, t)
        if static:
            hoisted = "_static_" + name + "_" + str(len(self.statics))
            self.statics.append((hoisted, val))
            self.local_alias[name] = hoisted
            return p + "// (static " + name + ")"
        if bare:
            return name + " = " + val
        return p + "let " + name + " = " + val + ";"

    def function(self, f, jsname):
        self.temps = 0
        self.local_alias = {}
        params = [jsid(a.spelling) if a.spelling else "_a" + str(i) for i, a in enumerate(f.get_arguments())]
        body = [x for x in f.get_children() if x.kind == K.COMPOUND_STMT][0]
        code = "{\n" + "\n".join(self.stmt(s, 1) for s in body.get_children()) + "\n}"
        if self.local_alias:
            import re
            for n, h in self.local_alias.items():
                code = re.sub(r"(?<![\w.])" + n + r"(?!\w)", h, code)
        temps = "".join("  let _t" + str(i) + ";\n" for i in range(1, self.temps + 1))
        # (a body's braces are the function's)
        inner = code.split("\n", 1)[1].rsplit("\n", 1)[0]
        return "function " + jsname + "(" + ", ".join(params) + ") {\n" + temps + inner + "\n}"
