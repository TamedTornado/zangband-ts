import * as ROT from 'rot-js';
import { Player } from '@/core/entities/Player';
import { Level } from '@/core/world/Level';
import { Direction } from '@/core/types';

const WIDTH = 80;
const HEIGHT = 25;

const display = new ROT.Display({ width: WIDTH, height: HEIGHT });
const container = display.getContainer();
if (container) {
  document.querySelector<HTMLDivElement>('#app')?.appendChild(container);
}

const level = new Level(WIDTH, HEIGHT);

// Add walls around the border
for (let x = 0; x < WIDTH; x++) {
  level.setWalkable({ x, y: 0 }, false);
  level.setWalkable({ x, y: HEIGHT - 1 }, false);
}
for (let y = 0; y < HEIGHT; y++) {
  level.setWalkable({ x: 0, y }, false);
  level.setWalkable({ x: WIDTH - 1, y }, false);
}

const player = new Player({
  id: 'player',
  position: { x: 40, y: 12 },
  maxHp: 100,
  speed: 110,
  stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
});

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: Direction.North,
  ArrowDown: Direction.South,
  ArrowLeft: Direction.West,
  ArrowRight: Direction.East,
  k: Direction.North,
  j: Direction.South,
  h: Direction.West,
  l: Direction.East,
  y: Direction.NorthWest,
  u: Direction.NorthEast,
  b: Direction.SouthWest,
  n: Direction.SouthEast,
};

function render(): void {
  display.clear();

  // Draw floor and walls
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (level.isWalkable({ x, y })) {
        display.draw(x, y, '.', '#444', '#000');
      } else {
        display.draw(x, y, '#', '#888', '#000');
      }
    }
  }

  // Draw player on top
  const pos = player.position;
  display.draw(pos.x, pos.y, '@', '#fff', '#000');
}

function handleKey(e: KeyboardEvent): void {
  const dir = KEY_MAP[e.key];
  if (dir !== undefined) {
    player.tryMove(dir, level);
    render();
  }
}

window.addEventListener('keydown', handleKey);
render();
