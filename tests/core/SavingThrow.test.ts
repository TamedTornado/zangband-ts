import { describe, it, expect, vi, afterEach } from 'vitest';
import { RNG } from 'rot-js';
import { attemptSavingThrow, makeSavingThrowCheck } from '@/core/systems/SavingThrow';

describe('attemptSavingThrow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should succeed when roll is less than saving score', () => {
    // Mock RNG to return a low value (10)
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(10);

    // With saving score 50, roll 10 should succeed (10 < 50)
    const result = attemptSavingThrow(50);
    expect(result).toBe(true);
  });

  it('should fail when roll is greater than or equal to saving score', () => {
    // Mock RNG to return a high value (60)
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(60);

    // With saving score 50, roll 60 should fail (60 >= 50)
    const result = attemptSavingThrow(50);
    expect(result).toBe(false);
  });

  it('should fail when roll equals saving score', () => {
    // Mock RNG to return exactly the saving score
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(50);

    // With saving score 50, roll 50 should fail (50 >= 50)
    const result = attemptSavingThrow(50);
    expect(result).toBe(false);
  });

  it('should always fail with saving score 0', () => {
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(0);

    // Even with roll 0, saving score 0 should fail (0 >= 0)
    const result = attemptSavingThrow(0);
    expect(result).toBe(false);
  });

  it('should clamp saving score to maximum of 95', () => {
    // High saving score should be capped at 95
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(96);

    // With saving score 100 (clamped to 95), roll 96 should fail
    const result = attemptSavingThrow(100);
    expect(result).toBe(false);
  });

  it('should succeed with clamped high saving score when roll is under 95', () => {
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(90);

    // With saving score 100 (clamped to 95), roll 90 should succeed
    const result = attemptSavingThrow(100);
    expect(result).toBe(true);
  });

  it('should clamp saving score to minimum of 0', () => {
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(0);

    // Negative saving score should be clamped to 0
    const result = attemptSavingThrow(-10);
    expect(result).toBe(false);
  });
});

describe('makeSavingThrowCheck', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a check function that uses player saving skill', () => {
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(30);

    // Create a check function for a player with saving score 50
    const check = makeSavingThrowCheck(50);

    // Roll 30 < 50, should succeed
    expect(check()).toBe(true);
  });

  it('should allow difficulty adjustment', () => {
    vi.spyOn(RNG, 'getUniformInt').mockReturnValue(30);

    // Create a check with base saving score 50, difficulty reduces by 25
    const check = makeSavingThrowCheck(50);

    // With difficulty 25, effective save = 50 - 25 = 25
    // Roll 30 >= 25, should fail
    expect(check(25)).toBe(false);
  });
});
