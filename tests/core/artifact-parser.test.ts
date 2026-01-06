import { describe, it, expect } from 'vitest';
import { parseArtifacts, type ArtifactDef } from '@/core/data/artifacts';

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
  it('should parse artifact entries from text', () => {
    const artifacts: ArtifactDef[] = parseArtifacts(SAMPLE_ARTIFACTS);
    expect(artifacts.length).toBe(2);
  });

  it('should parse artifact id and name', () => {
    const artifacts: ArtifactDef[] = parseArtifacts(SAMPLE_ARTIFACTS);
    expect(artifacts[0]?.id).toBe(1);
    expect(artifacts[0]?.name).toBe('of Galadriel');
    expect(artifacts[1]?.name).toBe('of Elendil');
  });

  it('should parse info line (tval, sval, pval)', () => {
    const artifacts: ArtifactDef[] = parseArtifacts(SAMPLE_ARTIFACTS);
    const phial = artifacts[0];
    expect(phial?.tval).toBe(39);
    expect(phial?.sval).toBe(4);
    expect(phial?.pval).toBe(1);
  });

  it('should parse world line (depth, rarity, weight, cost)', () => {
    const artifacts: ArtifactDef[] = parseArtifacts(SAMPLE_ARTIFACTS);
    const phial = artifacts[0];
    expect(phial?.depth).toBe(20);
    expect(phial?.rarity).toBe(1);
    expect(phial?.weight).toBe(10);
    expect(phial?.cost).toBe(10000);
  });

  it('should parse power line', () => {
    const artifacts: ArtifactDef[] = parseArtifacts(SAMPLE_ARTIFACTS);
    const phial = artifacts[0];
    expect(phial?.baseAc).toBe(0);
    expect(phial?.damage).toBe('1d1');
    expect(phial?.toHit).toBe(0);
    expect(phial?.toDam).toBe(0);
    expect(phial?.toAc).toBe(0);
  });

  it('should parse flags', () => {
    const artifacts: ArtifactDef[] = parseArtifacts(SAMPLE_ARTIFACTS);
    expect(artifacts[0]?.flags).toContain('ACTIVATE');
    expect(artifacts[0]?.flags).toContain('LITE');
    expect(artifacts[1]?.flags).toContain('SPEED');
    expect(artifacts[1]?.flags).toContain('SEE_INVIS');
  });
});
