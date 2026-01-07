/**
 * Status System
 *
 * OO-encapsulated status effects (buffs, debuffs, DOTs).
 * Each status is an object with private internal state.
 * Static data from JSON (StatusDef), dynamic data from invocation (StatusParams).
 */

// Core types and interfaces
export {
  type Status,
  type StatusDef,
  type StatusData,
  type StatusParams,
  type StatusConstructor,
  type SeverityLevel,
  type TickResult,
  StatModifierKey,
  StatusFlag,
  loadStatusDefs,
  getStatusDef,
  hasStatusDef,
} from './Status';

// Status manager
export { StatusManager } from './StatusManager';

// Status implementations
export { DurationStatus, createDurationStatus } from './DurationStatus';
export { CutStatus, createCutStatus } from './CutStatus';
export { StunStatus, createStunStatus } from './StunStatus';
export { PoisonStatus, createPoisonStatus } from './PoisonStatus';

// Registry and factory
import { type Status, type StatusConstructor, type StatusParams, getStatusDef } from './Status';
import { DurationStatus } from './DurationStatus';
import { CutStatus } from './CutStatus';
import { StunStatus } from './StunStatus';
import { PoisonStatus } from './PoisonStatus';

/**
 * Registry mapping type names to status constructors.
 * Add new status types here.
 */
const statusRegistry: Record<string, StatusConstructor> = {
  'duration': DurationStatus,
  'cut': CutStatus,
  'stun': StunStatus,
  'poison': PoisonStatus,
};

/**
 * Register a custom status class.
 */
export function registerStatusClass(type: string, ctor: StatusConstructor): void {
  statusRegistry[type] = ctor;
}

/**
 * Create a status by id.
 * Looks up the type from JSON, finds the class in registry, passes def + params.
 * @param id Status id (e.g., 'blind', 'cut', 'poisoned')
 * @param params Dynamic parameters from the source (duration, intensity, damage, etc.)
 */
export function createStatus(id: string, params: StatusParams): Status {
  const def = getStatusDef(id);
  const StatusClass = statusRegistry[def.type];

  if (!StatusClass) {
    throw new Error(`Unknown status type: ${def.type} (for status ${id})`);
  }

  return new StatusClass(id, def, params);
}
