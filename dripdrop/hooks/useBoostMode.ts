import { useMemo } from 'react';

import { useDripStore } from '@/stores/useDripStore';

export function useBoostMode() {
  const { isBoostActive, boostMultiplier, boostEndsAt, boostCooldownUntil, clearBoostIfExpired } = useDripStore((state) => ({
    isBoostActive: state.isBoostActive,
    boostMultiplier: state.boostMultiplier,
    boostEndsAt: state.boostEndsAt,
    boostCooldownUntil: state.boostCooldownUntil,
    clearBoostIfExpired: state.clearBoostIfExpired,
  }));

  const now = Date.now();
  clearBoostIfExpired();

  const activeBoost = useMemo(() => {
    if (!isBoostActive || !boostEndsAt || boostEndsAt <= now) {
      return null;
    }

    const remainingMs = boostEndsAt - now;
    return {
      multiplier: boostMultiplier,
      remainingMs,
      remainingSeconds: Math.ceil(remainingMs / 1000),
    };
  }, [boostEndsAt, boostMultiplier, isBoostActive, now]);

  const cooldownRemainingMs = Math.max(0, (boostCooldownUntil ?? 0) - now);

  return {
    activeBoost,
    cooldownRemainingMs,
    isCoolingDown: cooldownRemainingMs > 0,
  };
}
