import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { RNG } from 'rot-js';
import {
  getPlayerResistLevel,
  applyPlayerResistance,
  getMonsterResistStatus,
  applyMonsterResistance,
  applyDamageToPlayer,
  applyDamageToMonster,
} from '@/core/systems/Damage';
import { Element } from '@/core/types';
import { Player } from '@/core/entities/Player';
import { Actor } from '@/core/entities/Actor';
import { createStatus, loadStatusDefs } from '@/core/systems/status';
import statusesData from '@/data/statuses.json';

describe('Damage System', () => {
  beforeAll(() => {
    loadStatusDefs(statusesData);
  });

  beforeEach(() => {
    RNG.setSeed(12345);
  });

  describe('Player Resistance Level', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({
        id: 'player',
        position: { x: 0, y: 0 },
        maxHp: 100,
        speed: 110,
        stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      });
    });

    it('returns 9 (no resistance) by default', () => {
      expect(getPlayerResistLevel(player, Element.Fire)).toBe(9);
      expect(getPlayerResistLevel(player, Element.Cold)).toBe(9);
      expect(getPlayerResistLevel(player, Element.Acid)).toBe(9);
    });

    it('returns 3 with temporary opposition status', () => {
      const opposeStatus = createStatus('oppose_fire', { duration: 10 });
      player.statuses.add(opposeStatus, player);
      expect(getPlayerResistLevel(player, Element.Fire)).toBe(3);
      // Other elements unaffected
      expect(getPlayerResistLevel(player, Element.Cold)).toBe(9);
    });

    it('returns 9 for elements without oppose status', () => {
      // Chaos has no oppose status
      expect(getPlayerResistLevel(player, Element.Chaos)).toBe(9);
    });
  });

  describe('Player Resistance Formula', () => {
    it('returns full damage at level 9 (no resistance)', () => {
      // Formula: (dam * level + 8) / 9
      // (100 * 9 + 8) / 9 = 908 / 9 = 100
      expect(applyPlayerResistance(100, 9)).toBe(100);
    });

    it('returns ~33% damage at level 3 (one resistance)', () => {
      // (100 * 3 + 8) / 9 = 308 / 9 = 34
      expect(applyPlayerResistance(100, 3)).toBe(34);
    });

    it('returns ~11% damage at level 1 (resist + oppose)', () => {
      // (100 * 1 + 8) / 9 = 108 / 9 = 12
      expect(applyPlayerResistance(100, 1)).toBe(12);
    });

    it('returns 0 damage at level 0 (immune)', () => {
      expect(applyPlayerResistance(100, 0)).toBe(0);
    });

    it('returns 200% damage at level 18 (vulnerable)', () => {
      // (100 * 18 + 8) / 9 = 1808 / 9 = 200
      expect(applyPlayerResistance(100, 18)).toBe(200);
    });

    it('rounds up with +8 in formula', () => {
      // (10 * 3 + 8) / 9 = 38 / 9 = 4.22 -> 4
      expect(applyPlayerResistance(10, 3)).toBe(4);
      // (1 * 3 + 8) / 9 = 11 / 9 = 1.22 -> 1
      expect(applyPlayerResistance(1, 3)).toBe(1);
    });
  });

  describe('Monster Resistance Status', () => {
    it('returns normal with no flags', () => {
      expect(getMonsterResistStatus([], Element.Fire)).toBe('normal');
    });

    it('returns immune with IM_* flag', () => {
      expect(getMonsterResistStatus(['IM_FIRE'], Element.Fire)).toBe('immune');
      expect(getMonsterResistStatus(['IM_COLD'], Element.Cold)).toBe('immune');
      expect(getMonsterResistStatus(['IM_ACID'], Element.Acid)).toBe('immune');
      expect(getMonsterResistStatus(['IM_ELEC'], Element.Lightning)).toBe('immune');
      expect(getMonsterResistStatus(['IM_POIS'], Element.Poison)).toBe('immune');
    });

    it('returns resists with RES_* flag', () => {
      expect(getMonsterResistStatus(['RES_FIRE'], Element.Fire)).toBe('resists');
      expect(getMonsterResistStatus(['RES_NETHER'], Element.Nether)).toBe('resists');
      expect(getMonsterResistStatus(['RES_CHAOS'], Element.Chaos)).toBe('resists');
    });

    it('returns vulnerable with HURT_* flag', () => {
      expect(getMonsterResistStatus(['HURT_FIRE'], Element.Fire)).toBe('vulnerable');
      expect(getMonsterResistStatus(['HURT_COLD'], Element.Cold)).toBe('vulnerable');
      expect(getMonsterResistStatus(['HURT_LITE'], Element.Light)).toBe('vulnerable');
    });

    it('immunity takes precedence over vulnerability', () => {
      // If somehow both flags exist, immunity wins
      expect(getMonsterResistStatus(['IM_FIRE', 'HURT_FIRE'], Element.Fire)).toBe('immune');
    });

    it('vulnerability takes precedence over resistance', () => {
      expect(getMonsterResistStatus(['RES_FIRE', 'HURT_FIRE'], Element.Fire)).toBe('vulnerable');
    });

    it('returns normal for elements without flag mappings', () => {
      expect(getMonsterResistStatus(['IM_FIRE'], Element.Magic)).toBe('normal');
      expect(getMonsterResistStatus(['IM_FIRE'], Element.Physical)).toBe('normal');
    });
  });

  describe('Monster Resistance Formula', () => {
    it('returns full damage for normal status', () => {
      expect(applyMonsterResistance(100, 'normal', RNG)).toBe(100);
    });

    it('returns ~11% damage for immune status (dam/9)', () => {
      expect(applyMonsterResistance(100, 'immune', RNG)).toBe(11);
      expect(applyMonsterResistance(90, 'immune', RNG)).toBe(10);
      expect(applyMonsterResistance(9, 'immune', RNG)).toBe(1);
    });

    it('returns ~25-43% damage for resists status', () => {
      // dam * 3 / rand(7-12) = 300 / 7-12 = 25-42
      const results: number[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(applyMonsterResistance(100, 'resists', RNG));
      }
      const min = Math.min(...results);
      const max = Math.max(...results);
      expect(min).toBeGreaterThanOrEqual(25); // 300/12 = 25
      expect(max).toBeLessThanOrEqual(42); // 300/7 = 42
    });

    it('returns 200% damage for vulnerable status', () => {
      expect(applyMonsterResistance(100, 'vulnerable', RNG)).toBe(200);
      expect(applyMonsterResistance(50, 'vulnerable', RNG)).toBe(100);
    });
  });

  describe('applyDamageToPlayer', () => {
    let player: Player;

    beforeEach(() => {
      player = new Player({
        id: 'player',
        position: { x: 0, y: 0 },
        maxHp: 100,
        speed: 110,
        stats: { str: 10, int: 10, wis: 10, dex: 10, con: 10, chr: 10 },
      });
    });

    it('applies full damage without resistance', () => {
      const result = applyDamageToPlayer(player, 30, Element.Fire, RNG);
      expect(result.originalDamage).toBe(30);
      expect(result.finalDamage).toBe(30);
      expect(player.hp).toBe(70);
      expect(result.resistStatus).toBe('normal');
      expect(result.message).toContain('30');
      expect(result.message).toContain('fire');
    });

    it('applies reduced damage with oppose status', () => {
      const opposeStatus = createStatus('oppose_fire', { duration: 10 });
      player.statuses.add(opposeStatus, player);
      const result = applyDamageToPlayer(player, 30, Element.Fire, RNG);
      // Level 3: (30 * 3 + 8) / 9 = 98 / 9 = 10
      expect(result.finalDamage).toBe(10);
      expect(player.hp).toBe(90);
      expect(result.resistStatus).toBe('resists');
    });

    it('reports killed status correctly', () => {
      const result = applyDamageToPlayer(player, 150, Element.Fire, RNG);
      expect(result.killed).toBe(true);
      expect(player.isDead).toBe(true);
    });
  });

  describe('applyDamageToMonster', () => {
    let monster: Actor;

    beforeEach(() => {
      monster = new Actor({
        id: 'monster',
        position: { x: 5, y: 5 },
        symbol: 'k',
        color: '#0f0',
        maxHp: 50,
        speed: 110,
      });
    });

    it('applies full damage without resistance', () => {
      const info = { name: 'kobold', flags: [] };
      const result = applyDamageToMonster(monster, info, 20, Element.Fire, RNG);
      expect(result.finalDamage).toBe(20);
      expect(monster.hp).toBe(30);
      expect(result.resistStatus).toBe('normal');
      expect(result.message).toContain('kobold');
    });

    it('applies reduced damage with immunity', () => {
      const info = { name: 'fire elemental', flags: ['IM_FIRE'] };
      const result = applyDamageToMonster(monster, info, 90, Element.Fire, RNG);
      expect(result.finalDamage).toBe(10); // 90/9
      expect(monster.hp).toBe(40);
      expect(result.resistStatus).toBe('resists_lot');
      expect(result.message).toContain('resists a lot');
    });

    it('applies reduced damage with resistance', () => {
      const info = { name: 'red dragon', flags: ['RES_FIRE'] };
      const result = applyDamageToMonster(monster, info, 100, Element.Fire, RNG);
      // 100 * 3 / rand(7-12) = 25-42
      expect(result.finalDamage).toBeGreaterThanOrEqual(25);
      expect(result.finalDamage).toBeLessThanOrEqual(42);
      expect(result.resistStatus).toBe('resists');
      expect(result.message).toContain('resists');
    });

    it('applies double damage with vulnerability', () => {
      const info = { name: 'ice troll', flags: ['HURT_FIRE'] };
      const result = applyDamageToMonster(monster, info, 20, Element.Fire, RNG);
      expect(result.finalDamage).toBe(40);
      expect(monster.hp).toBe(10);
      expect(result.resistStatus).toBe('vulnerable');
      expect(result.message).toContain('hit hard');
    });

    it('reports killed status correctly', () => {
      const info = { name: 'kobold', flags: [] };
      const result = applyDamageToMonster(monster, info, 100, Element.Fire, RNG);
      expect(result.killed).toBe(true);
      expect(monster.isDead).toBe(true);
    });

    it('handles magic element (no resistances)', () => {
      const info = { name: 'golem', flags: ['IM_FIRE', 'IM_COLD', 'IM_ELEC'] };
      const result = applyDamageToMonster(monster, info, 30, Element.Magic, RNG);
      // Magic has no resistance flags
      expect(result.finalDamage).toBe(30);
      expect(result.resistStatus).toBe('normal');
    });
  });
});
