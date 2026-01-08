import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { HealMonsterEffect } from '@/core/systems/effects/HealMonsterEffect';
import { HasteMonsterEffect } from '@/core/systems/effects/HasteMonsterEffect';
import { CloneMonsterEffect } from '@/core/systems/effects/CloneMonsterEffect';
import { Actor } from '@/core/entities/Actor';
import { Monster } from '@/core/entities/Monster';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext, MonsterInfo } from '@/core/systems/effects/GPEffect';
import type { Position } from '@/core/types';

// Mock level with monsters
function createMockLevel(monsters: Monster[] = [], width = 50, height = 50) {
  return {
    width,
    height,
    getMonsterAt: (pos: Position) => {
      return monsters.find(m => m.position.x === pos.x && m.position.y === pos.y);
    },
    getMonsters: () => [...monsters],
    addMonster: (monster: Monster) => {
      monsters.push(monster);
    },
    removeMonster: (monster: Monster) => {
      const idx = monsters.indexOf(monster);
      if (idx !== -1) monsters.splice(idx, 1);
    },
    isWalkable: (pos: Position) => {
      if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) return false;
      return !monsters.some(m => m.position.x === pos.x && m.position.y === pos.y);
    },
    isOccupied: (pos: Position) => {
      return monsters.some(m => m.position.x === pos.x && m.position.y === pos.y);
    },
  };
}

function createActor(x: number, y: number): Actor {
  return new Actor({
    id: `actor-${x}-${y}`,
    position: { x, y },
    symbol: '@',
    color: '#fff',
    maxHp: 100,
    speed: 110,
  });
}

function createMonster(x: number, y: number, _hp = 50, maxHp = 100): Monster {
  return new Monster({
    id: `monster-${x}-${y}`,
    position: { x, y },
    symbol: 'o',
    color: '#0f0',
    definitionKey: 'orc',
    maxHp,
    speed: 110,
  });
}

describe('HealMonsterEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const effect = new HealMonsterEffect({
        type: 'healMonster',
        target: 'position',
      });
      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: createMockLevel() as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(false);
    });

    it('returns true with target position', () => {
      const effect = new HealMonsterEffect({
        type: 'healMonster',
        target: 'position',
      });
      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: createMockLevel() as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      expect(effect.canExecute(context)).toBe(true);
    });
  });

  describe('execute', () => {
    it('reports nothing when position is empty', () => {
      const effect = new HealMonsterEffect({
        type: 'healMonster',
        target: 'position',
      });
      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: createMockLevel() as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
      expect(result.messages[0].toLowerCase()).toContain('nothing');
    });

    it('heals damaged monster with fixed amount', () => {
      const monster = createMonster(12, 10, 50, 100);
      monster.takeDamage(30); // Now at 20 HP
      const level = createMockLevel([monster]);

      const effect = new HealMonsterEffect({
        type: 'healMonster',
        target: 'position',
        amount: 25,
      });

      const getMonsterInfo = (_m: Monster): MonsterInfo => ({
        name: 'Orc',
        flags: [],
      });

      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
        getMonsterInfo,
      };

      const hpBefore = monster.hp;
      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(monster.hp).toBe(hpBefore + 25);
      expect(result.messages.some(m => m.includes('Orc'))).toBe(true);
    });

    it('caps healing at max HP', () => {
      const monster = createMonster(12, 10, 100, 100);
      monster.takeDamage(5); // Now at 95 HP
      const level = createMockLevel([monster]);

      const effect = new HealMonsterEffect({
        type: 'healMonster',
        target: 'position',
        amount: 50,
      });

      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
        getMonsterInfo: () => ({ name: 'Orc', flags: [] }),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(monster.hp).toBe(100);
    });
  });
});

describe('HasteMonsterEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const effect = new HasteMonsterEffect({
        type: 'hasteMonster',
        target: 'position',
      });
      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: createMockLevel() as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(false);
    });
  });

  describe('execute', () => {
    it('reports nothing when position is empty', () => {
      const effect = new HasteMonsterEffect({
        type: 'hasteMonster',
        target: 'position',
      });
      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: createMockLevel() as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
    });

    it('applies haste status to monster', () => {
      const monster = createMonster(12, 10);
      const level = createMockLevel([monster]);

      const effect = new HasteMonsterEffect({
        type: 'hasteMonster',
        target: 'position',
        duration: 20,
      });

      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
        getMonsterInfo: () => ({ name: 'Orc', flags: [] }),
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(monster.statuses.has('haste')).toBe(true);
      expect(result.messages.some(m => m.includes('Orc') && m.toLowerCase().includes('faster'))).toBe(true);
    });
  });
});

describe('CloneMonsterEffect', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('canExecute', () => {
    it('returns false without target position', () => {
      const effect = new CloneMonsterEffect({
        type: 'cloneMonster',
        target: 'position',
      });
      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: createMockLevel() as any,
        rng: RNG,
      };

      expect(effect.canExecute(context)).toBe(false);
    });
  });

  describe('execute', () => {
    it('reports nothing when position is empty', () => {
      const effect = new CloneMonsterEffect({
        type: 'cloneMonster',
        target: 'position',
      });
      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: createMockLevel() as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
      };

      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(result.turnConsumed).toBe(true);
    });

    it('clones monster creating a duplicate nearby', () => {
      const monster = createMonster(25, 25);
      const level = createMockLevel([monster]);

      const effect = new CloneMonsterEffect({
        type: 'cloneMonster',
        target: 'position',
      });
      effect.resources = {
        monsterDataManager: {
          getMonsterDef: () => ({
            key: 'orc',
            name: 'Orc',
            symbol: 'o',
            color: '#0f0',
            speed: 110,
            hp: '10d10',
            depth: 5,
            flags: [],
          }),
          createMonsterFromDef: (def: any, pos: Position) => {
            return new Monster({
              id: `clone-${pos.x}-${pos.y}`,
              position: pos,
              symbol: def.symbol,
              color: def.color,
              definitionKey: def.key,
              maxHp: 50,
              speed: def.speed,
            });
          },
        } as any,
      };

      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: level as any,
        rng: RNG,
        targetPosition: { x: 25, y: 25 },
        getMonsterInfo: () => ({ name: 'Orc', flags: [] }),
      };

      const countBefore = level.getMonsters().length;
      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(level.getMonsters().length).toBe(countBefore + 1);
      expect(result.messages.some(m => m.includes('Orc'))).toBe(true);
    });

    it('does not clone unique monsters', () => {
      const monster = createMonster(12, 10);
      const level = createMockLevel([monster]);

      const effect = new CloneMonsterEffect({
        type: 'cloneMonster',
        target: 'position',
      });

      const context: GPEffectContext = {
        actor: createActor(10, 10),
        level: level as any,
        rng: RNG,
        targetPosition: { x: 12, y: 10 },
        getMonsterInfo: () => ({ name: 'Morgoth', flags: ['UNIQUE'] }),
      };

      const countBefore = level.getMonsters().length;
      const result = effect.execute(context);

      expect(result.success).toBe(true);
      expect(level.getMonsters().length).toBe(countBefore);
      expect(result.messages[0]).toContain('unaffected');
    });
  });
});
