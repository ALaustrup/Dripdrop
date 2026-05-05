const TAP_WINDOW_MS = 1000;
const MAX_TAPS_PER_WINDOW = 5;
const COOLDOWN_MS = 30_000;

export type TapValidationInput = {
  now: number;
  lastTapAt?: number;
  recentTapTimestamps: number[];
};

export type TapValidationResult = {
  allowed: boolean;
  reason?: 'cooldown' | 'rate_limited' | 'invalid_timestamp';
  retryAfterMs?: number;
  recentTapTimestamps: number[];
};

export const antiCheatConfig = {
  tapWindowMs: TAP_WINDOW_MS,
  maxTapsPerWindow: MAX_TAPS_PER_WINDOW,
  cooldownMs: COOLDOWN_MS,
} as const;

export function normalizeRecentTaps(now: number, timestamps: number[]): number[] {
  const cutoff = now - TAP_WINDOW_MS;
  return timestamps.filter((stamp) => stamp >= cutoff);
}

export function validateTapRate(input: TapValidationInput): TapValidationResult {
  const { now, lastTapAt, recentTapTimestamps } = input;
  if (lastTapAt !== undefined && now < lastTapAt) {
    return {
      allowed: false,
      reason: 'invalid_timestamp',
      retryAfterMs: COOLDOWN_MS,
      recentTapTimestamps: normalizeRecentTaps(now, recentTapTimestamps),
    };
  }

  const normalized = normalizeRecentTaps(now, recentTapTimestamps);
  if (normalized.length >= MAX_TAPS_PER_WINDOW) {
    return {
      allowed: false,
      reason: 'rate_limited',
      retryAfterMs: COOLDOWN_MS,
      recentTapTimestamps: normalized,
    };
  }

  return {
    allowed: true,
    recentTapTimestamps: [...normalized, now],
  };
}

export function isCooldownActive(cooldownUntil: number | null, now: number): boolean {
  return cooldownUntil !== null && cooldownUntil > now;
}

export function calculateCooldownEnd(now: number): number {
  return now + COOLDOWN_MS;
}
