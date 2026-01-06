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

  it('should tick all actors to gain energy', () => {
    const scheduler = new Scheduler();
    const fast = createActor('fast', 120);
    const slow = createActor('slow', 80);

    scheduler.add(fast);
    scheduler.add(slow);
    scheduler.tick();

    expect(fast.energy).toBe(120);
    expect(slow.energy).toBe(80);
  });

  it('should return next actor that can act', () => {
    const scheduler = new Scheduler();
    const actor = createActor('a1', 110);

    scheduler.add(actor);

    // No energy yet
    expect(scheduler.next()).toBeNull();

    // After tick, should have 110 energy (can act)
    scheduler.tick();
    expect(scheduler.next()).toBe(actor);
  });

  it('should return faster actors first when multiple can act', () => {
    const scheduler = new Scheduler();
    const fast = createActor('fast', 150);
    const normal = createActor('normal', 110);

    scheduler.add(normal);
    scheduler.add(fast);
    scheduler.tick();

    // Both can act, but fast has more energy
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
    const fast = createActor('fast', 200); // 2x speed
    const normal = createActor('normal', 100);

    scheduler.add(fast);
    scheduler.add(normal);

    const actOrder: string[] = [];

    // Simulate several ticks
    for (let i = 0; i < 3; i++) {
      scheduler.tick();
      let next = scheduler.next();
      while (next) {
        actOrder.push(next.id);
        next.spendEnergy(100);
        next = scheduler.next();
      }
    }

    // Fast actor should act twice as often
    const fastCount = actOrder.filter(id => id === 'fast').length;
    const normalCount = actOrder.filter(id => id === 'normal').length;
    expect(fastCount).toBeGreaterThan(normalCount);
  });
});
