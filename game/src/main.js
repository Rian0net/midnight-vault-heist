// MIDNIGHT VAULT — game entry: input, player movement, interactions,
// level flow and the deterministic ?shot= scenes used for screenshots.
//
// Controls — WASD / arrows move · Shift sneak · hold E interact (loot is
// automatic, E picks the keycard, hacks terminals, opens the vault and
// escapes at the van) · Q or click throw a noisemaker · R retry the job.

import { LEVELS, TILE } from './levels.js';
import { buildWorld, stepWorld, say, tileAt, isSolid } from './world.js';
import { draw, W, H } from './render.js';
import { sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;

const keys = new Set();
let mouse = { x: 0, y: 0 };
addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) e.preventDefault(); });
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
canvas.addEventListener('mousemove', e => { const r = canvas.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * (W / r.width); mouse.y = (e.clientY - r.top) * (H / r.height); });
canvas.addEventListener('click', () => throwDecoy(mouse.x, mouse.y));

let mode = 'title'; // title | play | busted | clear | finale
let levelIndex = 0;
let world = buildWorld(LEVELS[0], 0);
let totalScore = 0;
let levelScore = 0;
let alarmSfxT = 0;
let stepT = 0;

function startLevel(i) {
  levelIndex = i;
  world = buildWorld(LEVELS[i], i);
  levelScore = 0;
  mode = 'play';
  say(world, LEVELS[i].brief);
}

function fmtTime(s) { return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; }

function throwDecoy(x, y) {
  if (mode !== 'play' || world.decoys <= 0 || world.noise) return;
  if (Math.hypot(x - world.player.x, y - world.player.y) > 300) { say(world, 'Too far to throw.'); return; }
  world.decoys--;
  world.noise = { x, y, ttl: 4 };
  sfx.decoy();
  say(world, 'Noisemaker away — eyes off you.');
}

function playerMove(dt) {
  const p = world.player;
  let dx = 0, dy = 0;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  p.sneak = keys.has('shift');
  const len = Math.hypot(dx, dy) || 1;
  const weight = Math.max(0.62, 1 - world.lootTaken * 0.045); // a heavy bag is a slow bag
  const speed = (p.sneak ? 92 : 168) * weight;
  p.moving = dx !== 0 || dy !== 0;
  if (p.moving) {
    p.dir = Math.atan2(dy, dx);
    const nx = p.x + (dx / len) * speed * dt;
    const ny = p.y + (dy / len) * speed * dt;
    const r = 10;
    const hit = (x, y) => isSolid(world.level, Math.floor(x / TILE), Math.floor(y / TILE), world.vaultOpen);
    if (!hit(nx + Math.sign(dx) * r, p.y) && !hit(nx + Math.sign(dx) * r, p.y - 7) && !hit(nx + Math.sign(dx) * r, p.y + 7)) p.x = nx;
    if (!hit(p.x, ny + Math.sign(dy) * r) && !hit(p.x - 7, ny + Math.sign(dy) * r) && !hit(p.x + 7, ny + Math.sign(dy) * r)) p.y = ny;
    stepT -= dt;
    if (stepT <= 0) { sfx.step(p.sneak); stepT = p.sneak ? 0.42 : 0.27; }
  }
}

function interact(dt) {
  const p = world.player;
  const near = (x, y, d) => Math.hypot(x - p.x, y - p.y) < d;
  world.hackTarget = null;

  // Loot and the keycard are grabbed by walking over them.
  for (const pk of world.pickups) {
    if (pk.taken || !near(pk.x, pk.y, 19)) continue;
    pk.taken = true;
    if (pk.kind === 'key') { world.hasKey = true; sfx.key(); say(world, 'Keycard lifted. The vault will open now.'); }
    else {
      world.loot += pk.value; world.lootTaken++;
      sfx.loot(); say(world, `Bagged $${pk.value}. Total $${world.loot}.`);
    }
  }

  const holdingE = keys.has('e');

  // The vault door.
  const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
  if (!world.vaultOpen) {
    for (let ty = pty - 1; ty <= pty + 1; ty++) for (let tx = ptx - 1; tx <= ptx + 1; tx++) {
      if (tileAt(world.level, tx, ty) === 'V' && holdingE) {
        if (world.hasKey) { world.vaultOpen = true; sfx.door(); say(world, 'Vault open. Help yourself — quietly.'); }
        else say(world, 'The vault needs a keycard.');
      }
    }
  }

  // Hacking a terminal takes a held E and a steady nerve.
  if (holdingE) {
    for (const t of world.terminals) {
      if (t.done || !near(t.x, t.y, 30)) continue;
      world.hackTarget = t;
      world.hackProgress += dt / 1.5;
      if (Math.random() < dt * 9) sfx.hackTick();
      if (world.hackProgress >= 1) {
        t.done = true; world.hackProgress = 0;
        if (t.kills === 'cameras') world.camerasOff = true; else world.lasersOff = true;
        sfx.hackDone(); say(world, `Hacked: the ${t.label} is DOWN.`);
      }
      break;
    }
  } else world.hackProgress = Math.max(0, world.hackProgress - dt * 2);

  // Escape at the van.
  if (tileAt(world.level, ptx, pty) === 'X' || near(world.exitTile.x * TILE + 20, world.exitTile.y * TILE + 20, 24)) {
    if (world.loot >= world.level.quota) {
      const timeBonus = Math.max(0, 900 - Math.floor(world.time) * 3);
      const ghost = world.alarmPeak < 0.45 ? 750 : 0;
      levelScore = world.loot + timeBonus + ghost;
      totalScore += levelScore;
      world.escaped = true;
      sfx.escape();
      mode = levelIndex + 1 < LEVELS.length ? 'clear' : 'finale';
    } else if (holdingE) {
      say(world, `The driver shakes his head: quota is $${world.level.quota}, you carry $${world.loot}.`);
    }
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const events = [];
  if (mode === 'play') {
    playerMove(dt);
    interact(dt);
    stepWorld(world, dt, events);
    if (events.includes('laser')) sfx.laser();
    if (events.includes('lockdown')) sfx.alarm();
    if (world.alarm > 0.75 && world.exposure > 0.1) { alarmSfxT -= dt; if (alarmSfxT <= 0) { sfx.alarm(); alarmSfxT = 0.9; } }
    if (world.busted || events.includes('busted')) { mode = 'busted'; sfx.busted(); }
  }
  draw(ctx, world, { timeText: fmtTime(world.time) });
  overlay();
  requestAnimationFrame(frame);
}

function banner(title, lines, foot) {
  ctx.fillStyle = 'rgba(5,8,14,.82)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5c542'; ctx.font = 'bold 44px monospace';
  ctx.fillText(title, W / 2, H / 2 - 90);
  ctx.fillStyle = '#dfe8ff'; ctx.font = '17px monospace';
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 - 44 + i * 26));
  ctx.fillStyle = '#7ee0ff'; ctx.font = 'bold 16px monospace';
  ctx.fillText(foot, W / 2, H / 2 + 44 + lines.length * 26);
}

function overlay() {
  if (mode === 'title') banner('MIDNIGHT VAULT', [
    'Three buildings. One thief. Every camera awake.',
    'Sneak past guards and cameras, hack the grids, trip nothing.',
    'Fill the bag past quota, crack the vault, reach the van.',
    '',
    'WASD move · Shift sneak · hold E hack/open · Q/click noisemaker',
  ], 'Press ENTER to start Job 1');
  else if (mode === 'busted') banner('BUSTED', [
    'A guard got a hand on you and the night is over.',
    `You were carrying $${world.loot} of the $${world.level.quota} quota.`,
  ], 'Press R to retry this job');
  else if (mode === 'clear') banner('CLEAN GETAWAY', [
    `${world.level.name} — cleared.`,
    `Loot $${world.loot} · score for this job ${levelScore} · running total ${totalScore}`,
    world.alarmPeak < 0.45 ? 'Ghost work: the alarm never even stirred. +750' : 'The alarm noticed you, but the van was faster.',
  ], 'Press ENTER for the next job');
  else if (mode === 'finale') banner('THE VAULTS ARE EMPTY', [
    'All three jobs done. The city sleeps, poorer and none the wiser.',
    `Final score ${totalScore} — loot, speed and nerve included.`,
  ], 'Press ENTER to play the night again');
}

addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (mode === 'title') startLevel(0);
    else if (mode === 'clear') startLevel(levelIndex + 1);
    else if (mode === 'finale') { totalScore = 0; startLevel(0); }
  }
  if (e.key.toLowerCase() === 'r' && (mode === 'busted' || mode === 'play')) startLevel(levelIndex);
  if (e.key.toLowerCase() === 'q') throwDecoy(mouse.x || world.player.x + 90, mouse.y || world.player.y);
});

// --- deterministic screenshot scenes (?shot=title|play|alarm|win) ---
const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  startLevel(0);
  world.player.x = 350; world.player.y = 300;
  world.loot = 650; world.lootTaken = 2;
  if (shot === 'play' || shot === 'alarm') {
    world.guards[0].x = 430; world.guards[0].y = 250; world.guards[0].dir = 2.6;
    world.guards[1].x = 730; world.guards[1].y = 500; world.guards[1].dir = -1.2;
    world.alarm = shot === 'alarm' ? 0.72 : 0.24;
    if (shot === 'alarm') { world.guards[0].state = 'hunt'; world.lockdown = 5; }
    mode = 'play';
  } else if (shot === 'win') {
    world.loot = 3900; world.lootTaken = 6; world.vaultOpen = true; world.hasKey = true;
    mode = 'clear'; levelScore = 5450; totalScore = 5450;
  } else mode = 'title';
  draw(ctx, world, { timeText: '1:07' });
  if (mode !== 'play') overlay();
  document.title = 'shot-ready';
} else {
  requestAnimationFrame(frame);
}
