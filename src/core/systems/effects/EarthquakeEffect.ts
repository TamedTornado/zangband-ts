/**
 * EarthquakeEffect - Create terrain destruction in an area
 *
 * Used by staves of earthquakes and some spells.
 * Destroys walls, creates rubble, may damage monsters.
 *
 * Example: { type: "earthquake", target: "self", radius: 8, damage: "4d8" }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import { rollDiceExpression } from './diceUtils';

export class EarthquakeEffect extends SelfGPEffect {
  constructor(def: GPEffectDef) {
    super(def);
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, level, rng } = context;
    const center = actor.position;
    const radius = this.getNumber('radius', 8);
    const damageExpr = this.getString('damage', '4d8');
    const messages: string[] = [];

    messages.push('The ground shakes violently!');

    let wallsDestroyed = 0;
    let rubbleCreated = 0;
    let monstersDamaged = 0;

    // Process each tile in radius
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        const pos = { x: center.x + dx, y: center.y + dy };

        // Skip center (player's position)
        if (dx === 0 && dy === 0) continue;

        // Check distance (Chebyshev)
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        if (dist > radius) continue;

        const tile = level.getTile(pos);
        if (!tile) continue;

        const terrain = tile.terrain;

        // Skip permanent walls
        if (terrain.flags?.includes('PERMANENT')) continue;

        // Random chance to affect each tile (decreases with distance)
        const affectChance = 0.5 - (dist / radius) * 0.3;
        if (rng.getUniform() > affectChance) continue;

        // Check for monsters at this position
        const monster = level.getMonsterAt ? level.getMonsterAt(pos) : undefined;
        if (monster && !monster.isDead) {
          const damage = rollDiceExpression(damageExpr, rng);
          monster.takeDamage(damage);
          monstersDamaged++;
        }

        // Destroy walls (convert to floor or rubble)
        if (terrain.flags?.includes('BLOCK') && !terrain.flags?.includes('RUBBLE')) {
          // Wall becomes floor or rubble
          if (rng.getUniform() < 0.4) {
            level.setTerrain(pos, 'rubble');
            rubbleCreated++;
          } else {
            level.setTerrain(pos, 'floor');
          }
          wallsDestroyed++;
        }
        // Floor might become rubble
        else if (!terrain.flags?.includes('BLOCK')) {
          if (rng.getUniform() < 0.2) {
            level.setTerrain(pos, 'rubble');
            rubbleCreated++;
          }
        }
      }
    }

    if (wallsDestroyed > 0) {
      messages.push('Cave-in!');
    }

    if (monstersDamaged > 0) {
      messages.push(`${monstersDamaged} creature${monstersDamaged > 1 ? 's are' : ' is'} caught in the rubble!`);
    }

    return {
      success: true,
      messages,
      turnConsumed: true,
    };
  }
}
