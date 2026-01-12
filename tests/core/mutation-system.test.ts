import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { MutationSystem } from '@/core/systems/MutationSystem';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import mutationsData from '@/data/mutations/mutations.json';
import type { MutationRecord } from '@/core/data/mutations';

function createTestPlayer(): Player {
  return new Player({
    id: 'test-player',
    position: { x: 25, y: 25 },
    maxHp: 100,
    speed: 110,
    stats: { str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10 },
  });
}

describe('MutationSystem', () => {
  let system: MutationSystem;
  let player: Player;

  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
    system = new MutationSystem();
    system.loadDefs(mutationsData as MutationRecord);
    player = createTestPlayer();
  });

  describe('basic operations', () => {
    it('player starts with no mutations', () => {
      expect(player.mutations).toEqual([]);
      expect(player.hasMutation('hyper_str')).toBe(false);
    });

    it('gaining a mutation adds it to the player', () => {
      const result = system.gainMutation(player, 'hyper_str', RNG);

      expect(result.gained).toBe(true);
      expect(result.key).toBe('hyper_str');
      expect(result.message).toBeDefined();
      expect(player.hasMutation('hyper_str')).toBe(true);
      expect(player.mutations).toContain('hyper_str');
    });

    it('cannot gain mutation player already has', () => {
      system.gainMutation(player, 'hyper_str', RNG);
      const result = system.gainMutation(player, 'hyper_str', RNG);

      expect(result.gained).toBe(false);
      expect(player.mutations.filter(m => m === 'hyper_str').length).toBe(1);
    });

    it('losing a mutation removes it from the player', () => {
      system.gainMutation(player, 'hyper_str', RNG);
      expect(player.hasMutation('hyper_str')).toBe(true);

      const result = system.loseMutation(player, 'hyper_str', RNG);

      expect(result.lost).toBe(true);
      expect(result.key).toBe('hyper_str');
      expect(result.message).toBeDefined();
      expect(player.hasMutation('hyper_str')).toBe(false);
    });

    it('losing mutation that player does not have returns false', () => {
      const result = system.loseMutation(player, 'hyper_str', RNG);

      expect(result.lost).toBe(false);
    });
  });

  describe('opposite mutations', () => {
    it('gaining opposite mutation removes the existing one', () => {
      // Gain hyper_str first
      system.gainMutation(player, 'hyper_str', RNG);
      expect(player.hasMutation('hyper_str')).toBe(true);

      // Gain puny (opposite of hyper_str)
      const result = system.gainMutation(player, 'puny', RNG);

      expect(result.gained).toBe(true);
      expect(player.hasMutation('puny')).toBe(true);
      expect(player.hasMutation('hyper_str')).toBe(false);
      expect(result.cancelled).toContain('hyper_str');
    });

    it('gaining fearless removes cowardice', () => {
      system.gainMutation(player, 'cowardice', RNG);
      expect(player.hasMutation('cowardice')).toBe(true);

      system.gainMutation(player, 'fearless', RNG);

      expect(player.hasMutation('fearless')).toBe(true);
      expect(player.hasMutation('cowardice')).toBe(false);
    });

    it('gaining iron_skin removes scales', () => {
      system.gainMutation(player, 'scales', RNG);
      expect(player.hasMutation('scales')).toBe(true);

      system.gainMutation(player, 'iron_skin', RNG);

      expect(player.hasMutation('iron_skin')).toBe(true);
      expect(player.hasMutation('scales')).toBe(false);
    });
  });

  describe('random mutation selection', () => {
    it('gainMutation with no key selects random mutation', () => {
      const result = system.gainMutation(player, undefined, RNG);

      expect(result.gained).toBe(true);
      expect(result.key).toBeDefined();
      expect(player.mutations.length).toBe(1);
    });

    it('loseMutation with no key selects random from player mutations', () => {
      system.gainMutation(player, 'hyper_str', RNG);
      system.gainMutation(player, 'spit_acid', RNG);
      expect(player.mutations.length).toBe(2);

      const result = system.loseMutation(player, undefined, RNG);

      expect(result.lost).toBe(true);
      expect(player.mutations.length).toBe(1);
    });
  });

  describe('passive mutation modifiers', () => {
    it('hyper_str provides stat modifiers', () => {
      system.gainMutation(player, 'hyper_str', RNG);

      const mods = system.getStatModifiers(player);
      const def = system.getDef('hyper_str');

      // Verify modifiers match the definition
      expect(def?.category).toBe('passive');
      if (def?.category === 'passive' && def.modifiers) {
        for (const [stat, value] of Object.entries(def.modifiers)) {
          expect(mods[stat as keyof typeof mods]).toBe(value);
        }
      }
    });

    it('xtra_legs provides speed modifier', () => {
      system.gainMutation(player, 'xtra_legs', RNG);

      const speedMod = system.getSpeedModifier(player);
      const def = system.getDef('xtra_legs');

      expect(def?.category).toBe('passive');
      if (def?.category === 'passive') {
        expect(speedMod).toBe(def.speedMod ?? 0);
      }
    });

    it('iron_skin provides AC modifier', () => {
      system.gainMutation(player, 'iron_skin', RNG);

      const acMod = system.getAcModifier(player);
      const def = system.getDef('iron_skin');

      expect(def?.category).toBe('passive');
      if (def?.category === 'passive') {
        expect(acMod).toBe(def.acMod ?? 0);
      }
    });

    it('short_leg provides negative speed modifier', () => {
      system.gainMutation(player, 'short_leg', RNG);

      const speedMod = system.getSpeedModifier(player);
      const def = system.getDef('short_leg');

      expect(def?.category).toBe('passive');
      if (def?.category === 'passive') {
        expect(speedMod).toBe(def.speedMod ?? 0);
        expect(speedMod).toBeLessThan(0);
      }
    });

    it('multiple AC mutations stack', () => {
      system.gainMutation(player, 'scales', RNG);
      system.gainMutation(player, 'wart_skin', RNG);

      const acMod = system.getAcModifier(player);
      const scalesDef = system.getDef('scales');
      const wartDef = system.getDef('wart_skin');

      const expectedAc =
        (scalesDef?.category === 'passive' ? scalesDef.acMod ?? 0 : 0) +
        (wartDef?.category === 'passive' ? wartDef.acMod ?? 0 : 0);
      expect(acMod).toBe(expectedAc);
    });

    it('multiple mutations stack modifiers', () => {
      system.gainMutation(player, 'hyper_str', RNG);
      system.gainMutation(player, 'xtra_legs', RNG);

      const mods = system.getStatModifiers(player);

      // Should have modifiers from both
      expect(Object.keys(mods).length).toBeGreaterThan(0);
    });

    it('fearless mutation grants fearless flag', () => {
      system.gainMutation(player, 'fearless', RNG);

      expect(system.hasFlag(player, 'fearless')).toBe(true);
    });

    it('regen mutation grants regen flag', () => {
      system.gainMutation(player, 'regen', RNG);

      expect(system.hasFlag(player, 'regen')).toBe(true);
    });

    it('esp mutation grants telepathy flag', () => {
      system.gainMutation(player, 'esp', RNG);

      expect(system.hasFlag(player, 'telepathy')).toBe(true);
    });

    it('wings mutation grants levitation flag', () => {
      system.gainMutation(player, 'wings', RNG);

      expect(system.hasFlag(player, 'levitation')).toBe(true);
    });

    it('no mutations means no flags', () => {
      expect(system.hasFlag(player, 'fearless')).toBe(false);
      expect(system.hasFlag(player, 'regen')).toBe(false);
      expect(system.hasFlag(player, 'telepathy')).toBe(false);
    });
  });

  describe('mutation queries', () => {
    it('getActivatable returns only activatable mutations', () => {
      system.gainMutation(player, 'spit_acid', RNG);
      system.gainMutation(player, 'hyper_str', RNG);
      system.gainMutation(player, 'cowardice', RNG);

      const activatable = system.getActivatable(player);

      expect(activatable.length).toBe(1);
      expect(activatable[0].category).toBe('activatable');
    });

    it('getRandom returns only random mutations', () => {
      system.gainMutation(player, 'spit_acid', RNG);
      system.gainMutation(player, 'cowardice', RNG);
      system.gainMutation(player, 'hyper_str', RNG);

      const random = system.getRandom(player);

      expect(random.length).toBe(1);
      expect(random[0].category).toBe('random');
    });

    it('getPassive returns only passive mutations', () => {
      system.gainMutation(player, 'spit_acid', RNG);
      system.gainMutation(player, 'hyper_str', RNG);
      system.gainMutation(player, 'xtra_legs', RNG);

      const passive = system.getPassive(player);

      expect(passive.length).toBe(2);
      passive.forEach(p => expect(p.category).toBe('passive'));
    });
  });

  describe('getDef', () => {
    it('returns mutation definition by key', () => {
      const def = system.getDef('hyper_str');

      expect(def).toBeDefined();
      expect(def?.category).toBe('passive');
    });

    it('returns undefined for unknown key', () => {
      const def = system.getDef('unknown_mutation');

      expect(def).toBeUndefined();
    });
  });

  describe('Player integration', () => {
    beforeEach(() => {
      // Connect player to mutation system for stat integration
      player.setMutationSystem(system);
    });

    it('player currentStats includes mutation modifiers', () => {
      const baseStat = player.currentStats.str;

      // Gain hyper_str which should modify STR
      system.gainMutation(player, 'hyper_str', RNG);
      const def = system.getDef('hyper_str');

      if (def?.category === 'passive' && def.modifiers?.str) {
        expect(player.currentStats.str).toBe(baseStat + def.modifiers.str);
      }
    });

    it('player speed includes mutation modifiers', () => {
      const baseSpeed = player.speed;

      // Gain xtra_legs which should modify speed
      system.gainMutation(player, 'xtra_legs', RNG);
      const def = system.getDef('xtra_legs');

      if (def?.category === 'passive' && def.speedMod) {
        expect(player.speed).toBe(baseSpeed + def.speedMod);
      }
    });

    it('player speed can be reduced by mutations', () => {
      const baseSpeed = player.speed;

      // Gain short_leg which should reduce speed
      system.gainMutation(player, 'short_leg', RNG);
      const def = system.getDef('short_leg');

      if (def?.category === 'passive' && def.speedMod) {
        expect(player.speed).toBe(baseSpeed + def.speedMod);
        expect(player.speed).toBeLessThan(baseSpeed);
      }
    });

    it('player totalAc includes mutation AC bonuses', () => {
      const baseAc = player.totalAc;

      // Gain iron_skin which should add AC
      system.gainMutation(player, 'iron_skin', RNG);
      const def = system.getDef('iron_skin');

      if (def?.category === 'passive' && def.acMod) {
        expect(player.totalAc).toBe(baseAc + def.acMod);
      }
    });

    it('multiple mutations stack on player stats', () => {
      // hyper_str and limber both have stat modifiers
      system.gainMutation(player, 'hyper_str', RNG);
      system.gainMutation(player, 'limber', RNG);

      const mods = system.getStatModifiers(player);

      // Should have combined modifiers
      expect(Object.keys(mods).length).toBeGreaterThan(0);
    });

    it('player hasMutationFlag checks flags correctly', () => {
      expect(player.hasMutationFlag('fearless')).toBe(false);

      system.gainMutation(player, 'fearless', RNG);

      expect(player.hasMutationFlag('fearless')).toBe(true);
    });

    it('losing mutation removes its effect on player stats', () => {
      const baseStat = player.currentStats.str;
      system.gainMutation(player, 'hyper_str', RNG);
      expect(player.currentStats.str).not.toBe(baseStat);

      system.loseMutation(player, 'hyper_str', RNG);

      expect(player.currentStats.str).toBe(baseStat);
    });

    it('stats are clamped to minimum of 3', () => {
      // Create player with low INT
      const weakPlayer = new Player({
        id: 'weak-player',
        position: { x: 0, y: 0 },
        maxHp: 100,
        speed: 110,
        stats: { str: 10, int: 5, wis: 5, dex: 10, con: 10, chr: 10 },
      });
      weakPlayer.setMutationSystem(system);

      // Gain moronic which reduces INT and WIS
      system.gainMutation(weakPlayer, 'moronic', RNG);

      // Should be clamped to minimum 3
      expect(weakPlayer.currentStats.int).toBeGreaterThanOrEqual(3);
      expect(weakPlayer.currentStats.wis).toBeGreaterThanOrEqual(3);
    });
  });

  describe('random mutation tick processing', () => {
    it('mutation with chance 0 never triggers', () => {
      // horns has chance: 0
      system.gainMutation(player, 'horns', RNG);

      // Run many ticks - should never trigger
      for (let i = 0; i < 100; i++) {
        const result = system.tickRandomMutations(player, RNG);
        expect(result.effectsTriggered.length).toBe(0);
      }
    });

    it('mutation with high chance eventually triggers', () => {
      // rteleport has 50% chance
      system.gainMutation(player, 'rteleport', RNG);

      // Run enough ticks that it should trigger at least once
      let triggered = false;
      for (let i = 0; i < 100; i++) {
        const result = system.tickRandomMutations(player, RNG);
        if (result.effectsTriggered.length > 0) {
          triggered = true;
          break;
        }
      }
      expect(triggered).toBe(true);
    });

    it('cowardice triggers its random effect', () => {
      system.gainMutation(player, 'cowardice', RNG);
      const def = system.getDef('cowardice');

      let triggered = false;
      for (let i = 0; i < 200; i++) {
        const result = system.tickRandomMutations(player, RNG);
        if (def?.category === 'random' && result.effectsTriggered.includes(def.randomEffect)) {
          triggered = true;
          break;
        }
      }
      expect(triggered).toBe(true);
    });

    it('multiple random mutations can all trigger', () => {
      system.gainMutation(player, 'rteleport', RNG);
      system.gainMutation(player, 'hallu', RNG);

      const effectsTriggered = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const result = system.tickRandomMutations(player, RNG);
        for (const effect of result.effectsTriggered) {
          effectsTriggered.add(effect);
        }
      }

      // Both should have triggered at least once
      expect(effectsTriggered.size).toBeGreaterThanOrEqual(2);
    });

    it('returns empty array when player has no random mutations', () => {
      // Only passive mutation
      system.gainMutation(player, 'hyper_str', RNG);

      const result = system.tickRandomMutations(player, RNG);

      expect(result.effectsTriggered).toEqual([]);
    });

    it('returns empty array when player has no mutations', () => {
      const result = system.tickRandomMutations(player, RNG);

      expect(result.effectsTriggered).toEqual([]);
      expect(result.messages).toEqual([]);
    });
  });

  describe('activatable mutation activation', () => {
    // Create a player with caster class for mana
    const casterClassDef = {
      index: 0,
      name: 'Mage',
      stats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, chr: 0 },
      skills: { disarm: 0, device: 0, save: 0, stealth: 0, search: 0, searchFreq: 0, melee: 0, ranged: 0 },
      xSkills: { disarm: 0, device: 0, save: 0, stealth: 0, search: 0, searchFreq: 0, melee: 0, ranged: 0 },
      hitDie: 6,
      expMod: 30,
      petUpkeepDiv: 1,
      heavySense: false,
      spellStat: 'int' as const,
      spellFirst: 1,
      spellWeight: 300,
      realms: [],
      secondaryRealm: false,
    };

    beforeEach(() => {
      // Create player with caster class for mana and sufficient level
      player = new Player({
        id: 'test-player',
        position: { x: 25, y: 25 },
        maxHp: 100,
        speed: 110,
        stats: { str: 16, int: 18, wis: 12, dex: 15, con: 14, chr: 10 },
        level: 15, // High enough level for most mutations
        classDef: casterClassDef,
      });
    });

    it('canActivate returns true when requirements are met', () => {
      system.gainMutation(player, 'spit_acid', RNG);

      const result = system.canActivateMutation(player, 'spit_acid');

      expect(result.canActivate).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('canActivate returns false when player lacks mutation', () => {
      const result = system.canActivateMutation(player, 'spit_acid');

      expect(result.canActivate).toBe(false);
      expect(result.reason).toContain('do not have');
    });

    it('canActivate returns false when player level too low', () => {
      const lowLevelPlayer = new Player({
        id: 'low-level',
        position: { x: 0, y: 0 },
        maxHp: 100,
        speed: 110,
        stats: { str: 10, int: 18, wis: 10, dex: 10, con: 10, chr: 10 },
        level: 5, // Low level
        classDef: casterClassDef,
      });
      // hypn_gaze requires level 12
      system.gainMutation(lowLevelPlayer, 'hypn_gaze', RNG);

      const result = system.canActivateMutation(lowLevelPlayer, 'hypn_gaze');

      expect(result.canActivate).toBe(false);
      expect(result.reason).toContain('level');
    });

    it('canActivate returns false when player lacks mana', () => {
      system.gainMutation(player, 'spit_acid', RNG);
      const def = system.getDef('spit_acid');
      // Spend most mana
      if (def?.category === 'activatable') {
        const toSpend = player.maxMana - def.cost + 1;
        if (toSpend > 0) player.spendMana(toSpend);
      }

      const result = system.canActivateMutation(player, 'spit_acid');

      expect(result.canActivate).toBe(false);
      expect(result.reason).toContain('mana');
    });

    it('canActivate returns false for non-activatable mutation', () => {
      system.gainMutation(player, 'hyper_str', RNG);

      const result = system.canActivateMutation(player, 'hyper_str');

      expect(result.canActivate).toBe(false);
      expect(result.reason).toContain('activatable');
    });

    it('tryActivate returns effect and deducts mana on success', () => {
      system.gainMutation(player, 'spit_acid', RNG);
      const initialMana = player.currentMana;
      const def = system.getDef('spit_acid');

      const result = system.tryActivateMutation(player, 'spit_acid', RNG);

      expect(result.activated).toBe(true);
      if (def?.category === 'activatable') {
        expect(player.currentMana).toBe(initialMana - def.cost);
      }
    });

    it('tryActivate can fail stat check with low stat', () => {
      // Create player with very low DEX for spit_acid stat check
      const lowDexPlayer = new Player({
        id: 'low-dex',
        position: { x: 0, y: 0 },
        maxHp: 100,
        speed: 110,
        stats: { str: 10, int: 18, wis: 10, dex: 3, con: 10, chr: 10 },
        level: 15,
        classDef: casterClassDef,
      });
      system.gainMutation(lowDexPlayer, 'spit_acid', RNG);

      // With very low DEX, stat check might fail
      let failedOnce = false;
      for (let i = 0; i < 50; i++) {
        if (lowDexPlayer.currentMana < 9) {
          lowDexPlayer.restoreMana(100);
        }
        const result = system.tryActivateMutation(lowDexPlayer, 'spit_acid', RNG);
        if (result.activated && !result.succeeded) {
          failedOnce = true;
          expect(result.failMessage).toBeDefined();
          break;
        }
      }
      expect(failedOnce).toBe(true);
    });

    it('tryActivate returns effect definition for execution', () => {
      system.gainMutation(player, 'spit_acid', RNG);

      const result = system.tryActivateMutation(player, 'spit_acid', RNG);

      expect(result.activated).toBe(true);
      expect(result.effect).toBeDefined();
      expect(result.effect?.type).toBeDefined();
    });
  });
});
