import { calculatePhase, PHASE_CONFIG } from '@/utils/phaseCalculator';

describe('phaseCalculator', () => {
  it('returns Drip defaults at zero balance', () => {
    const phase = calculatePhase(0);
    expect(phase.phase).toBe('Drip');
    expect(phase.baseTapValue).toBe(PHASE_CONFIG.Drip.tapValue);
    expect(phase.progressToNext).toBe(0);
    expect(phase.cloudDarknessPercent).toBe(0);
  });

  it('transitions to Cloud and computes darkness per 100k', () => {
    const balance = PHASE_CONFIG.Cloud.minBalance + 450_000;
    const phase = calculatePhase(balance);
    expect(phase.phase).toBe('Cloud');
    expect(phase.baseTapValue).toBe(10);
    expect(phase.cloudDarknessPercent).toBe(40);
    expect(phase.isDarkCloudReady).toBe(false);
  });

  it('marks dark cloud ready at max darkness', () => {
    const balance = PHASE_CONFIG.Cloud.minBalance + 1_200_000;
    const phase = calculatePhase(balance);
    expect(phase.cloudDarknessPercent).toBe(100);
    expect(phase.isDarkCloudReady).toBe(true);
  });
});
