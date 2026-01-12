/**
 * BlessWeaponEffect - Blesses a weapon, removing curses and adding BLESSED flag
 *
 * From Zangband's bless_weapon() which:
 * 1. If cursed: removes curse (fails on perma-curse, 33% fail on heavy curse)
 * 2. If already blessed: just reports it
 * 3. Normal/ego weapons: automatically blessed
 * 4. Artifacts: 1/3 chance to bless, 2/3 chance to resist and get disenchanted
 *
 * Used by: Bless Weapon (life realm)
 */

import { ItemTargetGPEffect } from './ItemTargetGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';

export interface BlessWeaponEffectDef extends GPEffectDef {
  type: 'blessWeapon';
}

interface BlessWeaponData {
  itemId: string;
  uncursed?: boolean;
  curseDisrupted?: boolean;
  alreadyBlessed?: boolean;
  blessed?: boolean;
  artifactResisted?: boolean;
  disenchanted?: {
    toHit: number;
    toDam: number;
    toAC: number;
  };
}

export class BlessWeaponEffect extends ItemTargetGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { rng } = context;
    const item = this.getTargetItem(context);
    const messages: string[] = [];
    const data: BlessWeaponData = { itemId: item.id };

    const generated = item.generated;
    const name = item.name || 'weapon';

    // Check if cursed
    if (generated?.cursed) {
      // Heavy curse has 33% chance to disrupt, perma-curse always disrupts
      if (generated.permaCurse || (generated.heavyCurse && rng.getUniformInt(1, 100) < 33)) {
        messages.push(`The black aura on the ${name} disrupts the blessing!`);
        data.curseDisrupted = true;
        data.uncursed = false;
        return {
          success: true,
          messages,
          turnConsumed: true,
          data,
        };
      }

      // Successfully remove curse
      messages.push(`A malignant aura leaves the ${name}.`);
      data.uncursed = true;
      // Note: actual item modification would be handled by the game state manager
    }

    // Check if already blessed
    if (generated?.blessed) {
      messages.push(`The ${name} was blessed already.`);
      data.alreadyBlessed = true;
      return {
        success: true,
        messages,
        turnConsumed: true,
        data,
      };
    }

    // Try to bless the weapon
    // Non-artifacts (no artifact flag) or 1/3 chance for artifacts
    const isArtifact = generated?.artifact;
    if (!isArtifact || rng.getUniformInt(1, 3) === 1) {
      messages.push(`The ${name} shines!`);
      data.blessed = true;
      return {
        success: true,
        messages,
        turnConsumed: true,
        data,
      };
    }

    // Artifact resisted - disenchant it
    messages.push('The artifact resists your blessing!');
    data.artifactResisted = true;

    let toHitLoss = 0;
    let toDamLoss = 0;
    let toACLoss = 0;

    const currentToHit = generated?.toHit ?? 0;
    const currentToDam = generated?.toDam ?? 0;
    const currentToAC = generated?.toAC ?? 0;

    // Disenchant tohit
    if (currentToHit > 0) {
      toHitLoss++;
      if (currentToHit > 5 && rng.getUniformInt(0, 99) < 33) {
        toHitLoss++;
      }
    }

    // Disenchant todam
    if (currentToDam > 0) {
      toDamLoss++;
      if (currentToDam > 5 && rng.getUniformInt(0, 99) < 33) {
        toDamLoss++;
      }
    }

    // Disenchant toac
    if (currentToAC > 0) {
      toACLoss++;
      if (currentToAC > 5 && rng.getUniformInt(0, 99) < 33) {
        toACLoss++;
      }
    }

    if (toHitLoss > 0 || toDamLoss > 0 || toACLoss > 0) {
      messages.push('There is a static feeling in the air...');
      messages.push(`The ${name} was disenchanted!`);
      data.disenchanted = {
        toHit: toHitLoss,
        toDam: toDamLoss,
        toAC: toACLoss,
      };
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
      data,
    };
  }
}
