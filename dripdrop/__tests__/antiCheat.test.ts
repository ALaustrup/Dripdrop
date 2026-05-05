import {
  antiCheatConfig,
  calculateCooldownEnd,
  isCooldownActive,
  normalizeRecentTaps,
  validateTapRate,
} from '@/utils/antiCheat';

describe('antiCheat', () => {
  it('allows taps under limit', () => {
    const now = Date.now();
    const result = validateTapRate({
      now,
      recentTapTimestamps: [now - 100, now - 250],
    });

    expect(result.allowed).toBe(true);
    expect(result.recentTapTimestamps).toHaveLength(3);
  });

  it('blocks taps at or above max rate', () => {
    const now = Date.now();
    const previous = [
      now - 100,
      now - 200,
      now - 300,
      now - 400,
      now - 500,
    ];

    const result = validateTapRate({
      now,
      recentTapTimestamps: previous,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('rate_limited');
    expect(result.retryAfterMs).toBe(antiCheatConfig.cooldownMs);
  });

  it('normalizes outdated timestamps', () => {
    const now = Date.now();
    const result = normalizeRecentTaps(now, [now - 1500, now - 900, now - 100]);
    expect(result).toEqual([now - 900, now - 100]);
  });

  it('calculates and checks cooldown windows', () => {
    const now = Date.now();
    const cooldownEnd = calculateCooldownEnd(now);
    expect(isCooldownActive(cooldownEnd, now + 1000)).toBe(true);
    expect(isCooldownActive(cooldownEnd, cooldownEnd + 1)).toBe(false);
  });

  it('rejects time rollback', () => {
    const now = Date.now();
    const result = validateTapRate({
      now,
      lastTapAt: now + 100,
      recentTapTimestamps: [now - 50],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('invalid_timestamp');
  });
});
