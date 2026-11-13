// Two-turn moves (Dig, Fly, Solar Beam...): the engine's events for each, which the battle screen's
// animations go by (ui/battle-screen.js: the charging animation on "-prepare", the user out of sight
// between the turns of those it's semi-invulnerable for). In a browser: tests/browser/two-turn-moves.js.
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
global.window = global;
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const root = path.join(__dirname, '..');
for (const [, f] of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"><\/script>/g)) {
  if (!f.startsWith('ui/')) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
}

const TWO_TURN = Object.keys(MOVES).filter((n) => MOVES[n].flags && MOVES[n].flags.charge).sort();
// (Out of reach between their turns.)
const AWAY = ['Bounce', 'Dig', 'Dive', 'Fly', 'Phantom Force', 'Shadow Force', 'Sky Drop'];
assert.deepEqual(TWO_TURN, ['Bounce', 'Dig', 'Dive', 'Electro Shot', 'Fly', 'Freeze Shock', 'Geomancy', 'Ice Burn', 'Meteor Beam', 'Phantom Force',
  'Razor Wind', 'Shadow Force', 'Skull Bash', 'Sky Attack', 'Sky Drop', 'Solar Beam', 'Solar Blade'], 'the two-turn moves');

// Mew (fast) with the move against a Shuckle that only Splashes.
function battle(move, opts) {
  opts = opts || {};
  const b = new Battle({ seed: 7, p1: { name: 'A', team: [{ species: 'Mew', level: 50, moves: [move], item: opts.item || '' }] },
    p2: { name: 'B', team: [{ species: 'Shuckle', level: 100, moves: ['Splash'] }] } });
  b.start();
  if (opts.weather) b.setWeather(opts.weather, null, null, Infinity);
  return b;
}
function turn(b) {
  const at = b.events.length;
  // (Locked into a move's second turn, or carried off by Sky Drop: no choice to make.)
  for (const id of ['p1', 'p2']) if (b.getRequest(id).phase === 'move') assert(b.choose(id, { type: 'move', move: 0 }).ok);
  return b.events.slice(at).filter((e) => /^p1a/.test(e[1]) || /^p1a/.test(e[3] || ''));
}
const has = (events, type, ...rest) => events.some((e) => e[0] === type && rest.every((v, i) => v == null || String(e[i + 2]) === String(v)));

for (const move of TWO_TURN) {
  const b = battle(move), mew = b.sides.p1.active, shuckle = b.sides.p2.active;
  // The first turn: "-prepare" right after the move (what the screen takes for the charging turn), and no blow.
  let ev = turn(b);
  assert.equal(ev[0][0], 'move', move); assert.equal(ev[0][2], move);
  assert.equal(ev[1][0], '-prepare', move + ' charges'); assert.equal(ev[1][2], move);
  assert(!ev.some((e) => e[0] === '-damage'), move + ' does not strike yet');
  assert.equal(shuckle.hp, shuckle.maxhp);
  assert(mew.volatiles.twoturnmove, move + ' is under way');
  assert.equal(!!mew.volatiles.twoturnmove.invuln, AWAY.includes(move), move + (AWAY.includes(move) ? ' is' : ' is not') + ' out of reach');
  assert.equal(b.getRequest('p1').phase, 'wait', move + ': no choosing on the second turn');
  if (move === 'Sky Drop') { assert.equal(ev[1][3], 'p2a: Shuckle', 'Sky Drop names the Pokémon it takes up'); assert(shuckle.volatiles.skydrop); }
  if (move === 'Skull Bash') assert(has(ev, '-boost', 'def', 1), 'Skull Bash raises Defense as it charges');
  if (move === 'Meteor Beam' || move === 'Electro Shot') assert(has(ev, '-boost', 'spa', 1), move + ' raises Sp. Atk as it charges');
  // The second: the move again, with no "-prepare", and its blow (Geomancy's boosts).
  ev = turn(b);
  assert.equal(ev[0][0], 'move', move); assert.equal(ev[0][2], move);
  assert(!has(ev, '-prepare'), move + ' strikes');
  if (move === 'Geomancy') assert(has(ev, '-boost', 'spa', 2) && has(ev, '-boost', 'spd', 2) && has(ev, '-boost', 'spe', 2));
  else assert(shuckle.hp < shuckle.maxhp, move + ' hits');
  assert(!mew.volatiles.twoturnmove && !shuckle.volatiles.skydrop, move + ' is over');
}

// A Power Herb: one turn, no "-prepare" (straight to the strike), the Herb used up; what charging raises, raised.
for (const move of TWO_TURN.filter((m) => m !== 'Sky Drop')) {
  const b = battle(move, { item: 'power-herb' }), ev = turn(b);
  assert(!has(ev, '-prepare') && has(ev, '-enditem', 'Power Herb'), move + ' with a Power Herb');
  assert(!b.sides.p1.active.volatiles.twoturnmove && !b.sides.p1.active.item);
  if (move !== 'Geomancy') assert(b.sides.p2.active.hp < b.sides.p2.active.maxhp, move + ' with a Power Herb hits at once');
  if (move === 'Skull Bash') assert(has(ev, '-boost', 'def', 1));
  if (move === 'Meteor Beam' || move === 'Electro Shot') assert(has(ev, '-boost', 'spa', 1), move + ' with a Power Herb still raises Sp. Atk');
}
// Solar Beam and Solar Blade in the sun, Electro Shot in the rain: the same, and the Power Herb kept.
for (const [move, weather] of [['Solar Beam', 'SunnyDay'], ['Solar Blade', 'SunnyDay'], ['Electro Shot', 'RainDance']]) {
  const b = battle(move, { weather, item: 'power-herb' }), ev = turn(b);
  assert(!has(ev, '-prepare') && !has(ev, '-enditem'), move + ' in ' + weather);
  assert(b.sides.p2.active.hp < b.sides.p2.active.maxhp && b.sides.p1.active.item === 'power-herb');
  if (move === 'Electro Shot') assert(has(ev, '-boost', 'spa', 1));
}
// (Not the other weather.)
assert(has(turn(battle('Solar Beam', { weather: 'RainDance' })), '-prepare'));
assert(has(turn(battle('Electro Shot', { weather: 'SunnyDay' })), '-prepare'));

// Hurting itself in its confusion on the second turn: no "cant", so the screen brings it back on this.
{
  const b = battle('Dig');
  turn(b);
  const mew = b.sides.p1.active;
  b.addVolatile(mew, 'confusion', mew);
  mew.volatiles.confusion.time = 5;
  const random = b.randomChance;
  b.randomChance = function () { b.randomChance = random; return true; };
  const ev = turn(b);
  assert(has(ev, '-damage', null, '[from] confusion') && !has(ev, 'move') && !mew.volatiles.twoturnmove);
}

// The battle screen: out of sight for each of those (Fly has its own scene), brought back by each way a
// two-turn move can end, and a line for each move's charging turn.
{
  const ui = fs.readFileSync(path.join(root, 'ui/battle-screen.js'), 'utf8');
  const away = /const GOES_AWAY = new Set\(\[([^\]]*)\]\)/.exec(ui);
  assert(away, 'GOES_AWAY');
  assert.deepEqual(JSON.parse('[' + away[1] + ']').concat('Fly').sort(), AWAY);
  const back = /if \(\(type === "switch" \|\| type === "drag" \|\| type === "faint" \|\| type === "cant" \|\| \(type === "-damage" && c === "\[from\] confusion"\)\s*\|\| \(type === "-end" && effectId\(b\) === "skydrop"\)\) && el\.sides\[pos\]\) outOfSight\(pos, false\);/;
  assert(back.test(ui), 'back in sight when it faints, leaves, can\'t move, hurts itself or is let go');
  const prepare = /const PREPARE = \{([\s\S]*?)\n  \};/.exec(ui)[1];
  for (const move of TWO_TURN) assert(new RegExp('\\b' + move.toLowerCase().replace(/[^a-z]/g, '') + ': "').test(prepare), move + ': its charging turn\'s line');
  assert(/turn: data\.flags && data\.flags\.charge && !setUp \? 1 : 0/.test(ui), 'the charging animation (turn 0) and the strike (turn 1)');
}

console.log('ok: two-turn moves (' + TWO_TURN.length + '): charge then strike, Power Herb and weather skips, out-of-sight moves');
