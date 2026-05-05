import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const PHASES = [
  {
    title: 'Drip → Puddle',
    detail: 'Build your first 1,000 DRIP and unlock stronger tap value.',
  },
  {
    title: 'Puddle → River',
    detail: 'Unlock upgrades, better cooldowns, and first boost bursts.',
  },
  {
    title: 'River → Cloud',
    detail: 'Push toward cloud state and activate darkening milestones.',
  },
  {
    title: 'Dark Cloud → Rain Launch',
    detail: 'After launch date, the 24h countdown begins and DRIP becomes claimable.',
  },
];

export default function RoadmapScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Roadmap', headerShown: true }} />
      <Text style={styles.title}>DripDrop Roadmap</Text>
      <Text style={styles.subtitle}>Tap. Collect. Flow. Unlock the Water Cycle.</Text>

      {PHASES.map((phase, index) => (
        <View key={phase.title} style={styles.card}>
          <Text style={styles.step}>Phase {index + 1}</Text>
          <Text style={styles.cardTitle}>{phase.title}</Text>
          <Text style={styles.cardText}>{phase.detail}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    backgroundColor: '#031124',
    minHeight: '100%',
    gap: 14,
  },
  title: {
    color: '#f6fbff',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#8fb5d6',
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(115, 177, 223, 0.3)',
    backgroundColor: '#09243f',
    padding: 14,
  },
  step: {
    color: '#7eb1da',
    fontWeight: '600',
    marginBottom: 4,
  },
  cardTitle: {
    color: '#f6fbff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardText: {
    color: '#cce7ff',
    lineHeight: 20,
  },
});
