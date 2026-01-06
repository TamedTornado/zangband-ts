import { describe, it, expect } from 'vitest';
import { parseArtifacts, type ArtifactDef, type ArtifactRecord } from '@/core/data/artifacts';

const SAMPLE_ARTIFACTS = `
# Comment
V:2.7.4

N:1:of Galadriel
I:39:4:1
W:20:1:10:10000
P:0:1d1:0:0:0
F:ACTIVATE | SENSE | INSTA_ART | LITE

N:2:of Elendil
I:39:5:1
W:52:25:5:32500
P:0:1d1:0:0:0
F:ACTIVATE | SEE_INVIS | HOLD_LIFE | INSTA_ART | SPEED | LITE
`;

describe('parseArtifacts', () => {
  it('should return a record keyed by slug', () => {
    const artifacts: ArtifactRecord = parseArtifacts(SAMPLE_ARTIFACTS);
    expect(artifacts['of_galadriel']).toBeDefined();
    expect(artifacts['of_elendil']).toBeDefined();
  });

  it('should parse artifact key, index and name', () => {
    const artifacts: ArtifactRecord = parseArtifacts(SAMPLE_ARTIFACTS);
    expect(artifacts['of_galadriel']?.key).toBe('of_galadriel');
    expect(artifacts['of_galadriel']?.index).toBe(1);
    expect(artifacts['of_galadriel']?.name).toBe('of Galadriel');
  });

  it('should parse info line (tval, sval, pval)', () => {
    const artifacts: ArtifactRecord = parseArtifacts(SAMPLE_ARTIFACTS);
    const phial: ArtifactDef | undefined = artifacts['of_galadriel'];
    expect(phial?.tval).toBe(39);
    expect(phial?.sval).toBe(4);
    expect(phial?.pval).toBe(1);
  });

  it('should parse world line (depth, rarity, weight, cost)', () => {
    const artifacts: ArtifactRecord = parseArtifacts(SAMPLE_ARTIFACTS);
    const phial: ArtifactDef | undefined = artifacts['of_galadriel'];
    expect(phial?.depth).toBe(20);
    expect(phial?.rarity).toBe(1);
    expect(phial?.weight).toBe(10);
    expect(phial?.cost).toBe(10000);
  });

  it('should parse power line (ac, damage, to_hit, to_dam, to_ac)', () => {
    const artifacts: ArtifactRecord = parseArtifacts(SAMPLE_ARTIFACTS);
    const phial: ArtifactDef | undefined = artifacts['of_galadriel'];
    expect(phial?.baseAc).toBe(0);
    expect(phial?.damage).toBe('1d1');
    expect(phial?.toHit).toBe(0);
    expect(phial?.toDam).toBe(0);
    expect(phial?.toAc).toBe(0);
  });

  it('should parse flags', () => {
    const artifacts: ArtifactRecord = parseArtifacts(SAMPLE_ARTIFACTS);
    expect(artifacts['of_galadriel']?.flags).toContain('ACTIVATE');
    expect(artifacts['of_galadriel']?.flags).toContain('LITE');
    expect(artifacts['of_elendil']?.flags).toContain('SPEED');
    expect(artifacts['of_elendil']?.flags).toContain('SEE_INVIS');
  });

  it('should add index suffix only for colliding names', () => {
    const withCollisions = `
N:1:of Power
I:39:4:1

N:2:of Power
I:39:5:1

N:3:of Galadriel
I:39:4:1
`;
    const artifacts: ArtifactRecord = parseArtifacts(withCollisions);
    expect(artifacts['of_power_1']).toBeDefined();
    expect(artifacts['of_power_2']).toBeDefined();
    expect(artifacts['of_galadriel']).toBeDefined(); // no suffix - unique
  });
});
