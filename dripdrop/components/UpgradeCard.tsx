import { Pressable, StyleSheet, Text, View } from 'react-native';

type UpgradeCardProps = {
  title: string;
  description: string;
  level: number;
  maxLevel: number;
  cost: number;
  onPress: () => void;
  disabled?: boolean;
};

export function UpgradeCard({
  title,
  description,
  level,
  maxLevel,
  cost,
  onPress,
  disabled = false,
}: UpgradeCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.level}>Lv. {level}</Text>
      </View>
      <Text style={styles.description}>{description}</Text>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>{level >= maxLevel ? 'Max level reached' : `Upgrade (${cost} DRIP)`}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    backgroundColor: '#0e2d48',
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#1f4667',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#f5fbff',
    fontWeight: '700',
    fontSize: 16,
  },
  level: {
    color: '#7ec6ff',
    fontWeight: '600',
  },
  description: {
    color: '#cde9ff',
    fontSize: 13,
    lineHeight: 19,
  },
  button: {
    borderRadius: 10,
    backgroundColor: '#3399ff',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    backgroundColor: '#3d5163',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
