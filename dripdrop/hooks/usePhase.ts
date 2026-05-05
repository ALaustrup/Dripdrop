import { useMemo } from 'react';

import { calculatePhase, PhaseState } from '@/utils/phaseCalculator';

export function usePhase(balance: number): PhaseState {
  return useMemo(() => calculatePhase(balance), [balance]);
}
