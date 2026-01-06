import type { Actor } from '../entities/Actor';

export class Scheduler {
  private _actors: Actor[] = [];

  get actors(): readonly Actor[] {
    return this._actors;
  }

  add(actor: Actor): void {
    if (!this._actors.includes(actor)) {
      this._actors.push(actor);
    }
  }

  remove(actor: Actor): void {
    const idx = this._actors.indexOf(actor);
    if (idx >= 0) {
      this._actors.splice(idx, 1);
    }
  }

  clear(): void {
    this._actors = [];
  }

  tick(): void {
    for (const actor of this._actors) {
      actor.gainEnergy();
    }
  }

  next(): Actor | null {
    // Filter to actors that can act and aren't dead
    const ready = this._actors.filter(a => a.canAct && !a.isDead);

    if (ready.length === 0) {
      return null;
    }

    // Return actor with highest energy (faster actors act first when tied)
    ready.sort((a, b) => b.energy - a.energy);
    return ready[0];
  }
}
