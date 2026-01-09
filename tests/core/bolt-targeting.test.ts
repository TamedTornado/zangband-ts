import { describe, it, expect } from 'vitest';
import { Level } from '@/core/world/Level';
import { GameWorld } from '@/core/world/GameWorld';
import { Player } from '@/core/entities/Player';
import { Monster } from '@/core/entities/Monster';
import { createTestMonsterDef } from './testHelpers';
import { BoltEffect } from '@/core/systems/effects/BoltEffect';
import { RNG } from 'rot-js';

describe('Bolt targeting', () => {
  it('should hit player when level.player is set', () => {
    const level = new Level(50, 50);

    const player = new Player({
      id: 'player',
      position: { x: 10, y: 10 },
      maxHp: 100,
      speed: 110,
    });
    level.player = player;

    const monsterDef = createTestMonsterDef({ spellFlags: ['BO_ELEC'] });
    const monster = new Monster({
      id: 'monster1',
      position: { x: 15, y: 10 },
      symbol: 'p',
      color: 'b',
      maxHp: 50,
      speed: 110,
      def: monsterDef,
    });
    level.addMonster(monster);

    const bolt = new BoltEffect({
      type: 'bolt',
      dice: '3d8',
      element: 'elec',
      target: 'position',
    });

    const result = bolt.execute({
      actor: monster,
      level,
      rng: RNG,
      targetPosition: player.position,
    });

    expect(result.messages[0]).not.toContain('hits nothing');
  });

  it('should hit player when using GameWorld (which sets level.player)', () => {
    const level = new Level(50, 50);

    const player = new Player({
      id: 'player',
      position: { x: 10, y: 10 },
      maxHp: 100,
      speed: 110,
    });
    // GameWorld now sets level.player in its constructor
    const _world = new GameWorld(player, level);

    const monsterDef = createTestMonsterDef({ spellFlags: ['BO_ELEC'] });
    const monster = new Monster({
      id: 'monster1',
      position: { x: 15, y: 10 },
      symbol: 'p',
      color: 'b',
      maxHp: 50,
      speed: 110,
      def: monsterDef,
    });
    level.addMonster(monster);

    // getActorAt now finds the player
    expect(level.getActorAt({ x: 10, y: 10 })).toBe(player);

    const bolt = new BoltEffect({
      type: 'bolt',
      dice: '3d8',
      element: 'elec',
      target: 'position',
    });

    const result = bolt.execute({
      actor: monster,
      level,
      rng: RNG,
      targetPosition: player.position,
    });

    // Bolt should now hit the player
    expect(result.messages[0]).not.toContain('hits nothing');
  });
});
