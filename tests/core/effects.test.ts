import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { Actor } from '@/core/entities/Actor';
import {
  rollDiceExpression,
  executeEffects,
  type Effect,
} from '@/core/systems/effects/EffectExecutor';
import {
  loadPotionDefs,
  getPotionEffects,
  getPotionDef,
  hasPotionEffects,
} from '@/core/systems/effects/PotionEffects';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import potionsData from '@/data/potions.json';

// Load data before tests
beforeEach(() => {
  loadStatusDefs(statusesData);
});

// Helper to create a test actor
function createTestActor(hp = 100): Actor {
  return new Actor({
    id: 'test-actor',
    position: { x: 0, y: 0 },
    symbol: '@',
    color: '#fff',
    maxHp: hp,
    speed: 110,
  });
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

describe('executeEffects - heal', () => {
  it('heals fixed amount', () => {
    const actor = createTestActor(100);
    actor.takeDamage(50);
    expect(actor.hp).toBe(50);

    const effects: Effect[] = [{ type: 'heal', amount: 30 }];
    const result = executeEffects(effects, actor, RNG);

    expect(actor.hp).toBe(80);
    expect(result.healed).toBe(30);
    expect(result.messages.some(m => m.includes('+30 HP'))).toBe(true);
  });

  it('heals dice amount', () => {
    const actor = createTestActor(100);
    actor.takeDamage(50);

    // 2d1 = 2
    const effects: Effect[] = [{ type: 'heal', dice: '2d1' }];
    const result = executeEffects(effects, actor, RNG);

    expect(actor.hp).toBe(52);
    expect(result.healed).toBe(2);
  });

  it('does not overheal', () => {
    const actor = createTestActor(100);
    actor.takeDamage(10);
    expect(actor.hp).toBe(90);

    const effects: Effect[] = [{ type: 'heal', amount: 50 }];
    const result = executeEffects(effects, actor, RNG);

    expect(actor.hp).toBe(100);
    expect(result.healed).toBe(10); // Only healed 10, not 50
  });

  it('no message when no healing needed', () => {
    const actor = createTestActor(100);
    // At full HP

    const effects: Effect[] = [{ type: 'heal', amount: 50 }];
    const result = executeEffects(effects, actor, RNG);

    expect(actor.hp).toBe(100);
    expect(result.healed).toBe(0);
    expect(result.messages.length).toBe(0);
  });
});

describe('executeEffects - applyStatus', () => {
  it('applies duration status', () => {
    const actor = createTestActor();

    const effects: Effect[] = [
      { type: 'applyStatus', status: 'haste', duration: '10' },
    ];
    const result = executeEffects(effects, actor, RNG);

    expect(actor.statuses.has('haste')).toBe(true);
    expect(result.statusesApplied).toContain('haste');
    expect(result.messages.some(m => m.includes('faster'))).toBe(true);
  });

  it('applies status with dice duration', () => {
    const actor = createTestActor();

    // 10+1d1 = 11
    const effects: Effect[] = [
      { type: 'applyStatus', status: 'heroism', duration: '10+1d1' },
    ];
    executeEffects(effects, actor, RNG);

    expect(actor.statuses.has('heroism')).toBe(true);
  });

  it('applies poison with duration and damage', () => {
    const actor = createTestActor();

    const effects: Effect[] = [
      { type: 'applyStatus', status: 'poisoned', duration: '5', damage: 3 },
    ];
    const result = executeEffects(effects, actor, RNG);

    expect(actor.statuses.has('poisoned')).toBe(true);
    expect(result.statusesApplied).toContain('poisoned');
  });

  it('applies multiple statuses', () => {
    const actor = createTestActor();

    const effects: Effect[] = [
      { type: 'applyStatus', status: 'haste', duration: '10' },
      { type: 'applyStatus', status: 'heroism', duration: '10' },
    ];
    const result = executeEffects(effects, actor, RNG);

    expect(actor.statuses.has('haste')).toBe(true);
    expect(actor.statuses.has('heroism')).toBe(true);
    expect(result.statusesApplied).toContain('haste');
    expect(result.statusesApplied).toContain('heroism');
  });
});

describe('executeEffects - cure', () => {
  it('cures existing status', () => {
    const actor = createTestActor();

    // First apply blind
    executeEffects(
      [{ type: 'applyStatus', status: 'blind', duration: '100' }],
      actor,
      RNG
    );
    expect(actor.statuses.has('blind')).toBe(true);

    // Now cure it
    const result = executeEffects([{ type: 'cure', status: 'blind' }], actor, RNG);

    expect(actor.statuses.has('blind')).toBe(false);
    expect(result.statusesCured).toContain('blind');
  });

  it('does nothing if status not present', () => {
    const actor = createTestActor();
    expect(actor.statuses.has('blind')).toBe(false);

    const result = executeEffects([{ type: 'cure', status: 'blind' }], actor, RNG);

    expect(result.statusesCured).not.toContain('blind');
    expect(result.messages.length).toBe(0);
  });
});

describe('executeEffects - reduce', () => {
  it('reduces cut intensity', () => {
    const actor = createTestActor();

    // Apply a cut with intensity 100
    executeEffects(
      [{ type: 'applyStatus', status: 'cut', intensity: '100' }],
      actor,
      RNG
    );
    expect(actor.statuses.has('cut')).toBe(true);

    // Reduce by 30
    const result = executeEffects(
      [{ type: 'reduce', status: 'cut', amount: 30 }],
      actor,
      RNG
    );

    expect(actor.statuses.has('cut')).toBe(true); // Still has cut
    expect(result.statusesReduced).toContain('cut');
  });

  it('removes status when reduced to zero', () => {
    const actor = createTestActor();

    // Apply a cut with intensity 50
    executeEffects(
      [{ type: 'applyStatus', status: 'cut', intensity: '50' }],
      actor,
      RNG
    );

    // Reduce by 100 (more than intensity)
    const result = executeEffects(
      [{ type: 'reduce', status: 'cut', amount: 100 }],
      actor,
      RNG
    );

    expect(actor.statuses.has('cut')).toBe(false);
    expect(result.messages.some(m => m.includes('no longer bleeding'))).toBe(true);
  });
});

describe('executeEffects - combined', () => {
  it('executes heal + cure combo (Cure Serious Wounds)', () => {
    const actor = createTestActor(100);
    actor.takeDamage(50);

    // Apply blind and confused
    executeEffects(
      [
        { type: 'applyStatus', status: 'blind', duration: '100' },
        { type: 'applyStatus', status: 'confused', duration: '100' },
      ],
      actor,
      RNG
    );

    // Cure Serious Wounds: heal + cure blind + cure confused
    const effects: Effect[] = [
      { type: 'heal', dice: '4d1' }, // 4 HP
      { type: 'cure', status: 'blind' },
      { type: 'cure', status: 'confused' },
    ];
    const result = executeEffects(effects, actor, RNG);

    expect(actor.hp).toBe(54);
    expect(actor.statuses.has('blind')).toBe(false);
    expect(actor.statuses.has('confused')).toBe(false);
    expect(result.healed).toBe(4);
    expect(result.statusesCured).toContain('blind');
    expect(result.statusesCured).toContain('confused');
  });

  it('executes status + cure combo (Heroism)', () => {
    const actor = createTestActor();

    // Apply afraid first
    executeEffects(
      [{ type: 'applyStatus', status: 'afraid', duration: '100' }],
      actor,
      RNG
    );
    expect(actor.statuses.has('afraid')).toBe(true);

    // Heroism: apply heroism + cure afraid
    const effects: Effect[] = [
      { type: 'applyStatus', status: 'heroism', duration: '25' },
      { type: 'cure', status: 'afraid' },
    ];
    const result = executeEffects(effects, actor, RNG);

    expect(actor.statuses.has('heroism')).toBe(true);
    expect(actor.statuses.has('afraid')).toBe(false);
    expect(result.statusesApplied).toContain('heroism');
    expect(result.statusesCured).toContain('afraid');
  });
});

describe('executeEffects - unknown type', () => {
  it('reports unknown effect type', () => {
    const actor = createTestActor();

    const effects: Effect[] = [{ type: 'unknown_effect' }];
    const result = executeEffects(effects, actor, RNG);

    expect(result.messages).toContain('Unknown effect type: unknown_effect');
  });
});

describe('PotionEffects', () => {
  it('loads potion definitions', () => {
    expect(hasPotionEffects(34)).toBe(true); // Cure Light Wounds
    expect(hasPotionEffects(29)).toBe(true); // Speed
  });

  it('returns undefined for unknown sval', () => {
    expect(getPotionEffects(9999)).toBeUndefined();
  });

  it('gets potion effects by sval', () => {
    const effects = getPotionEffects(34); // Cure Light Wounds
    expect(effects).toBeDefined();
    expect(effects!.length).toBeGreaterThan(0);
    expect(effects![0].type).toBe('heal');
  });

  it('gets potion def by sval', () => {
    const def = getPotionDef(29); // Speed
    expect(def).toBeDefined();
    expect(def!.name).toBe('Speed');
    expect(def!.effects.length).toBe(1);
    expect(def!.effects[0].type).toBe('applyStatus');
    expect(def!.effects[0].status).toBe('haste');
  });

  it('Cure Light Wounds has heal + reduce cut', () => {
    const effects = getPotionEffects(34);
    expect(effects).toBeDefined();

    const heal = effects!.find(e => e.type === 'heal');
    expect(heal).toBeDefined();
    expect(heal!.dice).toBe('2d8');

    const reduce = effects!.find(e => e.type === 'reduce');
    expect(reduce).toBeDefined();
    expect(reduce!.status).toBe('cut');
    expect(reduce!.amount).toBe(10);
  });

  it('Resistance potion applies all oppose statuses', () => {
    const effects = getPotionEffects(60); // Resistance
    expect(effects).toBeDefined();
    expect(effects!.length).toBe(5);

    const statuses = effects!.map(e => e.status);
    expect(statuses).toContain('oppose_acid');
    expect(statuses).toContain('oppose_elec');
    expect(statuses).toContain('oppose_fire');
    expect(statuses).toContain('oppose_cold');
    expect(statuses).toContain('oppose_pois');
  });
});

describe('Integration: potion effects on actor', () => {
  it('Cure Light Wounds heals and reduces cut', () => {
    const actor = createTestActor(100);
    actor.takeDamage(30);

    // Apply a cut
    executeEffects(
      [{ type: 'applyStatus', status: 'cut', intensity: '50' }],
      actor,
      RNG
    );

    // Use Cure Light Wounds
    const effects = getPotionEffects(34)!;
    const result = executeEffects(effects, actor, RNG);

    expect(actor.hp).toBeGreaterThan(70); // Healed some
    expect(result.healed).toBeGreaterThan(0);
    expect(result.statusesReduced).toContain('cut');
  });

  it('Speed potion applies haste', () => {
    const actor = createTestActor();
    expect(actor.statuses.has('haste')).toBe(false);

    const effects = getPotionEffects(29)!;
    executeEffects(effects, actor, RNG);

    expect(actor.statuses.has('haste')).toBe(true);
    expect(actor.speed).toBe(120); // Base 110 + 10 from haste
  });

  it('Neutralize Poison cures poison', () => {
    const actor = createTestActor();

    // Apply poison
    executeEffects(
      [{ type: 'applyStatus', status: 'poisoned', duration: '10', damage: 5 }],
      actor,
      RNG
    );
    expect(actor.statuses.has('poisoned')).toBe(true);

    // Use Neutralize Poison
    const effects = getPotionEffects(27)!;
    executeEffects(effects, actor, RNG);

    expect(actor.statuses.has('poisoned')).toBe(false);
  });

  it('Slowness potion applies slow', () => {
    const actor = createTestActor();
    expect(actor.speed).toBe(110);

    const effects = getPotionEffects(4)!; // Slowness
    executeEffects(effects, actor, RNG);

    expect(actor.statuses.has('slow')).toBe(true);
    expect(actor.speed).toBe(100); // 110 - 10
  });
});
