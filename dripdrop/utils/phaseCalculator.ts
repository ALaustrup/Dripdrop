export const PHASES = ['Drip', 'Puddle', 'Stream', 'River', 'Lake', 'Cloud'] as const;

export type PhaseName = (typeof PHASES)[number];

export type PhaseConfig = {
  name: PhaseName;
  minBalance: number;
  tapValue: number;
};

export const PHASE_CONFIG: Record<PhaseName, PhaseConfig> = {
  Drip: { name: 'Drip', minBalance: 0, tapValue: 1 },
  Puddle: { name: 'Puddle', minBalance: 1_000, tapValue: 2 },
  Stream: { name: 'Stream', minBalance: 10_000, tapValue: 3 },
  River: { name: 'River', minBalance: 50_000, tapValue: 5 },
  Lake: { name: 'Lake', minBalance: 100_000, tapValue: 8 },
  Cloud: { name: 'Cloud', minBalance: 250_000, tapValue: 10 },
};

export const PHASE_ORDER: PhaseName[] = ['Drip', 'Puddle', 'Stream', 'River', 'Lake', 'Cloud'];

export type PhaseState = {
  phase: PhaseName;
  baseTapValue: number;
  progressToNext: number;
  nextPhase?: PhaseName;
  cloudDarknessPercent: number;
  isDarkCloudReady: boolean;
};

export function calculatePhase(balance: number): PhaseState {
  const safeBalance = Math.max(0, Math.floor(balance));

  let activePhase: PhaseName = 'Drip';
  for (const phase of PHASE_ORDER) {
    if (safeBalance >= PHASE_CONFIG[phase].minBalance) {
      activePhase = phase;
    }
  }

  const currentIndex = PHASE_ORDER.indexOf(activePhase);
  const nextPhase = PHASE_ORDER[currentIndex + 1];
  const currentMin = PHASE_CONFIG[activePhase].minBalance;
  const nextMin = nextPhase ? PHASE_CONFIG[nextPhase].minBalance : currentMin;
  const denominator = Math.max(1, nextMin - currentMin);
  const progressToNext = nextPhase ? Math.min(1, (safeBalance - currentMin) / denominator) : 1;

  const cloudExtra = Math.max(0, safeBalance - PHASE_CONFIG.Cloud.minBalance);
  const cloudDarknessPercent = Math.min(100, Math.floor(cloudExtra / 100_000) * 10);

  return {
    phase: activePhase,
    baseTapValue: PHASE_CONFIG[activePhase].tapValue,
    progressToNext,
    nextPhase,
    cloudDarknessPercent,
    isDarkCloudReady: activePhase === 'Cloud' && cloudDarknessPercent >= 100,
  };
}
