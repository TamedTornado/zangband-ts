import { describe, it, expect } from 'vitest';
import { parseMonsters, type MonsterDef } from '@/core/data/monsters';

const SAMPLE_MONSTERS = `
# Comment
V:2.7.4

N:0:Player
G:@:w

N:1:Filthy street urchin
G:t:D
I:110:1d4:4:2:40
W:0:2:0:0
O:0:0:0
B:BEG
B:TOUCH:EAT_GOLD
F:MALE | EVIL | WILD_TOWN
F:RAND_25 | FRIENDS
D:He looks squalid and thoroughly revolting.

N:2:Scrawny cat
G:f:U
I:110:1d2:30:3:10
W:0:3:0:0
O:0:0:0
B:CLAW:HURT:1d1
F:RAND_25 | WILD_TOWN
F:ANIMAL | DROP_CORPSE | DROP_SKELETON
D:A skinny little furball with sharp claws and a menacing look.
`;

describe('parseMonsters', () => {
  it('should parse monster entries from text', () => {
    const monsters: MonsterDef[] = parseMonsters(SAMPLE_MONSTERS);
    expect(monsters.length).toBe(3);
  });

  it('should parse monster id and name', () => {
    const monsters = parseMonsters(SAMPLE_MONSTERS);
    expect(monsters[1]?.id).toBe(1);
    expect(monsters[1]?.name).toBe('Filthy street urchin');
  });

  it('should parse graphics', () => {
    const monsters = parseMonsters(SAMPLE_MONSTERS);
    expect(monsters[1]?.symbol).toBe('t');
    expect(monsters[1]?.color).toBe('D');
  });

  it('should parse info line (speed, hp, vision, ac, alertness)', () => {
    const monsters = parseMonsters(SAMPLE_MONSTERS);
    const urchin = monsters[1];
    expect(urchin?.speed).toBe(110);
    expect(urchin?.hp).toBe('1d4');
    expect(urchin?.vision).toBe(4);
    expect(urchin?.ac).toBe(2);
    expect(urchin?.alertness).toBe(40);
  });

  it('should parse world line (depth, rarity, exp)', () => {
    const monsters = parseMonsters(SAMPLE_MONSTERS);
    const urchin = monsters[1];
    expect(urchin?.depth).toBe(0);
    expect(urchin?.rarity).toBe(2);
    expect(urchin?.exp).toBe(0);
  });

  it('should parse attacks', () => {
    const monsters = parseMonsters(SAMPLE_MONSTERS);
    const urchin = monsters[1];
    expect(urchin?.attacks.length).toBe(2);
    expect(urchin?.attacks[0]).toEqual({ method: 'BEG', effect: undefined, damage: undefined });
    expect(urchin?.attacks[1]).toEqual({ method: 'TOUCH', effect: 'EAT_GOLD', damage: undefined });

    const cat = monsters[2];
    expect(cat?.attacks[0]).toEqual({ method: 'CLAW', effect: 'HURT', damage: '1d1' });
  });

  it('should parse flags', () => {
    const monsters = parseMonsters(SAMPLE_MONSTERS);
    const urchin = monsters[1];
    expect(urchin?.flags).toContain('MALE');
    expect(urchin?.flags).toContain('EVIL');
    expect(urchin?.flags).toContain('FRIENDS');
  });

  it('should parse description', () => {
    const monsters = parseMonsters(SAMPLE_MONSTERS);
    expect(monsters[1]?.description).toBe('He looks squalid and thoroughly revolting.');
    expect(monsters[2]?.description).toBe('A skinny little furball with sharp claws and a menacing look.');
  });
});
