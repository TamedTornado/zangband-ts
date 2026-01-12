/**
 * RechargeEffect - Recharge wands, staffs, and rods
 *
 * Used by: Arcane Binding (chaos), Recharging (arcane)
 *
 * Adds charges to wands/staffs or reduces timeout on rods.
 * Higher power = more charges added.
 */

import { ItemTargetGPEffect } from './ItemTargetGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Player } from '@/core/entities/Player';

export interface RechargeEffectDef extends GPEffectDef {
  type: 'recharge';
  /** Power of recharge - number or formula like "level*4" */
  power: number | string;
}

export class RechargeEffect extends ItemTargetGPEffect {
  readonly powerExpr: number | string;

  constructor(def: GPEffectDef) {
    super(def);
    const typed = def as RechargeEffectDef;
    this.powerExpr = typed.power ?? 90;
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, rng } = context;
    const item = this.getTargetItem(context);

    // Check if item is a device
    if (!item.isWand && !item.isStaff && !item.isRod) {
      return {
        success: false,
        messages: [`You cannot recharge ${item.name}.`],
        turnConsumed: true,
      };
    }

    const power = this.calculatePower(actor as Player);

    // Recharge based on item type
    if (item.isRod) {
      // Rods: reduce timeout based on power
      const rechargeAmount = Math.floor(power * rng.getUniformInt(3, 6));
      item.recharge(rechargeAmount);
    } else {
      // Wands/Staffs: add charges based on power and item's pval
      const basePval = item.generated?.baseItem.pval ?? 5;
      const rechargeAmount = rng.getUniformInt(1, Math.max(1, basePval));
      item.recharge(rechargeAmount);
    }

    return {
      success: true,
      messages: [`${item.name} glows brightly.`],
      turnConsumed: true,
      itemsAffected: [item.name],
    };
  }

  private calculatePower(player: Player): number {
    if (typeof this.powerExpr === 'number') {
      return this.powerExpr;
    }

    // Parse simple formula like "level*4"
    const formula = this.powerExpr.toLowerCase();
    if (formula.includes('level')) {
      const expr = formula.replace(/level/g, String(player.level));
      return this.evaluateSimpleExpr(expr);
    }

    return parseInt(this.powerExpr, 10) || 90;
  }

  private evaluateSimpleExpr(expr: string): number {
    // Only allow numbers, +, -, *, / and spaces
    if (!/^[\d\s+\-*/()]+$/.test(expr)) {
      return 90;
    }

    try {
      const result = new Function(`return ${expr}`)();
      return typeof result === 'number' ? Math.floor(result) : 90;
    } catch {
      return 90;
    }
  }
}
