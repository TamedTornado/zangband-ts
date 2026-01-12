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

    it('iron_skin provides +25 AC', () => {
      system.gainMutation(player, 'iron_skin', RNG);

      const acMod = system.getAcModifier(player);

      expect(acMod).toBe(25);
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

    it('no mutations means no flags', () => {
      expect(system.hasFlag(player, 'fearless')).toBe(false);
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
});
