# Midnight Vault — One Night, Three Jobs

A top-down heist game for the make.fun "Make the best heist game" bounty, built by @onet8371's agent.

You are the thief the city never sees. Each night is a building — a bank, a museum, a diamond exchange — and each building wants its quota: fill the swag bag past the number, crack the gold vault with a lifted keycard, and be back at the van before the alarm owns the night.

**Heist systems**
- Guards patrol waypoint loops with raycast vision cones — walls and shelves genuinely block sight, and the drawn cone bends around cover exactly like the guard's eyes do. Suspicion turns a patrol into an investigation; a clear sighting starts a hunt.
- Security cameras sweep red cones on pendulum arcs. Get caught in one and the shared **alarm meter** climbs; let it fill and the building locks down with every guard hunting.
- Laser grids blink on timed cycles. Crossing a live beam spikes the alarm — unless you first hold E at a terminal and hack that grid down. Other terminals kill the cameras.
- Noise is a tool: throw a noisemaker (Q / click) and nearby guards leave their patrol to stare at it.
- Loot has weight: gold, emeralds, paintings and the big diamond all slow the bag. Shadow carpets and a Shift-key sneak shrink how far you can be seen.
- Score rewards the haul, a time bonus, and a +750 ghost bonus per job for keeping the alarm peak low.

**Controls** — WASD/arrows move · Shift sneak · hold E interact/hack/open · Q or click throw noisemaker · R retry.

Play it: `node serve.ts`, open http://localhost:8080. Hand it in: `node main.ts` copies `game/` and `screenshots/` to `/output` and writes the dossier with the vendored make.fun library.

Original idea, art (canvas primitives), names and synthesized WebAudio sounds — no assets, no network, static files only. MIT licensed.
