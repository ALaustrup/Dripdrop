import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { UpgradeCard } from '@/components/UpgradeCard';
import { useDripStore } from '@/stores/useDripStore';

const UPGRADE_CAPS = {
  bucket: 20,
  wateringCan: 20,
  hose: 20,
  pump: 20,
} as const;

const UPGRADE_INCREMENT_COST = {
  bucket: 75,
  wateringCan: 100,
  hose: 125,
  pump: 150,
} as const;

type UpgradeKey = keyof typeof UPGRADE_CAPS;

const upgradeDescriptions: Record<UpgradeKey, string> = {
  bucket: 'Increases max stored taps while offline.',
  wateringCan: 'Adds +0.5 to tap value per level.',
  hose: 'Reduces cooldown duration after suspicious activity.',
  pump: 'Increases Super Drip trigger chance.',
};

function getCost(level: number, upgradeKey: UpgradeKey): number {
  return (level + 1) * UPGRADE_INCREMENT_COST[upgradeKey];
}

export default function UpgradePanelScreen() {
  const dripBalance = useDripStore((state) => state.dripBalance);
  const upgrades = useDripStore((state) => state.upgrades);
  const consumeUpgrade = useDripStore((state) => state.consumeUpgrade);

  const upgradeEntries: { key: UpgradeKey; label: string }[] = [
    { key: 'bucket', label: 'Bucket' },
    { key: 'wateringCan', label: 'Watering Can' },
    { key: 'hose', label: 'Hose' },
    { key: 'pump', label: 'Pump' },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Upgrade Panel', headerShown: true }} />
      <Text style={styles.heading}>Upgrade Panel</Text>
      <Text style={styles.balance}>Balance: {Math.floor(dripBalance).toLocaleString()} DRIP</Text>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {upgradeEntries.map(({ key, label }) => {
          const level = upgrades[key];
          const cost = getCost(level, key);
          return (
            <UpgradeCard
              key={key}
              title={label}
              description={upgradeDescriptions[key]}
              level={level}
              maxLevel={UPGRADE_CAPS[key]}
              cost={cost}
              disabled={dripBalance < cost || level >= UPGRADE_CAPS[key]}
              onPress={() => consumeUpgrade(key)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#051a33',
    paddingTop: 64,
    paddingHorizontal: 16,
  },
  heading: {
    color: '#f5fbff',
    fontSize: 28,
    fontWeight: '700',
  },
  balance: {
    marginTop: 8,
    color: '#8db7da',
    fontSize: 16,
  },
  scrollContent: {
    paddingVertical: 16,
  },
});
