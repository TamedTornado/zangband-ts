import { describe, it, expect } from 'vitest';
import { Scheduler } from '@/core/systems/Scheduler';
import { Actor } from '@/core/entities/Actor';

function createActor(id: string, speed: number): Actor {
  return new Actor({
    id,
    position: { x: 0, y: 0 },
    symbol: 'a',
    color: '#fff',
    maxHp: 10,
    speed,
  });
}

describe('Scheduler', () => {
  it('should add actors', () => {
    const scheduler = new Scheduler();
    const actor = createActor('a1', 110);

    scheduler.add(actor);
    expect(scheduler.actors).toContain(actor);
  });

  it('should remove actors', () => {
    const scheduler = new Scheduler();
    const actor = createActor('a1', 110);

    scheduler.add(actor);
    scheduler.remove(actor);
    expect(scheduler.actors).not.toContain(actor);
  });

  it('should tick all actors to gain energy using extract_energy table', () => {
    const scheduler = new Scheduler();
    const fast = createActor('fast', 120);  // Speed 120 = 20 energy/tick
    const slow = createActor('slow', 80);   // Speed 80 = 2 energy/tick

    // Actors start with 100 energy
    fast.spendEnergy(100);
    slow.spendEnergy(100);

    scheduler.add(fast);
    scheduler.add(slow);
    scheduler.tick();

    expect(fast.energy).toBe(20);
    expect(slow.energy).toBe(2);
  });

  it('should return next actor that can act', () => {
    const scheduler = new Scheduler();
    const actor = createActor('a1', 110);  // Speed 110 = 10 energy/tick

    scheduler.add(actor);

    // Actors start with 100 energy, so can act immediately
    expect(scheduler.next()).toBe(actor);

    // Spend energy and verify they can't act
    actor.spendEnergy(100);
    expect(scheduler.next()).toBeNull();

    // After 10 ticks, should have 100 energy again (can act)
    for (let i = 0; i < 10; i++) {
      scheduler.tick();
    }
    expect(scheduler.next()).toBe(actor);
  });

  it('should return faster actors first when multiple can act', () => {
    const scheduler = new Scheduler();
    const fast = createActor('fast', 120);   // Speed 120 = 20 energy/tick
    const normal = createActor('normal', 110); // Speed 110 = 10 energy/tick

    scheduler.add(normal);
    scheduler.add(fast);

    // After 5 ticks: fast has 100 energy (can act), normal has 50 (can't)
    for (let i = 0; i < 5; i++) {
      scheduler.tick();
    }

    // Only fast can act
    expect(scheduler.next()).toBe(fast);
  });

  it('should not return dead actors', () => {
    const scheduler = new Scheduler();
    const actor = createActor('a1', 110);

    scheduler.add(actor);
    scheduler.tick();

    actor.takeDamage(100); // Kill the actor
    expect(actor.isDead).toBe(true);
    expect(scheduler.next()).toBeNull();
  });

  it('should clear all actors', () => {
    const scheduler = new Scheduler();
    scheduler.add(createActor('a1', 110));
    scheduler.add(createActor('a2', 110));

    scheduler.clear();
    expect(scheduler.actors).toHaveLength(0);
  });

  it('should handle energy-based turn order correctly', () => {
    const scheduler = new Scheduler();
    // Speed 120 = 20 energy/tick (hasted), Speed 100 = 5 energy/tick (slowed)
    const fast = createActor('fast', 120);
    const slow = createActor('slow', 100);

    scheduler.add(fast);
    scheduler.add(slow);

    const actOrder: string[] = [];

    // Simulate enough ticks for both to act multiple times
    // Fast: 20 energy/tick, needs 5 ticks per action
    // Slow: 5 energy/tick, needs 20 ticks per action
    // After 100 ticks: fast acts 20 times, slow acts 5 times
    for (let i = 0; i < 100; i++) {
      scheduler.tick();
      let next = scheduler.next();
      while (next) {
        actOrder.push(next.id);
        next.spendEnergy(100);
        next = scheduler.next();
      }
    }

    // Fast actor should act about 4x as often (20 energy vs 5 energy per tick)
    const fastCount = actOrder.filter(id => id === 'fast').length;
    const slowCount = actOrder.filter(id => id === 'slow').length;
    expect(fastCount).toBeGreaterThan(slowCount * 3); // At least 3x more
  });
});
