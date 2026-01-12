/**
 * BrandWeaponEffect - Apply an elemental brand to the player's weapon
 *
 * Brands the currently wielded weapon with an elemental property.
 * Fails on artifacts, ego items, or cursed weapons.
 * Also adds +4-6 to hit and damage.
 *
 * C Reference: ../zangband/src/spells3.c:1022 - brand_weapon()
 *
 * Brand types:
 *   - chaos: "(Chaotic)" ego - "is engulfed in raw Logrus!"
 *   - poison: "of Venom" ego - "is coated with poison."
 *   - vampiric: "(Vampiric)" ego - "thirsts for blood!"
 *   - teleport: "(Trump Weapon)" ego - "seems very unstable now." + pval 1-2
 *   - elemental: 25% fire, 75% cold - "of Flame" or "of Frost"
 *
 * Example: { type: "brandWeapon", brand: "chaos" }
 */

import { SelfGPEffect } from './SelfGPEffect';
import type { GPEffectDef, GPEffectContext, GPEffectResult } from './GPEffect';
import type { Player } from '@/core/entities/Player';
import type { EgoItemDef } from '@/core/data/ego-items';
import egoItemsData from '@/data/items/ego-items.json';

// Load ego items
const egoItems = egoItemsData as Record<string, EgoItemDef>;

export type BrandType = 'chaos' | 'poison' | 'vampiric' | 'teleport' | 'elemental';

export interface BrandWeaponEffectDef extends GPEffectDef {
  type: 'brandWeapon';
  brand: BrandType;
}

interface BrandInfo {
  egoKey: string;
  message: string;
  setPval?: boolean; // For trump, sets pval 1-2
}

const BRAND_MAP: Record<Exclude<BrandType, 'elemental'>, BrandInfo> = {
  chaos: {
    egoKey: 'chaotic',
    message: 'is engulfed in raw Logrus!',
  },
  poison: {
    egoKey: 'of_venom',
    message: 'is coated with poison.',
  },
  vampiric: {
    egoKey: 'vampiric',
    message: 'thirsts for blood!',
  },
  teleport: {
    egoKey: 'trump_weapon',
    message: 'seems very unstable now.',
    setPval: true,
  },
};

export class BrandWeaponEffect extends SelfGPEffect {
  readonly brand: BrandType;

  constructor(def: GPEffectDef) {
    super(def);
    const brandDef = def as BrandWeaponEffectDef;
    this.brand = brandDef.brand ?? 'elemental';
  }

  execute(context: GPEffectContext): GPEffectResult {
    const { actor, rng } = context;

    // Must be a player
    if (!('getEquipped' in actor)) {
      return this.fail('Only players can brand weapons.');
    }
    const player = actor as Player;

    // Get equipped weapon
    const weapon = player.getEquipped('weapon');
    if (!weapon || !weapon.generated) {
      return this.fail('You have no weapon to brand.');
    }

    // Cannot brand artifacts
    if (weapon.generated.artifact) {
      return this.fail('The Branding failed.');
    }

    // Cannot brand ego items (already has special properties)
    if (weapon.generated.egoItem) {
      return this.fail('The Branding failed.');
    }

    // Cannot brand cursed items
    if (weapon.generated.flags.includes('CURSED')) {
      return this.fail('The Branding failed.');
    }

    // Determine brand info
    let brandInfo: BrandInfo;
    if (this.brand === 'elemental') {
      // 25% fire, 75% cold
      if (rng.getUniformInt(0, 99) < 25) {
        brandInfo = {
          egoKey: 'of_flame',
          message: 'is covered in a fiery shield!',
        };
      } else {
        brandInfo = {
          egoKey: 'of_frost',
          message: 'glows deep, icy blue!',
        };
      }
    } else {
      brandInfo = BRAND_MAP[this.brand];
    }

    // Get ego item definition
    const egoItem = egoItems[brandInfo.egoKey];
    if (!egoItem) {
      return this.fail(`Unknown ego item: ${brandInfo.egoKey}`);
    }

    // Apply the ego item
    weapon.generated.egoItem = egoItem;

    // Add ego flags to weapon flags
    for (const flag of egoItem.flags) {
      if (!weapon.generated.flags.includes(flag)) {
        weapon.generated.flags.push(flag);
      }
    }

    // For trump brand, set pval 1-2
    if (brandInfo.setPval) {
      weapon.generated.pval = rng.getUniformInt(1, 2);
    }

    // Add enchantment bonus (+4-6 to hit and damage)
    const hitBonus = rng.getUniformInt(4, 6);
    const damBonus = rng.getUniformInt(4, 6);
    weapon.generated.toHit += hitBonus;
    weapon.generated.toDam += damBonus;

    // Build success message
    const weaponName = weapon.name;
    const message = `Your ${weaponName} ${brandInfo.message}`;

    return this.success([message], {
      itemsAffected: [weapon.id],
    });
  }
}
