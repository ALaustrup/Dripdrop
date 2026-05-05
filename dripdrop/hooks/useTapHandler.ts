import { useCallback } from 'react';
import { useDripStore } from '@/stores/useDripStore';

type TapHandlerOptions = {
  onTapSuccess?: (addedValue: number) => void;
};

export function useTapHandler(options?: TapHandlerOptions): {
  handleTap: () => Promise<void>;
  canTap: boolean;
  cooldownSeconds: number;
} {
  const canTapResult = useDripStore((state) => state.canTap());
  const recordTapLocally = useDripStore((state) => state.recordTapLocally);
  const maybeTriggerBoost = useDripStore((state) => state.maybeTriggerBoost);
  const suspiciousCooldownUntil = useDripStore((state) => state.suspiciousCooldownUntil);

  const cooldownSeconds = canTapResult.allowed
    ? 0
    : Math.ceil((canTapResult.retryAfterMs ?? Math.max(0, (suspiciousCooldownUntil ?? 0) - Date.now())) / 1000);

  const handleTap = useCallback(async () => {
    const check = useDripStore.getState().canTap();
    if (!check.allowed) {
      return;
    }

    const increment = await recordTapLocally(Date.now());
    maybeTriggerBoost();

    options?.onTapSuccess?.(increment);
  }, [
    maybeTriggerBoost,
    options,
    recordTapLocally,
  ]);

  return {
    handleTap,
    canTap: canTapResult.allowed,
    cooldownSeconds,
  };
}
