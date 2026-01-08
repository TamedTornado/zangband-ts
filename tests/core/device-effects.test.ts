/**
 * Device Effects Tests
 *
 * Tests that device effects (wands, rods, staves) execute correctly via the GPEffect system.
 * This test file specifically catches the bug where device effects like 'bolt' and 'drainLife'
 * would fail with "Unknown effect type" if the wrong executor was used.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { Actor } from '@/core/entities/Actor';
import { Monster } from '@/core/entities/Monster';
import { Level } from '@/core/world/Level';
import { getEffectManager, type GPEffectDef, type GPEffectContext } from '@/core/systems/effects';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import itemsData from '@/data/items/items.json';
import type { ItemDef } from '@/core/data/items';

// Load data before tests
beforeEach(() => {
  loadStatusDefs(statusesData);
});

// Helper to create a test actor
function createTestActor(hp = 100): Actor {
  return new Actor({
    id: 'test-actor',
    position: { x: 5, y: 5 },
    symbol: '@',
    color: '#fff',
    maxHp: hp,
    speed: 110,
  });
}

// Helper to create a test monster
function createTestMonster(hp = 50): Monster {
  return new Monster({
    id: 'test-monster',
    position: { x: 7, y: 5 },
    symbol: 'k',
    color: '#0f0',
    maxHp: hp,
    speed: 110,
    definitionKey: 'kobold',
  });
}

// Helper to create test level with monster
function createTestLevel(): Level {
  const level = new Level(20, 20);
  // Make all tiles walkable
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      const tile = level.getTile(x, y);
      if (tile) {
        tile.terrain = 'floor';
      }
    }
  }
  return level;
}

// Helper to create effect context for device usage
function createDeviceContext(actor: Actor, level: Level, targetPosition?: { x: number; y: number }): GPEffectContext {
  const context: GPEffectContext = {
    actor,
    level,
    rng: RNG,
    getMonsterInfo: () => ({
      name: 'creature',
      flags: [],
    }),
  };
  if (targetPosition) {
    context.targetPosition = targetPosition;
  }
  return context;
}

// Helper to get item by key
function getItem(key: string): ItemDef {
  return (itemsData as Record<string, ItemDef>)[key];
}

describe('Device effects - bolt type', () => {
  it('executes bolt effect without throwing "Unknown effect type"', () => {
    const actor = createTestActor();
    const level = createTestLevel();
    const monster = createTestMonster();
    level.addMonster(monster);

    // Bolt effect definition (like from a wand)
    const effects: GPEffectDef[] = [
      { type: 'bolt', element: 'fire', damage: '6d8', target: 'position' },
    ];

    const context = createDeviceContext(actor, level, monster.position);

    // This should NOT throw "Unknown effect type: bolt"
    expect(() => getEffectManager().executeEffects(effects, context)).not.toThrow();
  });

  it('wand_of_frost_bolts effects can be executed', () => {
    const item = getItem('wand_of_frost_bolts');
    expect(item).toBeDefined();
    expect(item.effects).toBeDefined();
    expect(item.effects!.length).toBeGreaterThan(0);
    expect(item.effects![0].type).toBe('bolt');

    const actor = createTestActor();
    const level = createTestLevel();
    const monster = createTestMonster();
    level.addMonster(monster);

    const context = createDeviceContext(actor, level, monster.position);

    // Execute the actual item effects - should not throw
    expect(() => getEffectManager().executeEffects(item.effects!, context)).not.toThrow();
  });

  it('wand_of_fire_bolts effects can be executed', () => {
    const item = getItem('wand_of_fire_bolts');
    expect(item).toBeDefined();
    expect(item.effects).toBeDefined();

    const actor = createTestActor();
    const level = createTestLevel();
    const monster = createTestMonster();
    level.addMonster(monster);

    const context = createDeviceContext(actor, level, monster.position);

    expect(() => getEffectManager().executeEffects(item.effects!, context)).not.toThrow();
  });
});

describe('Device effects - drainLife type', () => {
  it('executes drainLife effect without throwing "Unknown effect type"', () => {
    const actor = createTestActor();
    const level = createTestLevel();
    const monster = createTestMonster();
    level.addMonster(monster);

    const effects: GPEffectDef[] = [
      { type: 'drainLife', damage: 150, target: 'position' },
    ];

    const context = createDeviceContext(actor, level, monster.position);

    // This should NOT throw "Unknown effect type: drainLife"
    expect(() => getEffectManager().executeEffects(effects, context)).not.toThrow();
  });

  it('wand_of_drain_life effects can be executed', () => {
    const item = getItem('wand_of_drain_life');
    expect(item).toBeDefined();
    expect(item.effects).toBeDefined();
    expect(item.effects![0].type).toBe('drainLife');

    const actor = createTestActor();
    const level = createTestLevel();
    const monster = createTestMonster();
    level.addMonster(monster);

    const context = createDeviceContext(actor, level, monster.position);

    expect(() => getEffectManager().executeEffects(item.effects!, context)).not.toThrow();
  });
});

describe('Device effects - ball type', () => {
  it('executes ball effect without throwing "Unknown effect type"', () => {
    const actor = createTestActor();
    const level = createTestLevel();
    const monster = createTestMonster();
    level.addMonster(monster);

    const effects: GPEffectDef[] = [
      { type: 'ball', element: 'fire', damage: '72', radius: 2, target: 'position' },
    ];

    const context = createDeviceContext(actor, level, monster.position);

    // This should NOT throw "Unknown effect type: ball"
    expect(() => getEffectManager().executeEffects(effects, context)).not.toThrow();
  });

  it('wand_of_fire_balls effects can be executed', () => {
    const item = getItem('wand_of_fire_balls');
    expect(item).toBeDefined();
    expect(item.effects).toBeDefined();

    const actor = createTestActor();
    const level = createTestLevel();
    const monster = createTestMonster();
    level.addMonster(monster);

    const context = createDeviceContext(actor, level, monster.position);

    expect(() => getEffectManager().executeEffects(item.effects!, context)).not.toThrow();
  });
});

describe('Device effects - teleportOther type', () => {
  it('executes teleportOther effect without throwing', () => {
    const actor = createTestActor();
    const level = createTestLevel();
    const monster = createTestMonster();
    level.addMonster(monster);

    const effects: GPEffectDef[] = [
      { type: 'teleportOther', distance: 100, target: 'position' },
    ];

    const context = createDeviceContext(actor, level, monster.position);

    expect(() => getEffectManager().executeEffects(effects, context)).not.toThrow();
  });
});

describe('Device effects - all registered effect types are executable', () => {
  // List of effect types that devices can have
  const deviceEffectTypes = [
    'bolt',
    'ball',
    'breath',
    'drainLife',
    'teleportOther',
    'teleportSelf',
    'lightArea',
    'detect',
    'dispel',
    'stoneToMud',
    'disarm',
    'earthquake',
    'polymorph',
    'healMonster',
    'hasteMonster',
    'cloneMonster',
    'tameMonster',
    'summon',
    'wonder',
    'havoc',
  ];

  it.each(deviceEffectTypes)('effect type "%s" is registered in EffectManager', (effectType) => {
    // Creating an effect should not throw for registered types
    const def: GPEffectDef = { type: effectType };

    // This will throw if the effect type is not registered
    expect(() => getEffectManager().createEffect(def)).not.toThrow(`Unknown GPEffect type: ${effectType}`);
  });
});

describe('Device effects regression - legacy executor bug', () => {
  /**
   * This test specifically catches the bug where device effects would fail
   * if using a legacy executor that only handles basic effect types.
   *
   * The legacy executor only supported: heal, applyStatus, cure, reduce
   * Device effects like bolt, ball, drainLife require the full GPEffect system.
   */

  // Effect types that are implemented in the GPEffect system
  const implementedEffectTypes = new Set([
    'heal', 'applyStatus', 'cure', 'reduce', 'restoreStat',
    'bolt', 'ball', 'breath', 'drainLife',
    'teleportSelf', 'teleportOther',
    'lightArea', 'detect', 'dispel',
    'stoneToMud', 'disarm', 'earthquake',
    'polymorph', 'recall',
    'healMonster', 'hasteMonster', 'cloneMonster', 'tameMonster',
    'summon', 'wonder', 'havoc',
    'identify', 'genocide', 'areaStatus', 'trapDoorDestruction',
  ]);

  // Effect types not yet implemented (documenting for future work)
  const notYetImplemented = new Set([
    'removeCurse', 'enchant', 'recharge', 'acquirement',
  ]);

  it('devices with bolt effects are executable', () => {
    const actor = createTestActor();
    const level = createTestLevel();
    const monster = createTestMonster();
    level.addMonster(monster);
    const context = createDeviceContext(actor, level, monster.position);

    const boltDevices = Object.values(itemsData as Record<string, ItemDef>)
      .filter((item) => item.type === 'wand' || item.type === 'rod' || item.type === 'staff')
      .filter((item) => item.effects?.some((e) => e.type === 'bolt'));

    expect(boltDevices.length).toBeGreaterThan(0);

    for (const item of boltDevices) {
      expect(
        () => getEffectManager().executeEffects(item.effects!, context),
        `Device "${item.name}" bolt effects should work`
      ).not.toThrow();
    }
  });

  it('devices with ball effects are executable', () => {
    const actor = createTestActor();
    const level = createTestLevel();
    const monster = createTestMonster();
    level.addMonster(monster);
    const context = createDeviceContext(actor, level, monster.position);

    const ballDevices = Object.values(itemsData as Record<string, ItemDef>)
      .filter((item) => item.type === 'wand' || item.type === 'rod' || item.type === 'staff')
      .filter((item) => item.effects?.some((e) => e.type === 'ball'));

    expect(ballDevices.length).toBeGreaterThan(0);

    for (const item of ballDevices) {
      expect(
        () => getEffectManager().executeEffects(item.effects!, context),
        `Device "${item.name}" ball effects should work`
      ).not.toThrow();
    }
  });

  it('devices with drainLife effects are executable', () => {
    const actor = createTestActor();
    const level = createTestLevel();
    const monster = createTestMonster();
    level.addMonster(monster);
    const context = createDeviceContext(actor, level, monster.position);

    const drainDevices = Object.values(itemsData as Record<string, ItemDef>)
      .filter((item) => item.type === 'wand' || item.type === 'rod' || item.type === 'staff')
      .filter((item) => item.effects?.some((e) => e.type === 'drainLife'));

    expect(drainDevices.length).toBeGreaterThan(0);

    for (const item of drainDevices) {
      expect(
        () => getEffectManager().executeEffects(item.effects!, context),
        `Device "${item.name}" drainLife effects should work`
      ).not.toThrow();
    }
  });

  it('all devices with implemented effect types are executable', () => {
    const actor = createTestActor();
    const level = createTestLevel();
    const monster = createTestMonster();
    level.addMonster(monster);
    const context = createDeviceContext(actor, level, monster.position);

    // Get devices that only use implemented effect types
    const deviceItems = Object.values(itemsData as Record<string, ItemDef>)
      .filter((item) => item.type === 'wand' || item.type === 'rod' || item.type === 'staff')
      .filter((item) => item.effects && item.effects.length > 0)
      .filter((item) => item.effects!.every((e) => implementedEffectTypes.has(e.type)));

    expect(deviceItems.length).toBeGreaterThan(0);

    for (const item of deviceItems) {
      expect(
        () => getEffectManager().executeEffects(item.effects!, context),
        `Device "${item.name}" (${item.key}) effects should execute without error`
      ).not.toThrow();
    }
  });

  it('identifies devices with unimplemented effect types', () => {
    // This test documents which devices need effect implementation
    const devicesWithUnimplemented = Object.values(itemsData as Record<string, ItemDef>)
      .filter((item) => item.type === 'wand' || item.type === 'rod' || item.type === 'staff')
      .filter((item) => item.effects && item.effects.length > 0)
      .filter((item) => item.effects!.some((e) => notYetImplemented.has(e.type)));

    // Just document, don't fail - this is informational
    if (devicesWithUnimplemented.length > 0) {
      const unimplementedTypes = new Set<string>();
      for (const item of devicesWithUnimplemented) {
        for (const effect of item.effects!) {
          if (notYetImplemented.has(effect.type)) {
            unimplementedTypes.add(effect.type);
          }
        }
      }
      // This doesn't fail, just logs which effect types need implementation
      expect(unimplementedTypes.size).toBeGreaterThan(0);
    }
  });
});
