// MIDNIGHT VAULT — world simulation: guards, cameras, lasers, alarm.
// No rendering and no audio live here; this module owns the rules of the
// night: who sees the thief, how fast the alarm climbs, and what a noise
// does to a patrol route.

import { TILE, LOOT_VALUES } from './levels.js';

export const GUARD_VIEW = 185;
export const GUARD_FOV = 1.15; // radians, half-angle is half of this
export const CAM_FOV = 0.85;

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || ty >= level.grid.length || tx >= level.grid[0].length) return '#';
  return level.grid[ty][tx];
}

export function isSolid(level, tx, ty, vaultOpen) {
  const t = tileAt(level, tx, ty);
  if (t === '#') return true;
  if (t === 'V' && !vaultOpen) return true;
  return false;
}

export function pointSolid(level, x, y, vaultOpen) {
  return isSolid(level, Math.floor(x / TILE), Math.floor(y / TILE), vaultOpen);
}

// Step along the sight line; a wall or a shut vault door blocks the view.
export function lineOfSight(level, x1, y1, x2, y2, vaultOpen) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 7));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (pointSolid(level, x1 + dx * t, y1 + dy * t, vaultOpen)) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function buildWorld(level, levelIndex) {
  const world = {
    level, levelIndex,
    time: 0,
    alarm: 0,          // 0 calm … 1 full lockdown
    alarmPeak: 0,
    lockdown: 0,       // seconds of lockdown left once the alarm maxes
    seenEver: false,
    loot: 0,
    lootTaken: 0,
    lootTotal: 0,
    hasKey: false,
    vaultOpen: false,
    camerasOff: false,
    lasersOff: false,
    decoys: 3,
    noise: null,       // {x, y, ttl} — a thrown noisemaker
    hackTarget: null,  // terminal being hacked
    hackProgress: 0,
    message: '',
    messageTtl: 0,
    busted: false,
    escaped: false,
    player: { x: 0, y: 0, dir: 0, moving: false, sneak: false, speedNow: 0 },
    guards: [],
    cameras: [],
    lasers: [],
    terminals: [],
    pickups: [],       // loot + keycard still on the floor
    startTile: { x: 1, y: 1 },
    exitTile: { x: 2, y: 2 },
  };

  level.grid.forEach((row, ty) => {
    [...row].forEach((ch, tx) => {
      const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
      if (ch === 'S') { world.startTile = { x: tx, y: ty }; world.player.x = cx; world.player.y = cy; }
      if (ch === 'X') world.exitTile = { x: tx, y: ty };
      if (ch === 'K') world.pickups.push({ kind: 'key', ch, x: cx, y: cy, taken: false });
      if (LOOT_VALUES[ch]) {
        world.pickups.push({ kind: 'loot', ch, x: cx, y: cy, value: LOOT_VALUES[ch], taken: false });
        world.lootTotal += LOOT_VALUES[ch];
      }
      if (ch === 'T') {
        const spec = level.terminals.find(t => t.tx === tx && t.ty === ty);
        world.terminals.push({
          x: cx, y: cy, tx, ty,
          kills: spec ? spec.kills : 'cameras',
          label: spec ? spec.label : 'security grid',
          done: false,
        });
      }
    });
  });

  world.guards = level.guards.map((g, i) => ({
    x: g.path[0][0] * TILE + TILE / 2,
    y: g.path[0][1] * TILE + TILE / 2,
    path: g.path, wp: 1, speed: g.speed,
    dir: 0, state: 'patrol', // patrol | investigate | hunt | return
    alert: 0, targetX: 0, targetY: 0, waitT: 0, id: i,
  }));

  world.cameras = level.cameras.map(c => ({
    x: c.tx * TILE + TILE / 2, y: c.ty * TILE + TILE / 2,
    base: c.base, sweep: c.sweep, range: c.range, dir: c.base, phase: Math.random() * 6,
  }));

  world.lasers = level.lasers.map(l => ({ ...l, tripped: 0 }));
  return world;
}

function moveGuard(world, g, dt, tx, ty, speedMul) {
  const dx = tx - g.x, dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) return true;
  const sp = g.speed * 62 * speedMul * dt;
  const nx = g.x + (dx / dist) * Math.min(sp, dist);
  const ny = g.y + (dy / dist) * Math.min(sp, dist);
  // Guards slide along walls: try each axis separately when blocked.
  if (!pointSolid(world.level, nx, ny, world.vaultOpen)) { g.x = nx; g.y = ny; }
  else if (!pointSolid(world.level, nx, g.y, world.vaultOpen)) g.x = nx;
  else if (!pointSolid(world.level, g.x, ny, world.vaultOpen)) g.y = ny;
  g.dir = Math.atan2(dy, dx);
  return dist < 8;
}

export function guardSees(world, g, px, py, sneakFactor) {
  const dx = px - g.x, dy = py - g.y;
  const dist = Math.hypot(dx, dy);
  const range = GUARD_VIEW * sneakFactor;
  if (dist > range) return 0;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, g.dir)) > GUARD_FOV / 2 && dist > 34) return 0;
  if (!lineOfSight(world.level, g.x, g.y, px, py, world.vaultOpen)) return 0;
  return 1 - dist / (range + 40);
}

export function cameraSees(world, c, px, py, sneakFactor) {
  if (world.camerasOff) return 0;
  const dx = px - c.x, dy = py - c.y;
  const dist = Math.hypot(dx, dy);
  if (dist > c.range * sneakFactor + 30) return 0;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, c.dir)) > CAM_FOV / 2) return 0;
  if (!lineOfSight(world.level, c.x, c.y, px, py, world.vaultOpen)) return 0;
  return 1 - dist / (c.range + 60);
}

export function stepWorld(world, dt, events) {
  world.time += dt;
  const p = world.player;
  if (world.messageTtl > 0) world.messageTtl -= dt;

  // Cameras sweep on a smooth pendulum.
  for (const c of world.cameras) {
    c.dir = c.base + Math.sin(world.time * 0.55 + c.phase) * c.sweep;
  }

  // How exposed is the thief right now?
  const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
  const onShadow = tileAt(world.level, ptx, pty) === ',';
  const sneakFactor = (p.sneak ? 0.55 : 1) * (onShadow ? 0.7 : 1);
  let exposure = 0;
  for (const g of world.guards) exposure = Math.max(exposure, guardSees(world, g, p.x, p.y, sneakFactor));
  for (const c of world.cameras) exposure = Math.max(exposure, cameraSees(world, c, p.x, p.y, sneakFactor));
  world.exposure = exposure;

  // Alarm: climbs under eyes, cools in the dark. A tripped laser spikes it.
  if (exposure > 0.12) {
    world.alarm += exposure * dt * 0.55;
    world.seenEver = true;
    for (const g of world.guards) {
      if (guardSees(world, g, p.x, p.y, sneakFactor) > 0.1) {
        g.state = 'hunt'; g.alert = 1; g.targetX = p.x; g.targetY = p.y;
      }
    }
  } else if (world.lockdown <= 0) {
    world.alarm -= dt * 0.055;
  }
  world.alarm = Math.max(0, Math.min(1, world.alarm));
  world.alarmPeak = Math.max(world.alarmPeak, world.alarm);
  if (world.alarm >= 1 && world.lockdown <= 0) {
    world.lockdown = 9;
    events.push('lockdown');
  }
  if (world.lockdown > 0) world.lockdown -= dt;

  // Lasers: a beam is live during the "on" part of its cycle.
  for (const l of world.lasers) {
    l.live = !world.lasersOff && (world.time % l.period) < l.on;
    if (l.tripped > 0) l.tripped -= dt;
    if (l.live && l.tripped <= 0) {
      // Segment-to-player distance in tile units.
      const ax = l.x1 * TILE + 20, ay = l.y1 * TILE + 20;
      const bx = l.x2 * TILE + 20, by = l.y2 * TILE + 20;
      const abx = bx - ax, aby = by - ay;
      const t = Math.max(0, Math.min(1, ((p.x - ax) * abx + (p.y - ay) * aby) / (abx * abx + aby * aby || 1)));
      const d = Math.hypot(p.x - (ax + abx * t), p.y - (ay + aby * t));
      if (d < 13) {
        l.tripped = 2.5;
        world.alarm = Math.min(1, world.alarm + 0.34);
        world.seenEver = true;
        events.push('laser');
        say(world, 'Laser tripped! The alarm jumps.');
      }
    }
  }

  // Noisemaker: guards within earshot go and stare at it.
  if (world.noise) {
    world.noise.ttl -= dt;
    if (world.noise.ttl <= 0) world.noise = null;
  }

  // Guards think.
  for (const g of world.guards) {
    if (g.state === 'patrol') {
      const [wx, wy] = g.path[g.wp];
      if (moveGuard(world, g, dt, wx * TILE + 20, wy * TILE + 20, world.lockdown > 0 ? 1.25 : 1)) {
        g.wp = (g.wp + 1) % g.path.length;
      }
      if (world.noise && Math.hypot(world.noise.x - g.x, world.noise.y - g.y) < 260) {
        g.state = 'investigate'; g.targetX = world.noise.x; g.targetY = world.noise.y; g.waitT = 0;
      }
    } else if (g.state === 'investigate') {
      if (moveGuard(world, g, dt, g.targetX, g.targetY, 1.15)) {
        g.waitT += dt;
        g.dir += dt * 1.7; // scanning turn
        if (g.waitT > 1.6) g.state = 'patrol';
      }
    } else if (g.state === 'hunt') {
      const fresh = guardSees(world, g, p.x, p.y, sneakFactor) > 0.05;
      if (fresh) { g.targetX = p.x; g.targetY = p.y; }
      if (moveGuard(world, g, dt, g.targetX, g.targetY, 1.55)) {
        if (!fresh) { g.state = 'investigate'; g.waitT = 0.4; }
      }
      if (Math.hypot(p.x - g.x, p.y - g.y) < 21) {
        world.busted = true;
        events.push('busted');
      }
    }
  }
  return world;
}

export function say(world, text) {
  world.message = text;
  world.messageTtl = 3.2;
}
