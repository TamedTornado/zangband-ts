import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import { MutationSystem } from '@/core/systems/MutationSystem';
import { Player } from '@/core/entities/Player';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { MutationDef } from '@/core/data/mutations';

// Sample mutation definitions for testing
const TEST_MUTATIONS: Record<string, MutationDef> = {
  hyper_str: {
    category: 'passive',
    description: 'You are superhumanly strong (+4 STR, -1 INT, -1 WIS).',
    gainMessage: 'You turn into a superhuman he-man!',
    loseMessage: 'Your muscles revert to normal.',
    opposites: ['puny'],
    modifiers: { str: 4, int: -1, wis: -1 },
  },
  puny: {
    category: 'passive',
    description: 'You are puny (-4 STR, +2 DEX).',
    gainMessage: 'Your muscles wither away!',
    loseMessage: 'You no longer feel so weak.',
    opposites: ['hyper_str'],
    modifiers: { str: -4, dex: 2 },
  },
  fearless: {
    category: 'passive',
    description: 'You are fearless.',
    gainMessage: 'You become completely fearless!',
    loseMessage: 'You begin to feel fear again.',
    opposites: ['cowardice'],
    flags: ['fearless'],
  },
  cowardice: {
    category: 'random',
    description: 'You are subject to cowardice.',
    gainMessage: 'You become an incredible coward!',
    loseMessage: 'You are no longer an incredible coward!',
    chance: 30,
    opposites: ['fearless'],
    randomEffect: 'fear',
  },
  spit_acid: {
    category: 'activatable',
    description: 'You can spit acid (dam lvl).',
    gainMessage: 'You gain the ability to spit acid.',
    loseMessage: 'You lose the ability to spit acid.',
    activeName: 'Spit acid',
    level: 9,
    cost: 9,
    stat: 'dex',
    difficulty: 15,
    effect: { type: 'ball', element: 'acid', radius: 1 },
  },
  hypn_gaze: {
    category: 'activatable',
    description: 'Your gaze is hypnotic.',
    gainMessage: 'Your eyes look mesmerizing...',
    loseMessage: 'Your eyes no longer seem so interesting.',
    activeName: 'Hypnotic gaze',
    level: 12,
    cost: 12,
    stat: 'chr',
    difficulty: 18,
    effect: { type: 'charm', target: 'direction' },
  },
  horns: {
    category: 'random',
    description: 'You have horns (dam 2d6).',
    gainMessage: 'Horns pop out of your forehead!',
    loseMessage: 'Your horns shrink and disappear.',
    chance: 0, // No random trigger, just extra attack
    randomEffect: 'none', // No random effect, but grants extra attack
    extraAttack: { damage: { dice: 2, sides: 6, bonus: 0 } },
  },
  xtra_legs: {
    category: 'passive',
    description: 'You have an extra pair of legs (+3 speed, -1 DEX).',
    gainMessage: 'You grow an extra pair of legs!',
    loseMessage: 'Your extra pair of legs disappear.',
    speedMod: 3,
    modifiers: { dex: -1 },
  },
  iron_skin: {
    category: 'passive',
    description: 'Your skin is made of steel (-3 DEX, +25 AC).',
    gainMessage: 'Your skin turns to steel!',
    loseMessage: 'Your skin reverts to flesh.',
    opposites: ['scales', 'wart_skin', 'flesh_rot'],
    modifiers: { dex: -3 },
    acMod: 25,
  },
  scales: {
    category: 'passive',
    description: 'You have scales (-1 CHR, +10 AC).',
    gainMessage: 'Scales grow over your body!',
    loseMessage: 'Your scales fall away.',
    opposites: ['iron_skin'],
    modifiers: { chr: -1 },
    acMod: 10,
  },
  wart_skin: {
    category: 'passive',
    description: 'Your skin is covered with warts (-2 CHR, +5 AC).',
    gainMessage: 'Warts appear everywhere on you!',
    loseMessage: 'Your warts disappear.',
    opposites: ['iron_skin'],
    modifiers: { chr: -2 },
    acMod: 5,
  },
  short_leg: {
    category: 'passive',
    description: 'Your legs are short stubs (-3 speed, +1 CON).',
    gainMessage: 'Your legs turn into short stubs!',
    loseMessage: 'Your legs return to normal.',
    speedMod: -3,
    modifiers: { con: 1 },
  },
  regen: {
    category: 'passive',
    description: 'You are regenerating.',
    gainMessage: 'You start regenerating.',
    loseMessage: 'You stop regenerating.',
    opposites: ['flesh_rot'],
    flags: ['regen'],
  },
  esp: {
    category: 'passive',
    description: 'You have ESP (-1 CON).',
    gainMessage: 'You develop telepathic abilities!',
    loseMessage: 'You lose your telepathic abilities.',
    modifiers: { con: -1 },
    flags: ['telepathy'],
  },
  wings: {
    category: 'passive',
    description: 'You have wings (-1 CON, +3 CHR).',
    gainMessage: 'You grow a pair of wings.',
    loseMessage: 'Your wings fall off.',
    modifiers: { con: -1, chr: 3 },
    flags: ['levitation'],
  },
  limber: {
    category: 'passive',
    description: 'Your body is very limber (+3 DEX, -1 STR).',
    gainMessage: 'Your body becomes very limber.',
    loseMessage: 'Your body is no longer limber.',
    opposites: ['arthritis'],
    modifiers: { dex: 3, str: -1 },
  },
  moronic: {
    category: 'passive',
    description: 'You are moronic (-4 INT, -4 WIS).',
    gainMessage: 'Your brain turns to mush!',
    loseMessage: 'You are no longer moronic.',
    opposites: ['hyper_int'],
    modifiers: { int: -4, wis: -4 },
  },
  rteleport: {
    category: 'random',
    description: 'You are teleporting randomly.',
    gainMessage: 'Your position seems very uncertain...',
    loseMessage: 'Your position seems more certain.',
    chance: 50,
    randomEffect: 'teleport',
  },
  flatulent: {
    category: 'random',
    description: 'You are subject to uncontrollable flatulence.',
    gainMessage: 'You become subject to uncontrollable flatulence.',
    loseMessage: 'You are no longer subject to uncontrollable flatulence.',
    chance: 30,
    randomEffect: 'poison_ball',
  },
  normality: {
    category: 'random',
    description: 'You may be mutated, but you are recovering.',
    gainMessage: 'You feel strangely normal.',
    loseMessage: 'You feel normally strange.',
    chance: 50,
    randomEffect: 'lose_mutation',
  },
  hallu: {
    category: 'random',
    description: 'You have a hallucinatory insanity.',
    gainMessage: 'You are afflicted by a hallucinatory insanity!',
    loseMessage: 'You are no longer insane!',
    chance: 64,
    randomEffect: 'hallucination',
  },
};

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
    system.loadDefs(TEST_MUTATIONS);
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
      expect(result.message).toContain('superhuman he-man');
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
      expect(result.message).toContain('muscles revert');
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
    it('hyper_str provides +4 STR, -1 INT, -1 WIS', () => {
      system.gainMutation(player, 'hyper_str', RNG);

      const mods = system.getStatModifiers(player);

      expect(mods.str).toBe(4);
      expect(mods.int).toBe(-1);
      expect(mods.wis).toBe(-1);
    });

    it('xtra_legs provides +3 speed', () => {
      system.gainMutation(player, 'xtra_legs', RNG);

      const speedMod = system.getSpeedModifier(player);

      expect(speedMod).toBe(3);
    });

    it('iron_skin provides +25 AC and -3 DEX', () => {
      system.gainMutation(player, 'iron_skin', RNG);

      const acMod = system.getAcModifier(player);
      const statMods = system.getStatModifiers(player);

      expect(acMod).toBe(25);
      expect(statMods.dex).toBe(-3);
    });

    it('short_leg provides -3 speed and +1 CON', () => {
      system.gainMutation(player, 'short_leg', RNG);

      const speedMod = system.getSpeedModifier(player);
      const statMods = system.getStatModifiers(player);

      expect(speedMod).toBe(-3);
      expect(statMods.con).toBe(1);
    });

    it('multiple AC mutations stack', () => {
      system.gainMutation(player, 'scales', RNG);
      system.gainMutation(player, 'wart_skin', RNG);

      const acMod = system.getAcModifier(player);

      // scales: +10 AC, wart_skin: +5 AC
      expect(acMod).toBe(15);
    });

    it('multiple mutations stack modifiers', () => {
      system.gainMutation(player, 'hyper_str', RNG);
      system.gainMutation(player, 'xtra_legs', RNG);

      const mods = system.getStatModifiers(player);

      // hyper_str: +4 STR, -1 INT, -1 WIS
      // xtra_legs: -1 DEX
      expect(mods.str).toBe(4);
      expect(mods.int).toBe(-1);
      expect(mods.wis).toBe(-1);
      expect(mods.dex).toBe(-1);
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
      expect(activatable[0].activeName).toBe('Spit acid');
    });

    it('getRandom returns only random mutations', () => {
      system.gainMutation(player, 'spit_acid', RNG);
      system.gainMutation(player, 'cowardice', RNG);
      system.gainMutation(player, 'hyper_str', RNG);

      const random = system.getRandom(player);

      expect(random.length).toBe(1);
      expect(random[0].randomEffect).toBe('fear');
    });

    it('getPassive returns only passive mutations', () => {
      system.gainMutation(player, 'spit_acid', RNG);
      system.gainMutation(player, 'hyper_str', RNG);
      system.gainMutation(player, 'xtra_legs', RNG);

      const passive = system.getPassive(player);

      expect(passive.length).toBe(2);
    });
  });

  describe('getDef', () => {
    it('returns mutation definition by key', () => {
      const def = system.getDef('hyper_str');

      expect(def).toBeDefined();
      expect(def?.description).toContain('superhumanly strong');
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
      // Base stats: str: 16, int: 14, wis: 12, dex: 15, con: 14, chr: 10
      expect(player.currentStats.str).toBe(16);
      expect(player.currentStats.int).toBe(14);

      // Gain hyper_str: +4 STR, -1 INT, -1 WIS
      system.gainMutation(player, 'hyper_str', RNG);

      expect(player.currentStats.str).toBe(20); // 16 + 4
      expect(player.currentStats.int).toBe(13); // 14 - 1
      expect(player.currentStats.wis).toBe(11); // 12 - 1
    });

    it('player speed includes mutation modifiers', () => {
      const baseSpeed = player.speed; // 110

      // Gain xtra_legs: +3 speed
      system.gainMutation(player, 'xtra_legs', RNG);

      expect(player.speed).toBe(baseSpeed + 3);
    });

    it('player speed can be reduced by mutations', () => {
      const baseSpeed = player.speed;

      // Gain short_leg: -3 speed
      system.gainMutation(player, 'short_leg', RNG);

      expect(player.speed).toBe(baseSpeed - 3);
    });

    it('player totalAc includes mutation AC bonuses', () => {
      const baseAc = player.totalAc; // 0 with no equipment

      // Gain iron_skin: +25 AC
      system.gainMutation(player, 'iron_skin', RNG);

      expect(player.totalAc).toBe(baseAc + 25);
    });

    it('multiple mutations stack on player stats', () => {
      // hyper_str: +4 STR, -1 INT, -1 WIS
      // puny would cancel hyper_str, so use limber instead: +3 DEX, -1 STR
      system.gainMutation(player, 'hyper_str', RNG);
      system.gainMutation(player, 'limber', RNG);

      // hyper_str: +4 STR, -1 INT, -1 WIS
      // limber: +3 DEX, -1 STR
      // Net: +3 STR, -1 INT, -1 WIS, +3 DEX
      expect(player.currentStats.str).toBe(16 + 4 - 1); // 19
      expect(player.currentStats.int).toBe(14 - 1); // 13
      expect(player.currentStats.dex).toBe(15 + 3); // 18
    });

    it('player hasMutationFlag checks flags correctly', () => {
      expect(player.hasMutationFlag('fearless')).toBe(false);

      system.gainMutation(player, 'fearless', RNG);

      expect(player.hasMutationFlag('fearless')).toBe(true);
    });

    it('losing mutation removes its effect on player stats', () => {
      system.gainMutation(player, 'hyper_str', RNG);
      expect(player.currentStats.str).toBe(20);

      system.loseMutation(player, 'hyper_str', RNG);

      expect(player.currentStats.str).toBe(16); // Back to base
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

      // Gain moronic: -4 INT, -4 WIS
      system.gainMutation(weakPlayer, 'moronic', RNG);

      // INT would be 5 - 4 = 1, but clamped to 3
      expect(weakPlayer.currentStats.int).toBe(3);
      expect(weakPlayer.currentStats.wis).toBe(3);
    });
  });

  describe('random mutation tick processing', () => {
    it('mutation with chance 0 never triggers', () => {
      // horns has chance: 0
      system.gainMutation(player, 'horns', RNG);

      // Run many ticks - should never trigger
      for (let i = 0; i < 100; i++) {
        const result = system.tickRandomMutations(player, RNG);
        expect(result.effectsTriggered).not.toContain('none');
      }
    });

    it('mutation with high chance eventually triggers', () => {
      // rteleport has 50% chance
      system.gainMutation(player, 'rteleport', RNG);

      // Run enough ticks that it should trigger at least once
      let triggered = false;
      for (let i = 0; i < 100; i++) {
        const result = system.tickRandomMutations(player, RNG);
        if (result.effectsTriggered.includes('teleport')) {
          triggered = true;
          break;
        }
      }
      expect(triggered).toBe(true);
    });

    it('cowardice triggers fear effect', () => {
      // cowardice has 30% chance, triggers 'fear'
      system.gainMutation(player, 'cowardice', RNG);

      // Run enough ticks to trigger
      let triggered = false;
      for (let i = 0; i < 200; i++) {
        const result = system.tickRandomMutations(player, RNG);
        if (result.effectsTriggered.includes('fear')) {
          triggered = true;
          break;
        }
      }
      expect(triggered).toBe(true);
    });

    it('flatulent triggers poison_ball effect', () => {
      system.gainMutation(player, 'flatulent', RNG);

      let triggered = false;
      for (let i = 0; i < 200; i++) {
        const result = system.tickRandomMutations(player, RNG);
        if (result.effectsTriggered.includes('poison_ball')) {
          triggered = true;
          break;
        }
      }
      expect(triggered).toBe(true);
    });

    it('normality triggers lose_mutation effect', () => {
      system.gainMutation(player, 'normality', RNG);

      let triggered = false;
      for (let i = 0; i < 100; i++) {
        const result = system.tickRandomMutations(player, RNG);
        if (result.effectsTriggered.includes('lose_mutation')) {
          triggered = true;
          break;
        }
      }
      expect(triggered).toBe(true);
    });

    it('hallu triggers hallucination effect', () => {
      system.gainMutation(player, 'hallu', RNG);

      let triggered = false;
      for (let i = 0; i < 100; i++) {
        const result = system.tickRandomMutations(player, RNG);
        if (result.effectsTriggered.includes('hallucination')) {
          triggered = true;
          break;
        }
      }
      expect(triggered).toBe(true);
    });

    it('multiple random mutations can all trigger', () => {
      system.gainMutation(player, 'rteleport', RNG); // 50% teleport
      system.gainMutation(player, 'hallu', RNG); // 64% hallucination

      const teleportTriggered = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const result = system.tickRandomMutations(player, RNG);
        for (const effect of result.effectsTriggered) {
          teleportTriggered.add(effect);
        }
      }

      // Both should have triggered at least once
      expect(teleportTriggered.has('teleport')).toBe(true);
      expect(teleportTriggered.has('hallucination')).toBe(true);
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
      // spit_acid: level 9, cost 9, stat: dex, difficulty 15
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
      // hypn_gaze: level 12, cost 12
      const lowLevelPlayer = new Player({
        id: 'low-level',
        position: { x: 0, y: 0 },
        maxHp: 100,
        speed: 110,
        stats: { str: 10, int: 18, wis: 10, dex: 10, con: 10, chr: 10 },
        level: 5, // Too low for hypn_gaze (level 12)
        classDef: casterClassDef,
      });
      system.gainMutation(lowLevelPlayer, 'hypn_gaze', RNG);

      const result = system.canActivateMutation(lowLevelPlayer, 'hypn_gaze');

      expect(result.canActivate).toBe(false);
      expect(result.reason).toContain('level');
    });

    it('canActivate returns false when player lacks mana', () => {
      system.gainMutation(player, 'spit_acid', RNG);
      // Spend most mana so we don't have enough for spit_acid (cost 9)
      const toSpend = player.maxMana - 5;
      if (toSpend > 0) player.spendMana(toSpend);

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

      const result = system.tryActivateMutation(player, 'spit_acid', RNG);

      expect(result.activated).toBe(true);
      expect(result.effect).toBeDefined();
      expect(result.effect?.type).toBe('ball');
      expect(player.currentMana).toBe(initialMana - 9);
    });

    it('tryActivate can fail stat check', () => {
      // Create player with low DEX for spit_acid stat check
      const lowDexPlayer = new Player({
        id: 'low-dex',
        position: { x: 0, y: 0 },
        maxHp: 100,
        speed: 110,
        stats: { str: 10, int: 18, wis: 10, dex: 3, con: 10, chr: 10 }, // Very low DEX
        level: 15,
        classDef: casterClassDef,
      });
      system.gainMutation(lowDexPlayer, 'spit_acid', RNG);

      // With very low DEX, stat check might fail
      // Run multiple times to see if it can fail
      let failedOnce = false;
      for (let i = 0; i < 50; i++) {
        // Skip if not enough mana
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
      // With DEX 3, difficulty 15, the check should be able to fail
      expect(failedOnce).toBe(true);
    });

    it('tryActivate returns effect definition for execution', () => {
      system.gainMutation(player, 'spit_acid', RNG);

      const result = system.tryActivateMutation(player, 'spit_acid', RNG);

      expect(result.activated).toBe(true);
      expect(result.effect).toEqual({
        type: 'ball',
        element: 'acid',
        radius: 1,
        // damage is calculated by evaluating "level" expression
      });
    });

    it('vampirism mutation returns drainLife effect', () => {
      // Add vampirism to test mutations
      system.loadDefs({
        ...TEST_MUTATIONS,
        vampirism: {
          category: 'activatable',
          description: 'You can drain life from a foe like a vampire.',
          gainMessage: 'You become vampiric.',
          loseMessage: 'You are no longer vampiric.',
          activeName: 'Vampiric drain',
          level: 10,
          cost: 10,
          stat: 'con',
          difficulty: 9,
          effect: { type: 'drainLife', damage: 'level * 2' },
        },
      });
      player.gainExperience(10000);
      system.gainMutation(player, 'vampirism', RNG);

      const result = system.tryActivateMutation(player, 'vampirism', RNG);

      expect(result.activated).toBe(true);
      expect(result.effect?.type).toBe('drainLife');
    });

    it('berserk mutation returns status effect', () => {
      // Add berserk to test mutations
      system.loadDefs({
        ...TEST_MUTATIONS,
        berserk_mut: {
          category: 'activatable',
          description: 'You can drive yourself into a berserk frenzy.',
          gainMessage: 'You feel a controlled rage.',
          loseMessage: 'You no longer feel a controlled rage.',
          activeName: 'Berserk',
          level: 8,
          cost: 8,
          stat: 'str',
          difficulty: 14,
          effect: { type: 'applyStatus', status: 'berserk', duration: '25 + d25' },
        },
      });
      system.gainMutation(player, 'berserk_mut', RNG);

      const result = system.tryActivateMutation(player, 'berserk_mut', RNG);

      expect(result.activated).toBe(true);
      expect(result.effect?.type).toBe('applyStatus');
    });
  });
});
