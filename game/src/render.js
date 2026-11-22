// MIDNIGHT VAULT — canvas renderer.
// Draws the marble floors, the raycast vision cones (bent around real
// cover, exactly what the guards and cameras can see), sweeping camera
// cones, laser beams, loot sparkle and the HUD with the ALARM meter.

import { TILE, COLS, ROWS } from './levels.js';
import { GUARD_FOV, CAM_FOV, lineOfSight, tileAt } from './world.js';

export const W = COLS * TILE;        // 960
export const H = ROWS * TILE + 64;   // playfield + HUD strip

function conePolygon(world, x, y, dir, fov, range) {
  const pts = [[x, y]];
  const rays = 26;
  for (let i = 0; i <= rays; i++) {
    const a = dir - fov / 2 + (fov * i) / rays;
    let d = range;
    // March the ray until a wall eats it.
    for (let step = 8; step < range; step += 8) {
      const px = x + Math.cos(a) * step, py = y + Math.sin(a) * step;
      if (!lineOfSight(world.level, x, y, px, py, world.vaultOpen)) { d = step; break; }
    }
    pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
  }
  return pts;
}

function poly(ctx, pts, fill) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

const LOOT_DRAW = {
  g: (ctx, x, y, t) => { ctx.fillStyle = '#f5c542'; ctx.fillRect(x - 9, y + 2, 18, 7); ctx.fillRect(x - 7, y - 5, 14, 6); ctx.fillStyle = '#ffe89a'; ctx.fillRect(x - 7, y - 5, 14, 2); },
  m: (ctx, x, y) => { ctx.fillStyle = '#3f9e4d'; ctx.beginPath(); ctx.arc(x, y + 1, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#dff5df'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText('$', x, y + 5); },
  e: (ctx, x, y, t) => { ctx.fillStyle = '#2fe08c'; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2) * 0.3); ctx.fillRect(-6, -6, 12, 12); ctx.fillStyle = '#b8ffd9'; ctx.fillRect(-3, -3, 5, 5); ctx.restore(); },
  p: (ctx, x, y) => { ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x - 11, y - 9, 22, 18); ctx.fillStyle = '#274b8f'; ctx.fillRect(x - 8, y - 6, 16, 12); ctx.fillStyle = '#f5c542'; ctx.beginPath(); ctx.arc(x + 3, y - 2, 3.4, 0, 7); ctx.fill(); },
  D: (ctx, x, y, t) => { ctx.save(); ctx.translate(x, y + Math.sin(t * 3) * 1.5); ctx.fillStyle = '#aee6ff'; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(8, -2); ctx.lineTo(0, 11); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(4, -2); ctx.lineTo(0, 4); ctx.lineTo(-4, -2); ctx.closePath(); ctx.fill(); ctx.restore(); },
};

export function draw(ctx, world, ui) {
  const { level } = world;
  ctx.clearRect(0, 0, W, H);

  // Floors and walls.
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      const ch = tileAt(level, tx, ty);
      const x = tx * TILE, y = ty * TILE;
      if (ch === '#') {
        ctx.fillStyle = '#232733';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#2e3444';
        ctx.fillRect(x, y, TILE, 5);
      } else {
        const dark = (tx + ty) % 2 === 0;
        ctx.fillStyle = ch === ',' ? '#1d2438' : (dark ? '#39415a' : '#414b66');
        ctx.fillRect(x, y, TILE, TILE);
        if (ch === ',') { ctx.fillStyle = '#252e4a'; ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10); }
        if (ch === 'V') {
          ctx.fillStyle = '#7a6420'; ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#f5c542'; ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
          ctx.fillStyle = '#8a6d1f'; ctx.beginPath(); ctx.arc(x + 20, y + 20, 8, 0, 7); ctx.fill();
          ctx.fillStyle = '#3a2f08'; ctx.beginPath(); ctx.arc(x + 20, y + 20, 3, 0, 7); ctx.fill();
        }
        if (ch === 'X') {
          ctx.fillStyle = '#14532d'; ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#d7dde8'; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
          ctx.fillText('VAN', x + 20, y + 25);
        }
      }
    }
  }

  // Terminals.
  for (const t of world.terminals) {
    ctx.fillStyle = t.done ? '#1f5130' : '#0e2a3f';
    ctx.fillRect(t.x - 11, t.y - 9, 22, 18);
    ctx.fillStyle = t.done ? '#37e08c' : '#39c2ff';
    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText(t.done ? 'OFF' : '</>', t.x, t.y + 4);
  }

  // Lasers (under the cones, over the floor).
  for (const l of world.lasers) {
    const ax = l.x1 * TILE + 20, ay = l.y1 * TILE + 20, bx = l.x2 * TILE + 20, by = l.y2 * TILE + 20;
    ctx.fillStyle = '#111'; ctx.fillRect(ax - 3, ay - 3, 6, 6); ctx.fillRect(bx - 3, by - 3, 6, 6);
    if (world.lasersOff) continue;
    if (l.live) {
      ctx.strokeStyle = l.tripped > 0 ? '#ff5d5d' : '#ff2d55';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,45,85,.28)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,45,85,.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 6]);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // Vision cones: cameras in red, guards in lantern amber.
  for (const c of world.cameras) {
    if (!world.camerasOff) poly(ctx, conePolygon(world, c.x, c.y, c.dir, CAM_FOV, c.range), 'rgba(255,60,60,.20)');
  }
  for (const g of world.guards) {
    const hunt = g.state === 'hunt';
    poly(ctx, conePolygon(world, g.x, g.y, g.dir, GUARD_FOV, 185), hunt ? 'rgba(255,80,50,.30)' : 'rgba(255,196,64,.20)');
  }

  // Pickups.
  for (const pk of world.pickups) {
    if (pk.taken) continue;
    if (pk.kind === 'key') {
      ctx.fillStyle = '#ffd94d'; ctx.beginPath(); ctx.arc(pk.x - 3, pk.y, 4.5, 0, 7); ctx.fill();
      ctx.fillRect(pk.x, pk.y - 1.6, 11, 3.2); ctx.fillRect(pk.x + 7, pk.y - 1.6, 3, 5);
    } else LOOT_DRAW[pk.ch](ctx, pk.x, pk.y, world.time);
  }

  // Noisemaker.
  if (world.noise) {
    const r = 8 + Math.sin(world.time * 14) * 2.5;
    ctx.strokeStyle = '#7ee0ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(world.noise.x, world.noise.y, r + 6, 0, 7); ctx.stroke();
    ctx.fillStyle = '#7ee0ff'; ctx.beginPath(); ctx.arc(world.noise.x, world.noise.y, 4, 0, 7); ctx.fill();
  }

  // Cameras (wall domes).
  for (const c of world.cameras) {
    ctx.fillStyle = world.camerasOff ? '#39404f' : '#c22727';
    ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('CAM', c.x, c.y + 3);
  }

  // Guards.
  for (const g of world.guards) {
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(g.x, g.y + 9, 10, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = g.state === 'hunt' ? '#d43a2a' : '#31517d';
    ctx.beginPath(); ctx.arc(g.x, g.y, 11, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2c894'; ctx.beginPath(); ctx.arc(g.x, g.y - 3, 5.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#20344f'; ctx.fillRect(g.x - 6, g.y - 10, 12, 4);
    if (g.state !== 'patrol') {
      ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = g.state === 'hunt' ? '#ff5d5d' : '#ffd94d';
      ctx.fillText(g.state === 'hunt' ? '!' : '?', g.x, g.y - 16);
    }
  }

  // The thief.
  const p = world.player;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 9, 10, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = p.sneak ? '#10131c' : '#1b2130';
  ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 7); ctx.fill();
  ctx.strokeStyle = '#7ee0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 7); ctx.stroke();
  ctx.fillStyle = '#dfe8ff'; ctx.beginPath(); ctx.arc(p.x, p.y - 3, 5, 0, 7); ctx.fill();
  ctx.fillStyle = '#10131c'; ctx.fillRect(p.x - 5.4, p.y - 5, 10.8, 3.4); // mask band
  if (world.lootTaken > 0) { // the swag bag grows with the haul
    ctx.fillStyle = '#3f9e4d'; ctx.beginPath(); ctx.arc(p.x - 11, p.y + 6, 4 + Math.min(5, world.lootTaken), 0, 7); ctx.fill();
  }
  // Hack progress ring.
  if (world.hackTarget && world.hackProgress > 0) {
    ctx.strokeStyle = '#39c2ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 17, -Math.PI / 2, -Math.PI / 2 + world.hackProgress * Math.PI * 2); ctx.stroke();
  }

  drawHud(ctx, world, ui);
}

function drawHud(ctx, world, ui) {
  const y0 = ROWS * TILE;
  ctx.fillStyle = '#0d1017'; ctx.fillRect(0, y0, W, 64);
  ctx.fillStyle = '#232a3a'; ctx.fillRect(0, y0, W, 2);
  ctx.textAlign = 'left'; ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#dfe8ff';
  ctx.fillText(world.level.name, 14, y0 + 24);
  ctx.font = '12px monospace'; ctx.fillStyle = '#9fb0cc';
  ctx.fillText(`Loot $${world.loot.toLocaleString()} / quota $${world.level.quota.toLocaleString()} · total $${world.lootTotal.toLocaleString()}`, 14, y0 + 46);
  ctx.fillText(`Time ${ui.timeText} · Decoys ${world.decoys} · ${world.hasKey ? 'KEYCARD ✓' : 'no keycard'}${world.vaultOpen ? ' · VAULT OPEN' : ''}`, 330, y0 + 46);

  // THE ALARM METER — always on screen, always labelled.
  const ax = 620, ay = y0 + 12, aw = 300, ah = 16;
  ctx.font = 'bold 12px monospace'; ctx.fillStyle = world.alarm > 0.66 ? '#ff5d5d' : '#ffd94d';
  ctx.fillText(world.lockdown > 0 ? 'ALARM — LOCKDOWN!' : 'ALARM METER', ax, ay - 1 + 12 - 12 + 1);
  ctx.fillStyle = '#2a3040'; ctx.fillRect(ax, ay + 14, aw, ah);
  const hue = world.alarm > 0.66 ? '#ff4040' : world.alarm > 0.33 ? '#ff9f2e' : '#ffc832';
  ctx.fillStyle = hue; ctx.fillRect(ax, ay + 14, aw * world.alarm, ah);
  ctx.strokeStyle = '#4a5468'; ctx.strokeRect(ax, ay + 14, aw, ah);
  ctx.font = '11px monospace'; ctx.fillStyle = '#9fb0cc';
  ctx.fillText(world.exposure > 0.12 ? 'SPOTTED — break line of sight!' : 'unseen', ax, ay + 48);

  if (world.messageTtl > 0) {
    ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffe89a';
    ctx.fillText(world.message, W / 2, 26);
  }
}
