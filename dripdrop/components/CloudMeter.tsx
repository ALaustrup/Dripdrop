import { StyleSheet, Text, View } from 'react-native';

type CloudMeterProps = {
  darknessPercent: number;
  isReady: boolean;
};

export function CloudMeter({ darknessPercent, isReady }: CloudMeterProps) {
  const clamped = Math.max(0, Math.min(100, darknessPercent));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cloud Darkness</Text>
        <Text style={styles.value}>{clamped}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
      <Text style={styles.caption}>
        {isReady ? 'Dark Cloud unlocked. Launch Rain is available when timer reaches zero.' : 'Darken your cloud after reaching Cloud phase.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    backgroundColor: '#0b1f33',
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#d8ebff',
    fontWeight: '600',
  },
  value: {
    color: '#95c7f7',
    fontWeight: '700',
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#16314f',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#5ea9f0',
  },
  caption: {
    color: '#89afd2',
    fontSize: 12,
  },
});
