// HeartGold and SoulSilver's walking Pokémon: your party's first Pokémon
// (the first that can still fight, as FollowMon_InitMapObject picks it)
// walks behind you. ui/overworld.js moves and draws it (its follower section);
// this says which Pokémon, how it looks, where it may come along, and what
// it does when you talk to it. Its sheets and lines are HGSS's
// (tools/build-hgss-followers.js: window.JOHTO_FOLLOWERS).
//
//   const F = Follower.create(env);
//   F.look(map)    // { sprite, width, height, frames, offsetX } for Overworld's ctx.follower, or null
//   await F.talk() // A facing it: its cry and a line for its mood (and sometimes an item it found)
//
// Where: everywhere, Kanto too (this game's), unless the Option screen's
// FOLLOWER is OFF (GameOptions' follower: 0 ON, 1 OFF). Johto's maps have
// HGSS's follow modes (src/data/map_headers.h: none, not the tall ones, or
// all; the tall ones, Lugia, Steelix and the like, don't follow you indoors);
// Kanto's, the tall ones stay out of rooms. (Diglett and Dugtrio never go
// up the Bell Tower: FollowMon_DiglettPermissionCheck.)
//
// env: player(), say(pages), confirm(page), cry(species), giveItem(id) (adds
//   it and says so), hop() (it jumps where it stands), here() ({ map, grass,
//   water }: the map, standing in tall grass, facing water).
(function () {
  "use strict";

  const DATA = () => window.JOHTO_FOLLOWERS || { hgss: [], big: [], tall: [], forms: {}, modes: {}, lines: {} };
  const sets = {};
  const has = (list, name) => (sets[list] || (sets[list] = new Set(DATA()[list] || []))).has(name);
  const BELL_TOWER = /^BellTower_/;
  // (What it may find and hold out to you, more as you've more of Johto's Badges.)
  const FINDS = [["potion", "antidote", "paralyze-heal", "awakening", "poke-ball", "oran-berry", "pecha-berry", "cheri-berry"],
    ["super-potion", "great-ball", "repel", "escape-rope", "ether", "sitrus-berry", "burn-heal", "ice-heal"],
    ["hyper-potion", "ultra-ball", "super-repel", "revive", "full-heal", "elixir", "max-ether", "rare-candy"]];
  const FIND_CHANCE = 1 / 8;

  function create(env) {
    // The Pokémon walking with you: the first that can still fight.
    const lead = () => env.player().party.find((r) => !r.egg && r.hp > 0) || null;

    // Its sheet: its form's (Rotom-Heat's, an Unown's letter), a female's own, or its species'.
    function sheet(r) {
      const dex = window.DEX[r.species];
      if (!dex) return null;
      const F = DATA(), form = window.Party && window.Party.form ? window.Party.form(r) : "";
      if (F.forms[r.species]) return F.forms[r.species];
      if (form && has("hgss", dex.id + "-" + form)) return dex.id + "-" + form;
      if (r.gender === "F" && has("hgss", dex.id + "-f")) return dex.id + "-f";
      return String(dex.id);
    }

    // May it come along on `map`?
    function allowed(map, name, r) {
      const m = window.WORLD_MAPS[map];
      if (!m) return false;
      const opt = window.GameOptions ? window.GameOptions.get().follower | 0 : 0;
      if (opt === 1) return false;
      if (m.realm === "yugioh") return false;   // (in the Yu-Gi-Oh! realm your Pokémon stay in their balls)
      if ((r.species === "Diglett" || r.species === "Dugtrio") && BELL_TOWER.test(map)) return false;
      const mode = map in DATA().modes ? DATA().modes[map] : m.type === "indoor" ? 1 : 2;
      return mode === 2 || (mode === 1 && !has("tall", name));
    }

    function look(map) {
      const r = lead();
      const name = r && sheet(r);
      if (!name || !allowed(map, name, r)) return null;
      const size = has("big", name) ? 64 : 32;
      return { sprite: "follow/" + name, width: size, height: size, frames: 9, offsetX: (16 - size) / 2, species: r.species };
    }

    // ---------- Talking to it ----------
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    async function talk() {
      const r = lead();
      if (!r) return;
      const L = DATA().lines, p = env.player(), here = env.here();
      const name = window.Party ? window.Party.displayName(r) : r.species;
      const fill = (pages) => pages.map((s) => s.replace(/\{MON\}/g, name).replace(/\{PLAYER\}/g, p.name));
      env.cry(r.species);
      // Sometimes it's found something (once a day): take it?
      const today = window.Player.gameTime(p).today, f = p.flags;   // (the game's clock's day)
      if (f.followerFind !== today && (r.happiness | 0) >= 70 && Math.random() < FIND_CHANCE && L.item) {
        f.followerFind = today;
        const badges = (window.Player && window.Player.REGION_BADGES ? window.Player.REGION_BADGES.johto : []).filter((b) => p.badges.includes(b)).length;
        const item = pick(FINDS[badges >= 6 ? 2 : badges >= 3 ? 1 : 0].filter((id) => window.ITEMS[id]));
        const q = fill(pick(L.item));
        if (q.length > 1) await env.say(q.slice(0, -1));
        if (item && (await env.confirm(q[q.length - 1]))) { await env.giveItem(item); return; }
        return;
      }
      // How it is, where you are, or how it feels about you (its friendship).
      const maxhp = window.Party ? window.Party.maxHp(r) : r.hp;
      const kinds = [];
      if (r.status === "psn" || r.status === "tox") kinds.push("poisoned");
      if (r.status === "brn") kinds.push("burned");
      if (r.hp * 4 < maxhp) kinds.push("weak");
      if (!kinds.length && Math.random() < 0.4) {
        const m = window.WORLD_MAPS[here.map] || {}, hour = window.Player.gameTime(p).hour;
        if (here.grass) kinds.push("grass");
        if (here.water) kinds.push("water");
        if (m.type === "underground") kinds.push("cave");
        if (m.type === "indoor") kinds.push("indoor");
        if (m.type !== "indoor" && m.type !== "underground") { if (hour >= 20 || hour < 4) kinds.push("night"); else if (hour >= 4 && hour < 10) kinds.push("morning"); }
      }
      const h = r.happiness | 0;
      const mood = h >= 200 ? "best" : h >= 150 ? "good" : h >= 70 ? "fair" : "low";
      const kind = kinds.length ? pick(kinds) : mood;
      if (mood === "best" || mood === "good") env.hop();
      await env.say(fill(pick(L[kind] || L.fair || [["{MON} is looking at you."]])));
    }

    return { lead, sheet, allowed, look, talk };
  }

  window.Follower = { create };
})();
