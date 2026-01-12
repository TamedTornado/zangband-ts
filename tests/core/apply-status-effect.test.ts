import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RNG } from 'rot-js';
import { ApplyStatusEffect } from '@/core/systems/effects/ApplyStatusEffect';
import { Player } from '@/core/entities/Player';
import { Monster } from '@/core/entities/Monster';
import { loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';
import type { GPEffectContext } from '@/core/systems/effects/GPEffect';

describe('ApplyStatusEffect saving throws', () => {
  beforeEach(() => {
    loadStatusDefs(statusesData);
    RNG.setSeed(12345);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createPlayer(savingScore: number): Player {
    // Create player with specific saving throw score
    const classDef = {
      index: 0,
      name: 'Test',
      stats: { str: 0, int: 0, wis: 0, dex: 0, con: 0, chr: 0 },
      skills: { disarm: 0, device: 0, save: savingScore, stealth: 0, search: 0, searchFreq: 0, melee: 0, ranged: 0 },
      xSkills: { disarm: 0, device: 0, save: 0, stealth: 0, search: 0, searchFreq: 0, melee: 0, ranged: 0 },
      hitDie: 10,
      expMod: 0,
      petUpkeepDiv: 1,
      heavySense: false,
      spellStat: 'int' as const,
      spellFirst: 1,
      spellWeight: 300,
      realms: [],
      secondaryRealm: false,
    };
    return new Player({
      id: 'test-player',
      position: { x: 5, y: 5 },
      maxHp: 100,
      speed: 110,
      stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      classDef,
    });
  }

  function createContext(player: Player): GPEffectContext {
    return {
      actor: player,
      rng: RNG,
      level: {} as any,
    };
  }

  it('applies status without saving throw when allowSave is false', () => {
    const player = createPlayer(50);
    const context = createContext(player);

    const effect = new ApplyStatusEffect({
      type: 'applyStatus',
      status: 'confused',
      duration: 10,
      allowSave: false,
    });

    const result = effect.execute(context);

    expect(result.success).toBe(true);
    expect(player.statuses.has('confused')).toBe(true);
  });

  it('applies status without saving throw when allowSave is not specified', () => {
    const player = createPlayer(50);
    const context = createContext(player);

    const effect = new ApplyStatusEffect({
      type: 'applyStatus',
      status: 'confused',
      duration: 10,
    });

    const result = effect.execute(context);

    expect(result.success).toBe(true);
    expect(player.statuses.has('confused')).toBe(true);
  });

  it('blocks status when saving throw succeeds', () => {
    const player = createPlayer(80); // High saving score
    const context = createContext(player);

    // Mock RNG to return low value (save succeeds)
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(10);

    const effect = new ApplyStatusEffect({
      type: 'applyStatus',
      status: 'confused',
      duration: 10,
      allowSave: true,
    });

    const result = effect.execute(context);

    expect(result.success).toBe(true);
    expect(player.statuses.has('confused')).toBe(false);
    expect(result.messages).toContainEqual(expect.stringContaining('resist'));
  });

  it('applies status when saving throw fails', () => {
    const player = createPlayer(20); // Low saving score
    const context = createContext(player);

    // Mock RNG to return high value (save fails)
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(90);

    const effect = new ApplyStatusEffect({
      type: 'applyStatus',
      status: 'confused',
      duration: 10,
      allowSave: true,
    });

    const result = effect.execute(context);

    expect(result.success).toBe(true);
    expect(player.statuses.has('confused')).toBe(true);
  });

  it('applies saveDifficulty modifier to saving throw', () => {
    const player = createPlayer(50);
    const context = createContext(player);

    // Roll 40 - with no difficulty, save 50 would succeed (40 < 50)
    // With difficulty 20, effective save = 30, roll 40 should fail (40 >= 30)
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(40);

    const effect = new ApplyStatusEffect({
      type: 'applyStatus',
      status: 'confused',
      duration: 10,
      allowSave: true,
      saveDifficulty: 20,
    });

    const result = effect.execute(context);

    expect(result.success).toBe(true);
    expect(player.statuses.has('confused')).toBe(true);
  });

  it('applies status to low-level monster when save fails', () => {
    const player = createPlayer(50);
    const monsterDef = {
      key: 'kobold',
      name: 'Kobold',
      symbol: 'k',
      color: '#00ff00',
      speed: 110,
      hp: '1d8',
      ac: 10,
      depth: 1, // Low level monster
      rarity: 1,
      exp: 5,
      alertness: 0,
      vision: 20,
      flags: [],
      spellFrequency: 0,
      spellFlags: [],
      attacks: [],
      description: '',
      index: 1,
    };
    const monster = new Monster({
      id: 'test-monster',
      position: { x: 6, y: 5 },
      def: monsterDef as any,
      maxHp: 10,
      speed: 110,
      symbol: 'k',
      color: '#00ff00',
    });

    const context: GPEffectContext = {
      actor: player,
      targetActor: monster,
      rng: RNG,
      level: {} as any,
      getMonsterInfo: () => ({
        name: 'Kobold',
        article: 'a',
        flags: [],
        color: '#fff',
        symbol: 'k',
      }),
    };

    // Low level (depth 1) monster with saveDifficulty 10 -> roll range 1-30
    // Monster needs depth > roll to save. With depth 1, almost never saves
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(15);

    const effect = new ApplyStatusEffect({
      type: 'applyStatus',
      status: 'slow',
      duration: 10,
      allowSave: true,
      saveDifficulty: 10,
    });

    const result = effect.execute(context);

    expect(result.success).toBe(true);
    expect(monster.statuses.has('slow')).toBe(true);
  });

  it('blocks status for high-level monster when save succeeds', () => {
    const player = createPlayer(50);
    const monsterDef = {
      key: 'ancient_dragon',
      name: 'Ancient Dragon',
      symbol: 'D',
      color: '#ff0000',
      speed: 120,
      hp: '100d10',
      ac: 100,
      depth: 50, // High level monster
      rarity: 1,
      exp: 10000,
      alertness: 0,
      vision: 20,
      flags: [],
      spellFrequency: 0,
      spellFlags: [],
      attacks: [],
      description: '',
      index: 2,
    };
    const monster = new Monster({
      id: 'test-monster',
      position: { x: 6, y: 5 },
      def: monsterDef as any,
      maxHp: 500,
      speed: 120,
      symbol: 'D',
      color: '#ff0000',
    });

    const context: GPEffectContext = {
      actor: player,
      targetActor: monster,
      rng: RNG,
      level: {} as any,
      getMonsterInfo: () => ({
        name: 'Ancient Dragon',
        article: 'an',
        flags: [],
        color: '#ff0000',
        symbol: 'D',
      }),
    };

    // High level (depth 50) monster with saveDifficulty 10 -> roll range 1-30
    // Monster needs depth > roll. With depth 50 and roll 15, saves easily
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(15);

    const effect = new ApplyStatusEffect({
      type: 'applyStatus',
      status: 'slow',
      duration: 10,
      allowSave: true,
      saveDifficulty: 10,
    });

    const result = effect.execute(context);

    expect(result.success).toBe(true);
    expect(monster.statuses.has('slow')).toBe(false);
    expect(result.messages).toContainEqual(expect.stringContaining('resists'));
  });

  it('UNIQUE monsters always resist status effects with saves', () => {
    const player = createPlayer(50);
    const monsterDef = {
      key: 'morgoth',
      name: 'Morgoth',
      symbol: 'P',
      color: '#ffffff',
      speed: 130,
      hp: '1000d10',
      ac: 150,
      depth: 100,
      rarity: 1,
      exp: 100000,
      alertness: 0,
      vision: 20,
      flags: ['UNIQUE'],
      spellFrequency: 0,
      spellFlags: [],
      attacks: [],
      description: '',
      index: 3,
    };
    const monster = new Monster({
      id: 'test-monster',
      position: { x: 6, y: 5 },
      def: monsterDef as any,
      maxHp: 10000,
      speed: 130,
      symbol: 'P',
      color: '#ffffff',
    });

    const context: GPEffectContext = {
      actor: player,
      targetActor: monster,
      rng: RNG,
      level: {} as any,
      getMonsterInfo: () => ({
        name: 'Morgoth',
        article: '',
        flags: ['UNIQUE'],
        color: '#ffffff',
        symbol: 'P',
      }),
    };

    const effect = new ApplyStatusEffect({
      type: 'applyStatus',
      status: 'slow',
      duration: 10,
      allowSave: true,
      saveDifficulty: 10,
    });

    const result = effect.execute(context);

    expect(result.success).toBe(true);
    expect(monster.statuses.has('slow')).toBe(false);
    expect(result.messages).toContainEqual(expect.stringContaining('resists'));
  });

  it('works with different status effects', () => {
    const player = createPlayer(80);
    const context = createContext(player);

    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(10); // Save succeeds

    const statuses = ['blind', 'paralyzed', 'afraid', 'slow'];

    for (const status of statuses) {
      const effect = new ApplyStatusEffect({
        type: 'applyStatus',
        status,
        duration: 10,
        allowSave: true,
      });

      effect.execute(context);
      expect(player.statuses.has(status)).toBe(false);
    }
  });
});
