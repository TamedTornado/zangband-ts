import { describe, it, expect } from 'vitest';
import { parseMonsters, type MonsterDef, type MonsterRecord } from '@/core/data/monsters';

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
  it('should return a record keyed by slug', () => {
    const monsters: MonsterRecord = parseMonsters(SAMPLE_MONSTERS);
    expect(monsters['player']).toBeDefined();
    expect(monsters['filthy_street_urchin']).toBeDefined();
    expect(monsters['scrawny_cat']).toBeDefined();
  });

  it('should parse monster key, index and name', () => {
    const monsters: MonsterRecord = parseMonsters(SAMPLE_MONSTERS);
    expect(monsters['filthy_street_urchin']?.key).toBe('filthy_street_urchin');
    expect(monsters['filthy_street_urchin']?.index).toBe(1);
    expect(monsters['filthy_street_urchin']?.name).toBe('Filthy street urchin');
  });

  it('should parse graphics', () => {
    const monsters: MonsterRecord = parseMonsters(SAMPLE_MONSTERS);
    expect(monsters['filthy_street_urchin']?.symbol).toBe('t');
    expect(monsters['filthy_street_urchin']?.color).toBe('D');
  });

  it('should parse info line (speed, hp, vision, ac, alertness)', () => {
    const monsters: MonsterRecord = parseMonsters(SAMPLE_MONSTERS);
    const urchin: MonsterDef | undefined = monsters['filthy_street_urchin'];
    expect(urchin?.speed).toBe(110);
    expect(urchin?.hp).toBe('1d4');
    expect(urchin?.vision).toBe(4);
    expect(urchin?.ac).toBe(2);
    expect(urchin?.alertness).toBe(40);
  });

  it('should parse world line (depth, rarity, exp)', () => {
    const monsters: MonsterRecord = parseMonsters(SAMPLE_MONSTERS);
    const urchin: MonsterDef | undefined = monsters['filthy_street_urchin'];
    expect(urchin?.depth).toBe(0);
    expect(urchin?.rarity).toBe(2);
    expect(urchin?.exp).toBe(0);
  });

  it('should parse attacks', () => {
    const monsters: MonsterRecord = parseMonsters(SAMPLE_MONSTERS);
    const urchin: MonsterDef | undefined = monsters['filthy_street_urchin'];
    expect(urchin?.attacks.length).toBe(2);
    expect(urchin?.attacks[0]).toEqual({ method: 'BEG', effect: undefined, damage: undefined });
    expect(urchin?.attacks[1]).toEqual({ method: 'TOUCH', effect: 'EAT_GOLD', damage: undefined });

    const cat: MonsterDef | undefined = monsters['scrawny_cat'];
    expect(cat?.attacks[0]).toEqual({ method: 'CLAW', effect: 'HURT', damage: '1d1' });
  });

  it('should parse flags', () => {
    const monsters: MonsterRecord = parseMonsters(SAMPLE_MONSTERS);
    const urchin: MonsterDef | undefined = monsters['filthy_street_urchin'];
    expect(urchin?.flags).toContain('MALE');
    expect(urchin?.flags).toContain('EVIL');
    expect(urchin?.flags).toContain('FRIENDS');
  });

  it('should parse description', () => {
    const monsters: MonsterRecord = parseMonsters(SAMPLE_MONSTERS);
    expect(monsters['filthy_street_urchin']?.description).toBe('He looks squalid and thoroughly revolting.');
    expect(monsters['scrawny_cat']?.description).toBe('A skinny little furball with sharp claws and a menacing look.');
  });

  it('should add index suffix only for colliding names', () => {
    const withCollisions = `
N:43:Novice warrior
G:p:U

N:110:Novice warrior
G:p:U

N:1:Goblin
G:g:g
`;
    const monsters: MonsterRecord = parseMonsters(withCollisions);
    expect(monsters['novice_warrior_43']).toBeDefined();
    expect(monsters['novice_warrior_110']).toBeDefined();
    expect(monsters['goblin']).toBeDefined(); // no suffix - unique
  });
});
