/**
 * CutStatus - accumulating intensity status for bleeding wounds
 *
 * Accumulates intensity from params.intensity.
 * Damage per turn based on severity thresholds from def.data.
 * Intensity decreases over time (healing).
 */

import { RNG } from 'rot-js';
import type { Actor } from '@/core/entities/Actor';
import { type Status, type StatusDef, type StatusParams, type TickResult, type SeverityLevel, getStatusDef } from './Status';

/**
 * Cut status - bleeding wounds that accumulate and heal over time
 */
export class CutStatus implements Status {
  readonly id: string;
  private readonly def: StatusDef;
  private intensity: number;
  private lastSeverity: string | null = null;

  constructor(id: string, def: StatusDef, params: StatusParams) {
    this.id = id;
    this.def = def;
    const maxIntensity = (def.data?.maxIntensity as number) ?? 1000;
    this.intensity = Math.min(params.intensity ?? 0, maxIntensity);
  }

  onApply(_actor: Actor): string[] {
    const level = this.getSeverityLevel();
    if (level) {
      this.lastSeverity = level.message;
      return [level.message];
    }
    return [];
  }

  onExpire(_actor: Actor): string[] {
    return [];
  }

  tick(actor: Actor, _rng: typeof RNG): TickResult {
    const messages: string[] = [];

    // Deal damage based on severity
    const level = this.getSeverityLevel();
    if (level?.damage && level.damage > 0) {
      actor.takeDamage(level.damage);
      messages.push(`You take ${level.damage} damage from bleeding.`);
    }

    // Check for severity message change
    if (level && level.message !== this.lastSeverity) {
      messages.push(level.message);
      this.lastSeverity = level.message;
    }

    // Natural healing
    const healRate = (this.def.data?.healRate as number) ?? 1;
    this.intensity -= healRate;

    return { messages };
  }

  merge(incoming: Status): boolean {
    const cut = incoming as CutStatus;
    const maxIntensity = (this.def.data?.maxIntensity as number) ?? 1000;
    this.intensity = Math.min(this.intensity + cut.intensity, maxIntensity);
    return true;
  }

  isExpired(): boolean {
    return this.intensity <= 0;
  }

  getDef(): StatusDef {
    return this.def;
  }

  get currentIntensity(): number {
    return this.intensity;
  }

  reduce(amount: number): number {
    const consumed = Math.min(amount, this.intensity);
    this.intensity -= consumed;
    return consumed;
  }

  private getSeverityLevel(): SeverityLevel | null {
    const severity = this.def.data?.severity as Record<string, SeverityLevel> | undefined;
    if (!severity) return null;

    const thresholds = Object.keys(severity)
      .map(Number)
      .sort((a, b) => b - a);

    for (const threshold of thresholds) {
      if (this.intensity >= threshold) {
        return severity[String(threshold)];
      }
    }
    return null;
  }
}

export function createCutStatus(intensity: number): CutStatus {
  const def = getStatusDef('cut');
  return new CutStatus('cut', def, { intensity });
}
