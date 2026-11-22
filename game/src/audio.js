// MIDNIGHT VAULT — tiny synthesized sound kit (WebAudio, no assets).
// Every sound is an oscillator blip shaped by hand: loot chimes, hack
// beeps, a laser zap, the alarm swell and the getaway sting.

let ctx = null;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(freq, dur, type, gain, slideTo, delay = 0) {
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  loot() { blip(880, 0.09, 'triangle', 0.16); blip(1318, 0.14, 'triangle', 0.14, null, 0.07); },
  key() { blip(660, 0.07, 'square', 0.08); blip(990, 0.1, 'square', 0.08, null, 0.06); },
  hackTick() { blip(1200 + Math.random() * 500, 0.04, 'square', 0.05); },
  hackDone() { blip(523, 0.09, 'triangle', 0.15); blip(784, 0.09, 'triangle', 0.15, null, 0.08); blip(1046, 0.16, 'triangle', 0.15, null, 0.16); },
  door() { blip(180, 0.22, 'sawtooth', 0.1, 90); blip(1200, 0.05, 'square', 0.05, null, 0.18); },
  decoy() { blip(1560, 0.06, 'square', 0.1); blip(1560, 0.06, 'square', 0.1, null, 0.12); blip(1170, 0.09, 'square', 0.1, null, 0.24); },
  laser() { blip(2200, 0.18, 'sawtooth', 0.12, 300); },
  alarm() { blip(740, 0.16, 'square', 0.07); blip(740, 0.16, 'square', 0.07, null, 0.22); },
  busted() { blip(392, 0.2, 'sawtooth', 0.14); blip(311, 0.2, 'sawtooth', 0.14, null, 0.18); blip(233, 0.42, 'sawtooth', 0.14, null, 0.36); },
  escape() { [523, 659, 784, 1046, 1318].forEach((f, i) => blip(f, 0.16, 'triangle', 0.14, null, i * 0.09)); },
  step(sneak) { blip(sneak ? 140 : 190, 0.03, 'sine', sneak ? 0.015 : 0.03, 90); },
};
