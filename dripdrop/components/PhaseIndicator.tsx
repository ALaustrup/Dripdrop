import { StyleSheet, Text, View } from 'react-native';

import { PhaseName, PHASE_ORDER } from '@/utils/phaseCalculator';

type Props = {
  current: PhaseName;
  nextPhase?: PhaseName;
  progressToNext: number;
  baseTapValue: number;
  dripBalance: number;
};

export function PhaseIndicator({ current, nextPhase, progressToNext, baseTapValue, dripBalance }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.meta}>
        <Text style={styles.metaText}>Balance: {Math.floor(dripBalance).toLocaleString()} DRIP</Text>
        <Text style={styles.metaText}>Base Tap: {baseTapValue.toFixed(1)}</Text>
      </View>
      <View style={styles.container}>
        {PHASE_ORDER.map((phase) => {
          const active = phase === current;
          const reached = PHASE_ORDER.indexOf(phase) <= PHASE_ORDER.indexOf(current);
          return (
            <View key={phase} style={[styles.badge, reached && styles.reachedBadge, active && styles.activeBadge]}>
              <Text style={[styles.label, reached && styles.reachedLabel, active && styles.activeLabel]}>{phase}</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.progressText}>
        {nextPhase ? `${Math.round(progressToNext * 100)}% to ${nextPhase}` : 'Max phase reached'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaText: {
    color: '#90b2d1',
    fontSize: 12,
    fontWeight: '600',
  },
  container: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#33516f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0f2236',
  },
  reachedBadge: {
    borderColor: '#3d8dcf',
    backgroundColor: '#163853',
  },
  activeBadge: {
    borderColor: '#8bd2ff',
    backgroundColor: '#1e4d72',
  },
  label: {
    fontSize: 12,
    color: '#6f8ba4',
    fontWeight: '600',
  },
  reachedLabel: {
    color: '#b8d8f5',
  },
  activeLabel: {
    color: '#e8f6ff',
  },
  progressText: {
    color: '#bcdcf8',
    fontSize: 12,
    textAlign: 'center',
  },
});
