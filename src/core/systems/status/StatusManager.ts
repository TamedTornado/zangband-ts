/**
 * StatusManager - manages a collection of Status objects on an actor
 */

import { RNG } from 'rot-js';
import type { Actor } from '@/core/entities/Actor';
import type { Status } from './Status';

/**
 * Manages the collection of statuses on an actor
 */
export class StatusManager {
  private statuses: Status[] = [];

  /**
   * Add a status to the actor.
   * Tries to merge with existing status of same id first.
   * Calls onApply() for new statuses.
   * @param status The status to add
   * @param actor The actor receiving the status
   * @returns Messages to display
   */
  add(status: Status, actor: Actor): string[] {
    const existing = this.statuses.filter(s => s.id === status.id);

    for (const e of existing) {
      if (e.merge(status)) {
        // Absorbed - return refresh message if defined
        const refresh = status.getDef().messages.refresh;
        return refresh ? [refresh] : [];
      }
    }

    // Not absorbed - add as new instance and call onApply
    this.statuses.push(status);
    const applyMessages = status.onApply(actor);
    return [status.getDef().messages.apply, ...applyMessages];
  }

  /**
   * Process one turn for all statuses.
   * @returns Messages to display (damage, expiration, etc.)
   */
  tick(actor: Actor, rng: typeof RNG): string[] {
    const messages: string[] = [];

    // Tick all statuses
    for (const status of this.statuses) {
      const result = status.tick(actor, rng);
      messages.push(...result.messages);
    }

    // Remove expired and call onExpire
    const expired = this.statuses.filter(s => s.isExpired());
    for (const s of expired) {
      const expireMessages = s.onExpire(actor);
      messages.push(s.getDef().messages.expire, ...expireMessages);
    }
    this.statuses = this.statuses.filter(s => !s.isExpired());

    return messages;
  }

  /**
   * Check if actor has a status with given id
   */
  has(id: string): boolean {
    return this.statuses.some(s => s.id === id);
  }

  /**
   * Get all statuses
   */
  getAll(): Status[] {
    return [...this.statuses];
  }

  /**
   * Get all statuses with given id
   */
  getById(id: string): Status[] {
    return this.statuses.filter(s => s.id === id);
  }

  /**
   * Reduce status(es) by amount, consuming stacks as needed.
   * Works across multiple stacks until amount is exhausted.
   * @param id Status id to reduce
   * @param amount Amount to reduce by
   * @param actor The actor with the status
   * @returns Messages from any expired statuses
   */
  reduce(id: string, amount: number, actor: Actor): string[] {
    let remaining = amount;
    const messages: string[] = [];

    for (const s of this.getById(id)) {
      if (remaining <= 0) break;
      if (s.reduce) {
        remaining -= s.reduce(remaining);
      }
    }

    // Remove any that are now expired, collect messages
    const expired = this.statuses.filter(s => s.id === id && s.isExpired());
    for (const s of expired) {
      messages.push(s.getDef().messages.expire, ...s.onExpire(actor));
    }
    this.statuses = this.statuses.filter(s => !s.isExpired());

    return messages;
  }

  /**
   * Cure (remove) all statuses with given id.
   * Alias for clear() with clearer intent.
   * @param id Status id to cure
   * @param actor The actor losing the status
   * @returns Messages from expiration
   */
  cure(id: string, actor: Actor): string[] {
    return this.clear(id, actor);
  }

  /**
   * Remove all statuses with given id (dispel)
   * Calls onExpire() for each removed status.
   * @param id Status id to remove
   * @param actor The actor losing the status
   * @returns Messages from expiration
   */
  clear(id: string, actor: Actor): string[] {
    const toRemove = this.statuses.filter(s => s.id === id);
    if (toRemove.length === 0) return [];

    const messages: string[] = [];
    for (const s of toRemove) {
      const expireMessages = s.onExpire(actor);
      messages.push(s.getDef().messages.expire, ...expireMessages);
    }
    this.statuses = this.statuses.filter(s => s.id !== id);
    return messages;
  }

  /**
   * Remove all statuses (e.g., on death)
   * Calls onExpire() for each removed status.
   * @param actor The actor losing the statuses
   * @returns Messages from expiration
   */
  clearAll(actor: Actor): string[] {
    const messages: string[] = [];
    for (const s of this.statuses) {
      const expireMessages = s.onExpire(actor);
      messages.push(s.getDef().messages.expire, ...expireMessages);
    }
    this.statuses = [];
    return messages;
  }

  /**
   * Get the total modifier for a stat across all statuses
   */
  getModifier(stat: string): number {
    let total = 0;
    for (const s of this.statuses) {
      const data = s.getDef().data;
      if (data && stat in data) {
        const value = data[stat];
        if (typeof value === 'number') {
          total += value;
        }
      }
    }
    return total;
  }

  /**
   * Get count of statuses (for UI display)
   */
  get count(): number {
    return this.statuses.length;
  }

  /**
   * Check if any active status has a specific flag (boolean true in data)
   */
  hasFlag(flag: string): boolean {
    for (const s of this.statuses) {
      const data = s.getDef().data;
      if (data && data[flag] === true) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if any active status grants a specific resistance
   * @param resist Resistance flag (e.g., 'RES_FIRE')
   */
  hasResist(resist: string): boolean {
    for (const s of this.statuses) {
      const data = s.getDef().data;
      if (data && data['grantsResist'] === resist) {
        return true;
      }
    }
    return false;
  }
}
