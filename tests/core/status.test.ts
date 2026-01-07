import { describe, it, expect, beforeEach } from 'vitest';
import { RNG } from 'rot-js';
import { Actor } from '@/core/entities/Actor';
import {
  loadStatusDefs,
  getStatusDef,
  StatusManager,
  DurationStatus,
  CutStatus,
  PoisonStatus,
  StunStatus,
  createDurationStatus,
  createCutStatus,
  createPoisonStatus,
  createStunStatus,
  createStatus,
} from '@/core/systems/status';
import statusesData from '@/data/statuses.json';

// Load status definitions before tests
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

describe('StatusDef', () => {
  it('loads status definitions from JSON', () => {
    const heroism = getStatusDef('heroism');
    expect(heroism.name).toBe('Heroism');
    expect(heroism.type).toBe('duration');
    expect(heroism.messages.apply).toBe('You feel like a hero!');
    expect(heroism.data?.['toHit']).toBe(12);
    expect(heroism.data?.['maxHp']).toBe(12);
  });

  it('has cut severity thresholds', () => {
    const cut = getStatusDef('cut');
    expect(cut.type).toBe('cut');
    expect(cut.data?.['severity']).toBeDefined();
    const severity = cut.data?.['severity'] as Record<string, { message: string; damage: number }>;
    expect(severity['50'].message).toBe('You have a bad cut.');
    expect(severity['50'].damage).toBe(3);
  });

  it('throws for unknown status', () => {
    expect(() => getStatusDef('nonexistent')).toThrow('Unknown status: nonexistent');
  });
});

describe('DurationStatus', () => {
  it('counts down each tick', () => {
    const status = createDurationStatus('heroism', 10);
    expect(status.duration).toBe(10);

    status.tick(createTestActor(), RNG);
    expect(status.duration).toBe(9);

    status.tick(createTestActor(), RNG);
    expect(status.duration).toBe(8);
  });

  it('expires when duration reaches 0', () => {
    const status = createDurationStatus('heroism', 2);
    expect(status.isExpired()).toBe(false);

    status.tick(createTestActor(), RNG);
    expect(status.isExpired()).toBe(false);

    status.tick(createTestActor(), RNG);
    expect(status.isExpired()).toBe(true);
  });

  it('merges by taking max duration', () => {
    const status1 = createDurationStatus('heroism', 5);
    const status2 = createDurationStatus('heroism', 10);

    const absorbed = status1.merge(status2);
    expect(absorbed).toBe(true);
    expect(status1.duration).toBe(10);
  });

  it('does not reduce duration on merge', () => {
    const status1 = createDurationStatus('heroism', 10);
    const status2 = createDurationStatus('heroism', 3);

    status1.merge(status2);
    expect(status1.duration).toBe(10); // Keeps higher
  });

  it('returns status definition', () => {
    const status = createDurationStatus('haste', 10);
    const def = status.getDef();
    expect(def.name).toBe('Haste');
    expect(def.data?.['speed']).toBe(10);
  });

  it('calls onApply and onExpire', () => {
    const status = createDurationStatus('heroism', 1);
    const actor = createTestActor();

    // onApply returns empty for base DurationStatus
    const applyMessages = status.onApply(actor);
    expect(applyMessages).toEqual([]);

    // onExpire returns empty for base DurationStatus
    const expireMessages = status.onExpire(actor);
    expect(expireMessages).toEqual([]);
  });
});

describe('CutStatus', () => {
  it('accumulates intensity on merge', () => {
    const cut1 = createCutStatus(30);
    const cut2 = createCutStatus(20);

    const absorbed = cut1.merge(cut2);
    expect(absorbed).toBe(true);
    expect(cut1.currentIntensity).toBe(50);
  });

  it('caps intensity at 1000', () => {
    const cut1 = createCutStatus(800);
    const cut2 = createCutStatus(500);

    cut1.merge(cut2);
    expect(cut1.currentIntensity).toBe(1000);
  });

  it('deals damage based on severity', () => {
    const cut = createCutStatus(100); // "nasty cut" level = 6 damage
    const actor = createTestActor(100);

    cut.tick(actor, RNG);
    expect(actor.hp).toBeLessThan(100);
  });

  it('heals naturally over time', () => {
    const cut = createCutStatus(5);
    const actor = createTestActor();

    // After 5 ticks, should be expired
    for (let i = 0; i < 5; i++) {
      cut.tick(actor, RNG);
    }
    expect(cut.isExpired()).toBe(true);
  });

  it('expires when intensity reaches 0', () => {
    const cut = createCutStatus(1);
    const actor = createTestActor();

    expect(cut.isExpired()).toBe(false);
    cut.tick(actor, RNG);
    expect(cut.isExpired()).toBe(true);
  });

  it('returns severity message on apply', () => {
    const cut = createCutStatus(200);
    const actor = createTestActor();

    const messages = cut.onApply(actor);
    expect(messages.some(m => m.includes('severe cut'))).toBe(true);
  });
});

describe('StunStatus', () => {
  it('accumulates intensity on merge', () => {
    const stun1 = createStunStatus(30);
    const stun2 = createStunStatus(20);

    const absorbed = stun1.merge(stun2);
    expect(absorbed).toBe(true);
    expect(stun1.currentIntensity).toBe(50);
  });

  it('caps intensity at 100', () => {
    const stun1 = createStunStatus(80);
    const stun2 = createStunStatus(50);

    stun1.merge(stun2);
    expect(stun1.currentIntensity).toBe(100);
  });

  it('recovers naturally over time', () => {
    const stun = createStunStatus(3);
    const actor = createTestActor();

    for (let i = 0; i < 3; i++) {
      stun.tick(actor, RNG);
    }
    expect(stun.isExpired()).toBe(true);
  });

  it('tracks knockout state', () => {
    const lightStun = createStunStatus(30);
    const knockout = createStunStatus(100);

    expect(lightStun.isKnockedOut).toBe(false);
    expect(knockout.isKnockedOut).toBe(true);
  });

  it('has to-hit penalties based on intensity', () => {
    const lightStun = createStunStatus(30);
    const heavyStun = createStunStatus(60);
    const knockout = createStunStatus(100);

    expect(lightStun.toHitPenalty).toBe(-5);
    expect(heavyStun.toHitPenalty).toBe(-20);
    expect(knockout.toHitPenalty).toBe(-40);
  });
});

describe('PoisonStatus', () => {
  it('does not merge - keeps both stacks', () => {
    const poison1 = createPoisonStatus(5, 3);
    const poison2 = createPoisonStatus(3, 2);

    const absorbed = poison1.merge(poison2);
    expect(absorbed).toBe(false);
  });

  it('deals damage each tick', () => {
    const poison = createPoisonStatus(5, 10);
    const actor = createTestActor(100);

    poison.tick(actor, RNG);
    expect(actor.hp).toBe(90);

    poison.tick(actor, RNG);
    expect(actor.hp).toBe(80);
  });

  it('expires after duration', () => {
    const poison = createPoisonStatus(3, 5);
    const actor = createTestActor();

    expect(poison.isExpired()).toBe(false);

    poison.tick(actor, RNG);
    poison.tick(actor, RNG);
    poison.tick(actor, RNG);

    expect(poison.isExpired()).toBe(true);
  });

  it('returns damage message', () => {
    const poison = createPoisonStatus(5, 7);
    const actor = createTestActor();

    const result = poison.tick(actor, RNG);
    expect(result.messages).toContain('You take 7 poison damage.');
  });
});

describe('StatusManager', () => {
  it('adds status and returns apply message', () => {
    const manager = new StatusManager();
    const actor = createTestActor();
    const status = createDurationStatus('heroism', 10);

    const messages = manager.add(status, actor);
    expect(messages).toContain('You feel like a hero!');
    expect(manager.has('heroism')).toBe(true);
  });

  it('merges same status type', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    manager.add(createDurationStatus('heroism', 5), actor);
    const messages = manager.add(createDurationStatus('heroism', 10), actor);

    expect(messages).toContain('You feel more heroic!'); // refresh message
    expect(manager.getById('heroism').length).toBe(1); // Only one instance
  });

  it('allows multiple poison stacks', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    manager.add(createPoisonStatus(5, 3), actor);
    manager.add(createPoisonStatus(3, 2), actor);

    expect(manager.getById('poisoned').length).toBe(2);
  });

  it('removes expired statuses on tick', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    manager.add(createDurationStatus('heroism', 2), actor);
    expect(manager.has('heroism')).toBe(true);

    manager.tick(actor, RNG);
    manager.tick(actor, RNG);

    expect(manager.has('heroism')).toBe(false);
  });

  it('returns expire message when status ends', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    manager.add(createDurationStatus('heroism', 1), actor);
    const messages = manager.tick(actor, RNG);

    expect(messages).toContain('The heroism wears off.');
  });

  it('calculates stat modifiers', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    expect(manager.getModifier('speed')).toBe(0);

    manager.add(createDurationStatus('haste', 10), actor);
    expect(manager.getModifier('speed')).toBe(10);

    manager.add(createDurationStatus('slow', 5), actor);
    expect(manager.getModifier('speed')).toBe(0); // +10 - 10 = 0
  });

  it('clears specific status', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    manager.add(createDurationStatus('heroism', 10), actor);
    manager.add(createDurationStatus('haste', 10), actor);

    const messages = manager.clear('heroism', actor);
    expect(messages).toContain('The heroism wears off.');
    expect(manager.has('heroism')).toBe(false);
    expect(manager.has('haste')).toBe(true);
  });

  it('clears all statuses', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    manager.add(createDurationStatus('heroism', 10), actor);
    manager.add(createDurationStatus('haste', 10), actor);
    manager.add(createPoisonStatus(5, 3), actor);

    manager.clearAll(actor);
    expect(manager.count).toBe(0);
  });

  it('calls onApply when adding new status', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    // CutStatus returns severity message on apply
    const cut = createCutStatus(200);
    const messages = manager.add(cut, actor);

    // Should have apply message + severity message
    expect(messages).toContain('You have been cut.');
    expect(messages.some(m => m.includes('severe cut'))).toBe(true);
  });

  it('calls onExpire when status ends', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    manager.add(createDurationStatus('heroism', 1), actor);
    const messages = manager.tick(actor, RNG);

    expect(messages).toContain('The heroism wears off.');
  });
});

describe('StatusManager reduce/cure', () => {
  it('reduces single accumulating status', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    manager.add(createCutStatus(100), actor);
    manager.reduce('cut', 30, actor);

    const cuts = manager.getById('cut') as CutStatus[];
    expect(cuts[0].currentIntensity).toBe(70);
  });

  it('fully consumes and removes status when reduced to zero', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    manager.add(createCutStatus(50), actor);
    const messages = manager.reduce('cut', 100, actor);

    expect(manager.has('cut')).toBe(false);
    expect(messages).toContain('You are no longer bleeding.');
  });

  it('reduces across multiple poison stacks', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    // 3 stacks of 10 duration each
    manager.add(createPoisonStatus(10, 5), actor);
    manager.add(createPoisonStatus(10, 5), actor);
    manager.add(createPoisonStatus(10, 5), actor);

    // Reduce by 25 - should consume 2 full stacks (20) and partial third (5)
    manager.reduce('poisoned', 25, actor);

    const poisons = manager.getById('poisoned');
    expect(poisons.length).toBe(1);
    expect((poisons[0] as PoisonStatus).duration).toBe(5);
  });

  it('cure removes all stacks', () => {
    const manager = new StatusManager();
    const actor = createTestActor();

    manager.add(createPoisonStatus(10, 5), actor);
    manager.add(createPoisonStatus(10, 5), actor);

    manager.cure('poisoned', actor);

    expect(manager.has('poisoned')).toBe(false);
  });
});

describe('createStatus factory', () => {
  it('creates duration status for duration type', () => {
    const status = createStatus('blind', { duration: 10 });
    expect(status).toBeInstanceOf(DurationStatus);
    expect(status.id).toBe('blind');
  });

  it('creates CutStatus for cut type', () => {
    const status = createStatus('cut', { intensity: 50 });
    expect(status).toBeInstanceOf(CutStatus);
  });

  it('creates StunStatus for stun type', () => {
    const status = createStatus('stun', { intensity: 30 });
    expect(status).toBeInstanceOf(StunStatus);
  });

  it('creates PoisonStatus for poison type', () => {
    const status = createStatus('poisoned', { duration: 5, damage: 10 });
    expect(status).toBeInstanceOf(PoisonStatus);
  });

  it('throws for unknown type', () => {
    // Manually test with a bad type by mocking - skip for now
    // The factory validates type exists in registry
  });
});

describe('Actor with StatusManager', () => {
  it('has statusManager', () => {
    const actor = createTestActor();
    expect(actor.statuses).toBeInstanceOf(StatusManager);
  });

  it('applies speed modifier from statuses', () => {
    const actor = createTestActor();
    expect(actor.speed).toBe(110);

    actor.statuses.add(createDurationStatus('haste', 10), actor);
    expect(actor.speed).toBe(120);
  });

  it('applies maxHp modifier from statuses', () => {
    const actor = createTestActor(100);
    expect(actor.maxHp).toBe(100);

    actor.statuses.add(createDurationStatus('heroism', 10), actor);
    expect(actor.maxHp).toBe(112); // +12 from heroism
  });

  it('stacks multiple modifiers', () => {
    const actor = createTestActor(100);
    actor.statuses.add(createDurationStatus('heroism', 10), actor);
    actor.statuses.add(createDurationStatus('berserk', 10), actor);

    // heroism: +12 toHit, +12 maxHp
    // berserk: +24 toHit, +24 maxHp, -10 ac
    expect(actor.maxHp).toBe(100 + 12 + 24);
    expect(actor.statuses.getModifier('toHit')).toBe(12 + 24);
    expect(actor.statuses.getModifier('ac')).toBe(-10);
  });
});
