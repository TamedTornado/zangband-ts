import { describe, it, expect, beforeEach } from 'vitest';
import { createTestActor } from './testHelpers';
import { RNG } from 'rot-js';
import type { Actor } from '@/core/entities/Actor';
import { Level } from '@/core/world/Level';
import { rollDiceExpression, getEffectManager, type GPEffectDef, type GPEffectContext } from '@/core/systems/effects';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import itemsData from '@/data/items/items.json';
import type { ItemDef } from '@/core/data/items';

// Load data before tests
beforeEach(() => {
  loadStatusDefs(statusesData);
});

// Helper to create a test actor
function makeTestActor(hp = 100): Actor {
  return createTestActor({
    id: 'test-actor',
    position: { x: 0, y: 0 },
    symbol: '@',
    color: '#fff',
    maxHp: hp,
    speed: 110,
  });
}

// Helper to create minimal effect context
function createTestContext(actor: Actor): GPEffectContext {
  return {
    actor,
    level: new Level(10, 10),
    rng: RNG,
  };
}

// Helper to execute effects with minimal context
function executeEffects(effects: GPEffectDef[], actor: Actor) {
  const context = createTestContext(actor);
  return getEffectManager().executeEffects(effects, context);
}

// Helper to get item by key
function getItem(key: string): ItemDef {
  return (itemsData as Record<string, ItemDef>)[key];
}

describe('rollDiceExpression', () => {
  it('parses constant value', () => {
    const result = rollDiceExpression('50', RNG);
    expect(result).toBe(50);
  });

  it('rolls simple dice expression', () => {
    // 1d1 always returns 1
    const result = rollDiceExpression('1d1', RNG);
    expect(result).toBe(1);
  });

  it('rolls dice with bonus', () => {
    // 1d1+5 always returns 6
    const result = rollDiceExpression('1d1+5', RNG);
    expect(result).toBe(6);
  });

  it('parses base + dice format', () => {
    // 10+1d1 = 10 + 1 = 11
    const result = rollDiceExpression('10+1d1', RNG);
    expect(result).toBe(11);
  });

  it('rolls multiple dice', () => {
    // 3d1 = 3
    const result = rollDiceExpression('3d1', RNG);
    expect(result).toBe(3);
  });

  it('handles base + multiple dice', () => {
    // 15+2d1 = 15 + 2 = 17
    const result = rollDiceExpression('15+2d1', RNG);
    expect(result).toBe(17);
  });
});

describe('GPEffect - heal', () => {
  it('heals fixed amount', () => {
    const actor = makeTestActor(100);
    actor.takeDamage(50);
    expect(actor.hp).toBe(50);

    const effects: GPEffectDef[] = [{ type: 'heal', amount: 30 }];
    const result = executeEffects(effects, actor);

    expect(actor.hp).toBe(80);
    expect(result.messages.some(m => m.includes('+30 HP'))).toBe(true);
  });

  it('heals dice amount', () => {
    const actor = makeTestActor(100);
    actor.takeDamage(50);

    // 2d1 = 2
    const effects: GPEffectDef[] = [{ type: 'heal', dice: '2d1' }];
    executeEffects(effects, actor);

    expect(actor.hp).toBe(52);
  });

  it('does not overheal', () => {
    const actor = makeTestActor(100);
    actor.takeDamage(10);
    expect(actor.hp).toBe(90);

    const effects: GPEffectDef[] = [{ type: 'heal', amount: 50 }];
    executeEffects(effects, actor);

    expect(actor.hp).toBe(100);
  });
});

describe('GPEffect - applyStatus', () => {
  it('applies duration status', () => {
    const actor = makeTestActor();

    const effects: GPEffectDef[] = [
      { type: 'applyStatus', status: 'haste', duration: '10' },
    ];
    const result = executeEffects(effects, actor);

    expect(actor.statuses.has('haste')).toBe(true);
    expect(result.messages.some(m => m.includes('faster'))).toBe(true);
  });

  it('applies status with dice duration', () => {
    const actor = makeTestActor();

    // 10+1d1 = 11
    const effects: GPEffectDef[] = [
      { type: 'applyStatus', status: 'heroism', duration: '10+1d1' },
    ];
    executeEffects(effects, actor);

    expect(actor.statuses.has('heroism')).toBe(true);
  });

  it('applies poison with duration and damage', () => {
    const actor = makeTestActor();

    const effects: GPEffectDef[] = [
      { type: 'applyStatus', status: 'poisoned', duration: '5', damage: 3 },
    ];
    executeEffects(effects, actor);

    expect(actor.statuses.has('poisoned')).toBe(true);
  });

  it('applies multiple statuses', () => {
    const actor = makeTestActor();

    const effects: GPEffectDef[] = [
      { type: 'applyStatus', status: 'haste', duration: '10' },
      { type: 'applyStatus', status: 'heroism', duration: '10' },
    ];
    executeEffects(effects, actor);

    expect(actor.statuses.has('haste')).toBe(true);
    expect(actor.statuses.has('heroism')).toBe(true);
  });
});

describe('GPEffect - cure', () => {
  it('cures existing status', () => {
    const actor = makeTestActor();

    // First apply blind
    executeEffects(
      [{ type: 'applyStatus', status: 'blind', duration: '100' }],
      actor
    );
    expect(actor.statuses.has('blind')).toBe(true);

    // Now cure it
    executeEffects([{ type: 'cure', status: 'blind' }], actor);

    expect(actor.statuses.has('blind')).toBe(false);
  });

  it('does nothing if status not present', () => {
    const actor = makeTestActor();
    expect(actor.statuses.has('blind')).toBe(false);

    const result = executeEffects([{ type: 'cure', status: 'blind' }], actor);

    // No error, just no effect
    expect(result.success).toBe(true);
  });
});

describe('GPEffect - reduce', () => {
  it('reduces cut intensity', () => {
    const actor = makeTestActor();

    // Apply a cut with intensity 100
    executeEffects(
      [{ type: 'applyStatus', status: 'cut', intensity: '100' }],
      actor
    );
    expect(actor.statuses.has('cut')).toBe(true);

    // Reduce by 30
    executeEffects(
      [{ type: 'reduce', status: 'cut', amount: 30 }],
      actor
    );

    expect(actor.statuses.has('cut')).toBe(true); // Still has cut
  });

  it('removes status when reduced to zero', () => {
    const actor = makeTestActor();

    // Apply a cut with intensity 50
    executeEffects(
      [{ type: 'applyStatus', status: 'cut', intensity: '50' }],
      actor
    );

    // Reduce by 100 (more than intensity)
    const result = executeEffects(
      [{ type: 'reduce', status: 'cut', amount: 100 }],
      actor
    );

    expect(actor.statuses.has('cut')).toBe(false);
    expect(result.messages.some(m => m.includes('no longer bleeding'))).toBe(true);
  });
});

describe('GPEffect - combined', () => {
  it('executes heal + cure combo (Cure Serious Wounds)', () => {
    const actor = makeTestActor(100);
    actor.takeDamage(50);

    // Apply blind and confused
    executeEffects(
      [
        { type: 'applyStatus', status: 'blind', duration: '100' },
        { type: 'applyStatus', status: 'confused', duration: '100' },
      ],
      actor
    );

    // Cure Serious Wounds: heal + cure blind + cure confused
    const effects: GPEffectDef[] = [
      { type: 'heal', dice: '4d1' }, // 4 HP
      { type: 'cure', status: 'blind' },
      { type: 'cure', status: 'confused' },
    ];
    executeEffects(effects, actor);

    expect(actor.hp).toBe(54);
    expect(actor.statuses.has('blind')).toBe(false);
    expect(actor.statuses.has('confused')).toBe(false);
  });

  it('executes status + cure combo (Heroism)', () => {
    const actor = makeTestActor();

    // Apply afraid first
    executeEffects(
      [{ type: 'applyStatus', status: 'afraid', duration: '100' }],
      actor
    );
    expect(actor.statuses.has('afraid')).toBe(true);

    // Heroism: apply heroism + cure afraid
    const effects: GPEffectDef[] = [
      { type: 'applyStatus', status: 'heroism', duration: '25' },
      { type: 'cure', status: 'afraid' },
    ];
    executeEffects(effects, actor);

    expect(actor.statuses.has('heroism')).toBe(true);
    expect(actor.statuses.has('afraid')).toBe(false);
  });
});

describe('GPEffect - unknown type', () => {
  it('throws error for unknown effect type', () => {
    const actor = makeTestActor();

    const effects: GPEffectDef[] = [{ type: 'unknown_effect' }];

    expect(() => executeEffects(effects, actor)).toThrow('Unknown GPEffect type: unknown_effect');
  });
});

describe('Item effects', () => {
  it('Cure Light Wounds potion has heal + reduce cut effects', () => {
    const item = getItem('potion_of_cure_light_wounds');
    expect(item).toBeDefined();
    expect(item.effects).toBeDefined();
    expect(item.effects!.length).toBe(2);

    const heal = item.effects!.find((e) => e.type === 'heal');
    expect(heal).toBeDefined();
    expect(heal!['dice']).toBe('2d8');

    const reduce = item.effects!.find((e) => e.type === 'reduce');
    expect(reduce).toBeDefined();
    expect(reduce!['status']).toBe('cut');
  });

  it('Speed potion has haste effect', () => {
    const item = getItem('potion_of_speed');
    expect(item).toBeDefined();
    expect(item.effects).toBeDefined();
    expect(item.effects![0].type).toBe('applyStatus');
    expect(item.effects![0]['status']).toBe('haste');
  });

  it('Resistance potion applies all oppose statuses', () => {
    const item = getItem('potion_of_resistance');
    expect(item).toBeDefined();
    expect(item.effects).toBeDefined();
    expect(item.effects!.length).toBe(5);

    const statuses = item.effects!.map((e) => e['status']);
    expect(statuses).toContain('oppose_acid');
    expect(statuses).toContain('oppose_elec');
    expect(statuses).toContain('oppose_fire');
    expect(statuses).toContain('oppose_cold');
    expect(statuses).toContain('oppose_pois');
  });

  it('Cure Poison food has cure effect', () => {
    const item = getItem('cure_poison');
    expect(item).toBeDefined();
    expect(item.effects).toBeDefined();
    expect(item.effects![0].type).toBe('cure');
    expect(item.effects![0]['status']).toBe('poisoned');
  });

  it('Blindness food applies blind status', () => {
    const item = getItem('food_blindness');
    expect(item).toBeDefined();
    expect(item.effects).toBeDefined();
    expect(item.effects![0].type).toBe('applyStatus');
    expect(item.effects![0]['status']).toBe('blind');
  });
});

describe('Integration: item effects on actor', () => {
  it('Cure Light Wounds heals and reduces cut', () => {
    const actor = makeTestActor(100);
    actor.takeDamage(30);

    // Apply a cut
    executeEffects(
      [{ type: 'applyStatus', status: 'cut', intensity: '50' }],
      actor
    );

    // Use Cure Light Wounds effects
    const item = getItem('potion_of_cure_light_wounds');
    executeEffects(item.effects! as GPEffectDef[], actor);

    expect(actor.hp).toBeGreaterThan(70); // Healed some
  });

  it('Speed potion applies haste', () => {
    const actor = makeTestActor();
    expect(actor.statuses.has('haste')).toBe(false);

    const item = getItem('potion_of_speed');
    executeEffects(item.effects! as GPEffectDef[], actor);

    expect(actor.statuses.has('haste')).toBe(true);
    expect(actor.speed).toBe(120); // Base 110 + 10 from haste
  });

  it('Neutralize Poison cures poison', () => {
    const actor = makeTestActor();

    // Apply poison
    executeEffects(
      [{ type: 'applyStatus', status: 'poisoned', duration: '10', damage: 5 }],
      actor
    );
    expect(actor.statuses.has('poisoned')).toBe(true);

    // Use Neutralize Poison
    const item = getItem('neutralize_poison');
    executeEffects(item.effects! as GPEffectDef[], actor);

    expect(actor.statuses.has('poisoned')).toBe(false);
  });

  it('Slowness potion applies slow', () => {
    const actor = makeTestActor();
    expect(actor.speed).toBe(110);

    const item = getItem('potion_of_slowness');
    executeEffects(item.effects! as GPEffectDef[], actor);

    expect(actor.statuses.has('slow')).toBe(true);
    expect(actor.speed).toBe(100); // 110 - 10
  });

  it('Elvish Waybread heals and cures poison', () => {
    const actor = makeTestActor(100);
    actor.takeDamage(50);

    // Apply poison
    executeEffects(
      [{ type: 'applyStatus', status: 'poisoned', duration: '10', damage: 5 }],
      actor
    );

    const item = getItem('piece_of_elvish_waybread');
    executeEffects(item.effects! as GPEffectDef[], actor);

    expect(actor.hp).toBeGreaterThan(50);
    expect(actor.statuses.has('poisoned')).toBe(false);
  });
});
