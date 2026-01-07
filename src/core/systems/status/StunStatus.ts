/**
 * StunStatus - accumulating intensity status for being stunned
 *
 * Accumulates intensity from params.intensity.
 * Severity thresholds from def.data affect penalties.
 * At high intensity, can knock you out (can't act).
 */

import { RNG } from 'rot-js';
import type { Actor } from '@/core/entities/Actor';
import { type Status, type StatusDef, type StatusParams, type TickResult, type SeverityLevel, getStatusDef } from './Status';

/**
 * Stun status - being stunned reduces accuracy and damage
 */
export class StunStatus implements Status {
  readonly id: string;
  private readonly def: StatusDef;
  private intensity: number;
  private lastSeverity: string | null = null;

  constructor(id: string, def: StatusDef, params: StatusParams) {
    this.id = id;
    this.def = def;
    const maxIntensity = (def.data?.maxIntensity as number) ?? 100;
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

  tick(_actor: Actor, _rng: typeof RNG): TickResult {
    const messages: string[] = [];

    // Check for severity message change
    const level = this.getSeverityLevel();
    if (level && level.message !== this.lastSeverity) {
      messages.push(level.message);
      this.lastSeverity = level.message;
    }

    // Natural recovery
    const healRate = (this.def.data?.healRate as number) ?? 1;
    this.intensity -= healRate;

    return { messages };
  }

  merge(incoming: Status): boolean {
    const stun = incoming as StunStatus;
    const maxIntensity = (this.def.data?.maxIntensity as number) ?? 100;
    this.intensity = Math.min(this.intensity + stun.intensity, maxIntensity);
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

  get isKnockedOut(): boolean {
    const level = this.getSeverityLevel();
    return level?.cantAct === true;
  }

  get toHitPenalty(): number {
    const level = this.getSeverityLevel();
    return level?.toHit ?? 0;
  }

  get toDamPenalty(): number {
    const level = this.getSeverityLevel();
    return level?.toDam ?? 0;
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

export function createStunStatus(intensity: number): StunStatus {
  const def = getStatusDef('stun');
  return new StunStatus('stun', def, { intensity });
}
