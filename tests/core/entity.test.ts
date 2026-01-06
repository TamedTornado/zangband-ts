import { describe, it, expect } from 'vitest';
import { Entity } from '@/core/entities/Entity';
import { Actor } from '@/core/entities/Actor';
import { Item } from '@/core/entities/Item';
import { Player } from '@/core/entities/Player';
import { Monster } from '@/core/entities/Monster';

describe('Entity', () => {
  it('should have id, position, symbol, color', () => {
    const entity = new Entity({
      id: 'test-1',
      position: { x: 5, y: 10 },
      symbol: '@',
      color: '#fff',
    });

    expect(entity.id).toBe('test-1');
    expect(entity.position).toEqual({ x: 5, y: 10 });
    expect(entity.symbol).toBe('@');
    expect(entity.color).toBe('#fff');
  });

  it('should return a copy of position (immutable)', () => {
    const entity = new Entity({
      id: 'test-1',
      position: { x: 5, y: 10 },
      symbol: '@',
      color: '#fff',
    });

    const pos = entity.position;
    pos.x = 999;
    expect(entity.position.x).toBe(5);
  });

  it('should allow setting position', () => {
    const entity = new Entity({
      id: 'test-1',
      position: { x: 5, y: 10 },
      symbol: '@',
      color: '#fff',
    });

    entity.position = { x: 20, y: 30 };
    expect(entity.position).toEqual({ x: 20, y: 30 });
  });
});

describe('Actor', () => {
  it('should extend Entity with hp and energy', () => {
    const actor = new Actor({
      id: 'actor-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 50,
      speed: 110,
    });

    expect(actor.id).toBe('actor-1');
    expect(actor.symbol).toBe('k');
    expect(actor.maxHp).toBe(50);
    expect(actor.hp).toBe(50); // starts at max
    expect(actor.speed).toBe(110);
    expect(actor.energy).toBe(0); // starts at 0
  });

  it('should track hp changes', () => {
    const actor = new Actor({
      id: 'actor-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 50,
      speed: 110,
    });

    actor.hp = 30;
    expect(actor.hp).toBe(30);

    actor.hp = -10; // should clamp to 0
    expect(actor.hp).toBe(0);

    actor.hp = 100; // should clamp to maxHp
    expect(actor.hp).toBe(50);
  });

  it('should report isDead when hp <= 0', () => {
    const actor = new Actor({
      id: 'actor-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 50,
      speed: 110,
    });

    expect(actor.isDead).toBe(false);
    actor.hp = 0;
    expect(actor.isDead).toBe(true);
  });

  it('should gain energy based on speed', () => {
    const actor = new Actor({
      id: 'actor-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 50,
      speed: 110, // normal speed
    });

    actor.gainEnergy();
    expect(actor.energy).toBe(110);

    actor.gainEnergy();
    expect(actor.energy).toBe(220);
  });

  it('should spend energy on actions', () => {
    const actor = new Actor({
      id: 'actor-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 50,
      speed: 110,
    });

    actor.gainEnergy();
    expect(actor.energy).toBe(110);

    actor.spendEnergy(100);
    expect(actor.energy).toBe(10);
  });

  it('should report canAct when energy >= 100', () => {
    const actor = new Actor({
      id: 'actor-1',
      position: { x: 0, y: 0 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 50,
      speed: 110,
    });

    expect(actor.canAct).toBe(false);
    actor.gainEnergy();
    expect(actor.canAct).toBe(true);
  });
});

describe('Item', () => {
  it('should extend Entity with item properties', () => {
    const item = new Item({
      id: 'item-1',
      position: { x: 3, y: 4 },
      symbol: '!',
      color: '#00f',
      name: 'Potion of Healing',
      itemType: 'potion',
    });

    expect(item.id).toBe('item-1');
    expect(item.symbol).toBe('!');
    expect(item.name).toBe('Potion of Healing');
    expect(item.itemType).toBe('potion');
  });

  it('should support stacking with quantity', () => {
    const item = new Item({
      id: 'item-1',
      position: { x: 3, y: 4 },
      symbol: '!',
      color: '#00f',
      name: 'Potion of Healing',
      itemType: 'potion',
      quantity: 5,
    });

    expect(item.quantity).toBe(5);
  });

  it('should default quantity to 1', () => {
    const item = new Item({
      id: 'item-1',
      position: { x: 3, y: 4 },
      symbol: '!',
      color: '#00f',
      name: 'Potion of Healing',
      itemType: 'potion',
    });

    expect(item.quantity).toBe(1);
  });
});

describe('Player', () => {
  it('should extend Actor with stats', () => {
    const player = new Player({
      id: 'player-1',
      position: { x: 10, y: 10 },
      maxHp: 100,
      speed: 110,
      stats: { str: 16, int: 12, wis: 10, dex: 14, con: 15, chr: 11 },
    });

    expect(player.symbol).toBe('@');
    expect(player.color).toBe('#fff');
    expect(player.maxHp).toBe(100);
    expect(player.stats.str).toBe(16);
    expect(player.stats.dex).toBe(14);
  });

  it('should have empty inventory initially', () => {
    const player = new Player({
      id: 'player-1',
      position: { x: 10, y: 10 },
      maxHp: 100,
      speed: 110,
      stats: { str: 16, int: 12, wis: 10, dex: 14, con: 15, chr: 11 },
    });

    expect(player.inventory).toEqual([]);
  });

  it('should track known spells', () => {
    const player = new Player({
      id: 'player-1',
      position: { x: 10, y: 10 },
      maxHp: 100,
      speed: 110,
      stats: { str: 16, int: 12, wis: 10, dex: 14, con: 15, chr: 11 },
    });

    expect(player.knownSpells).toEqual([]);
  });
});

describe('Monster', () => {
  it('should extend Actor with monster definition reference', () => {
    const monster = new Monster({
      id: 'mon-1',
      position: { x: 5, y: 5 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 20,
      speed: 110,
      definitionKey: 'kobold',
    });

    expect(monster.symbol).toBe('k');
    expect(monster.definitionKey).toBe('kobold');
    expect(monster.maxHp).toBe(20);
  });

  it('should track if monster is awake', () => {
    const monster = new Monster({
      id: 'mon-1',
      position: { x: 5, y: 5 },
      symbol: 'k',
      color: '#0f0',
      maxHp: 20,
      speed: 110,
      definitionKey: 'kobold',
    });

    expect(monster.isAwake).toBe(false); // starts asleep
    monster.wake();
    expect(monster.isAwake).toBe(true);
  });
});
