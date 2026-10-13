// Stat calculator (Gen 3+ formulas, valid through Gen 6)
// Depends on: window.DEX (dex.js), window.NATURES (natures.js)
// Load this after those two files.

(function () {
  const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"];
  const MAX_IV = 31;
  const MAX_EV_PER_STAT = 252;
  const MAX_EV_TOTAL = 510;

  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  // Returns 1.1, 0.9, or 1 for a given nature and stat key.
  function natureMultiplier(natureName, stat) {
    const nature = window.NATURES[natureName];
    if (!nature || stat === "hp") return 1;
    if (nature.plus === stat) return 1.1;
    if (nature.minus === stat) return 0.9;
    return 1;
  }

  // HP = floor((2*B + IV + floor(EV/4)) * L / 100) + L + 10
  function calcHP(base, iv, ev, level) {
    if (base === 1) return 1; // Shedinja
    return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
  }

  // Other = floor((floor((2*B + IV + floor(EV/4)) * L / 100) + 5) * nature)
  function calcOther(base, iv, ev, level, natureMult) {
    const raw = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
    return Math.floor(raw * natureMult);
  }

  // Calculate one stat.
  // base: base stat number; iv: 0-31; ev: 0-252; level: 1-100
  function calcStat(stat, base, iv, ev, level, natureName) {
    iv = clamp(iv | 0, 0, MAX_IV);
    ev = clamp(ev | 0, 0, MAX_EV_PER_STAT);
    level = clamp(level | 0, 1, 100);
    if (stat === "hp") return calcHP(base, iv, ev, level);
    return calcOther(base, iv, ev, level, natureMultiplier(natureName, stat));
  }

  // Calculate all six stats for a species.
  // speciesName: key in DEX (e.g. "Bulbasaur", "Venusaur-Mega")
  // opts: { level = 50, nature = "Hardy", ivs = {}, evs = {} }
  // Missing ivs default to 31, missing evs default to 0.
  function calcAllStats(speciesName, opts) {
    const species = window.DEX[speciesName];
    if (!species) throw new Error("Unknown species: " + speciesName);

    opts = opts || {};
    const level = opts.level != null ? opts.level : 50;
    const nature = opts.nature || "Hardy";
    const ivs = opts.ivs || {};
    const evs = opts.evs || {};

    const out = {};
    for (const stat of STAT_KEYS) {
      const iv = ivs[stat] != null ? ivs[stat] : MAX_IV;
      const ev = evs[stat] != null ? evs[stat] : 0;
      out[stat] = calcStat(stat, species[stat], iv, ev, level, nature);
    }
    return out;
  }

  // Check an EV spread against the 252 per stat / 510 total caps.
  function validateEVs(evs) {
    let total = 0;
    for (const stat of STAT_KEYS) {
      const v = (evs && evs[stat]) || 0;
      if (v < 0 || v > MAX_EV_PER_STAT) return false;
      total += v;
    }
    return total <= MAX_EV_TOTAL;
  }

  // Stat stage multipliers (-6 to +6) for atk/def/spa/spd/spe.
  function stageMultiplier(stage) {
    stage = clamp(stage | 0, -6, 6);
    return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
  }

  // Accuracy/evasion stage multipliers (-6 to +6).
  function accuracyStageMultiplier(stage) {
    stage = clamp(stage | 0, -6, 6);
    return stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage);
  }

  window.Stats = {
    STAT_KEYS,
    MAX_IV,
    MAX_EV_PER_STAT,
    MAX_EV_TOTAL,
    natureMultiplier,
    calcStat,
    calcAllStats,
    validateEVs,
    stageMultiplier,
    accuracyStageMultiplier
  };
})();
