// MIDNIGHT VAULT — level plans for the three one-night jobs.
// Every plan is a tile map plus patrol, camera and laser schedules.
// Tile letters: # wall · . marble floor · , shadow carpet · S start (the
// service door) · X getaway van bay · K keycard · T hack terminal ·
// V vault door (keycard) · g gold stack · e emerald · p painting ·
// m money bag · D diamond display. Loot letters sit on floor tiles.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 16;

export const LOOT_VALUES = {
  g: 400,   // gold stack
  m: 250,   // money bag
  e: 600,   // emerald
  p: 800,   // painting
  D: 1500,  // the big diamond
};

export const LEVELS = [
  {
    name: 'Job 1 — First National Bank',
    brief: 'Lift at least $2,000, crack the vault, and slip back to the van.',
    quota: 2000,
    grid: [
      '########################',
      '#S....#........#.......#',
      '#.....,........#...g...#',
      '#..X..#....T...D.......#',
      '#.....#........#...g...#',
      '#.....#####.####.......#',
      '#..........#.....#######',
      '#..,,......#.....#.....#',
      '#..,,..K...V..e..#..T..#',
      '#..........#.....#.....#',
      '#######.####.....###.###',
      '#..........#...........#',
      '#...m......#.....,,....#',
      '#..........#....,,p....#',
      '#....T.....#...........#',
      '########################',
    ],
    guards: [
      { path: [[9, 2], [13, 2], [13, 5], [9, 5]], speed: 1.05 },
      { path: [[17, 11], [21, 11], [21, 14], [17, 14]], speed: 1.15 },
      { path: [[3, 11], [7, 11], [7, 14], [3, 14]], speed: 0.95 },
    ],
    cameras: [
      { tx: 14, ty: 1, base: Math.PI / 2, sweep: 0.9, range: 170 },
      { tx: 20, ty: 10, base: Math.PI, sweep: 0.8, range: 160 },
    ],
    lasers: [
      { x1: 11, y1: 7, x2: 11, y2: 9, period: 3.2, on: 2.0 },
      { x1: 19, y1: 6, x2: 21, y2: 6, period: 4.0, on: 2.6 },
    ],
    terminals: [
      { tx: 11, ty: 3, kills: 'cameras', label: 'camera grid' },
      { tx: 5, ty: 14, kills: 'lasers', label: 'laser grid' },
      { tx: 20, ty: 8, kills: 'cameras', label: 'camera grid' },
    ],
  },
  {
    name: 'Job 2 — Museum of Night',
    brief: 'The paintings are the prize. Quota $3,000 — do not touch a laser.',
    quota: 3000,
    grid: [
      '########################',
      '#S....#......#.........#',
      '#..X..#..p...#....e....#',
      '#.....#......#.........#',
      '#.....###.########.#####',
      '#......................#',
      '#..,,....T....,,...#.#.#',
      '#..,,..............#.#.#',
      '####.#######.#######.#.#',
      '#......#.......#.....#.#',
      '#..K...#...V...#..g..#.#',
      '#......#...D...#.....#.#',
      '#......#.......#..T..#.#',
      '#..m...###.#####.......#',
      '#..........#......p....#',
      '########################',
    ],
    guards: [
      { path: [[9, 5], [16, 5], [16, 7], [9, 7]], speed: 1.2 },
      { path: [[2, 9], [6, 9], [6, 14], [2, 14]], speed: 1.1 },
      { path: [[18, 9], [21, 9], [21, 12], [18, 12]], speed: 1.25 },
      { path: [[12, 13], [15, 13], [15, 10], [12, 10]], speed: 1.0 },
    ],
    cameras: [
      { tx: 1, ty: 5, base: 0, sweep: 0.7, range: 180 },
      { tx: 22, ty: 1, base: Math.PI / 2, sweep: 1.0, range: 170 },
      { tx: 11, ty: 14, base: -Math.PI / 2, sweep: 0.8, range: 160 },
    ],
    lasers: [
      { x1: 11, y1: 9, x2: 11, y2: 12, period: 3.6, on: 2.4 },
      { x1: 17, y1: 5, x2: 17, y2: 7, period: 2.8, on: 1.8 },
      { x1: 4, y1: 8, x2: 7, y2: 8, period: 4.4, on: 3.0 },
    ],
    terminals: [
      { tx: 9, ty: 6, kills: 'lasers', label: 'laser grid' },
      { tx: 18, ty: 12, kills: 'cameras', label: 'camera grid' },
    ],
  },
  {
    name: 'Job 3 — The Diamond Exchange',
    brief: 'Everything is guarded and everything glitters. Quota $3,200.',
    quota: 3200,
    grid: [
      '########################',
      '#S...#.........#.......#',
      '#.X..#....e....#...g...#',
      '#....#.........#.......#',
      '#....#####.#####...T...#',
      '#..........#.....#######',
      '#..,,......#.....#.....#',
      '#..,,..T...V..D..#..e..#',
      '#..........#.....#.....#',
      '#####.######.....###.###',
      '#........#.....#.......#',
      '#...K....#..m..#...p...#',
      '#........#.....#.......#',
      '#....,,..###.###...,,..#',
      '#....,,......T.....g...#',
      '########################',
    ],
    guards: [
      { path: [[7, 1], [13, 1], [13, 4], [7, 4]], speed: 1.3 },
      { path: [[16, 10], [22, 10], [22, 14], [16, 14]], speed: 1.35 },
      { path: [[2, 10], [7, 10], [7, 14], [2, 14]], speed: 1.2 },
      { path: [[18, 2], [21, 2], [21, 4], [18, 4]], speed: 1.4 },
      { path: [[10, 10], [14, 10], [14, 14], [10, 14]], speed: 1.15 },
    ],
    cameras: [
      { tx: 6, ty: 5, base: 0.6, sweep: 0.9, range: 180 },
      { tx: 22, ty: 6, base: Math.PI, sweep: 0.7, range: 170 },
      { tx: 12, ty: 9, base: Math.PI / 2, sweep: 1.0, range: 165 },
      { tx: 1, ty: 9, base: 0, sweep: 0.8, range: 160 },
    ],
    lasers: [
      { x1: 11, y1: 6, x2: 11, y2: 8, period: 3.0, on: 2.0 },
      { x1: 15, y1: 10, x2: 15, y2: 13, period: 3.8, on: 2.5 },
      { x1: 8, y1: 9, x2: 12, y2: 9, period: 2.6, on: 1.7 },
      { x1: 20, y1: 5, x2: 22, y2: 5, period: 4.2, on: 2.8 },
    ],
    terminals: [
      { tx: 7, ty: 7, kills: 'cameras', label: 'camera grid' },
      { tx: 13, ty: 14, kills: 'lasers', label: 'laser grid' },
      { tx: 19, ty: 4, kills: 'cameras', label: 'camera grid' },
    ],
  },
];
