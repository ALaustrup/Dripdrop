import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type FloatingGain = {
  id: string;
  value: number;
};

type DropletProps = {
  phase: string;
  disabled: boolean;
  boostMultiplier: number;
  floatingGains: FloatingGain[];
  onTap: () => Promise<void>;
};

const phaseColorMap: Record<string, string> = {
  Drip: '#61dafb',
  Puddle: '#51c4ec',
  Stream: '#44addc',
  River: '#3388c0',
  Lake: '#245f93',
  Cloud: '#7387a6',
};

const boostColorMap: Record<number, string> = {
  2: '#7cf26d',
  3: '#f2eb6d',
  4: '#f2aa6d',
  5: '#f26d6d',
};

export const Droplet = memo(function Droplet({
  phase,
  disabled,
  boostMultiplier,
  floatingGains,
  onTap,
}: DropletProps) {
  const scale = useSharedValue(1);
  const ripple = useSharedValue(0);

  const fillColor = useMemo(() => {
    if (boostMultiplier > 1) {
      return boostColorMap[boostMultiplier] ?? '#7cf26d';
    }
    return phaseColorMap[phase] ?? '#61dafb';
  }, [boostMultiplier, phase]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 1 - ripple.value,
    transform: [{ scale: 1 + ripple.value * 1.5 }],
  }));

  const handlePress = () => {
    if (disabled) {
      return;
    }

    scale.value = withSequence(withTiming(0.9, { duration: 60 }), withTiming(1.05, { duration: 80 }), withTiming(1, { duration: 120 }));
    ripple.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) {
        ripple.value = 0;
      }
    });
    void onTap();
  };

  scale.value = withRepeat(withSequence(withTiming(1.01, { duration: 1800, easing: Easing.inOut(Easing.quad) }), withTiming(0.99, { duration: 1800, easing: Easing.inOut(Easing.quad) })), -1, true);

  return (
    <View style={styles.wrapper}>
      <Animated.View pointerEvents="none" style={[styles.ripple, rippleStyle]} />
      <Pressable disabled={disabled} onPress={handlePress} style={styles.pressArea}>
        <Animated.View style={[styles.droplet, { backgroundColor: fillColor }, animatedStyle]}>
          <Text style={styles.emoji}>{phase === 'Cloud' ? '☁️' : '💧'}</Text>
        </Animated.View>
      </Pressable>

      <View pointerEvents="none" style={styles.gainContainer}>
        {floatingGains.slice(-5).map((gain, index) => (
          <Text key={gain.id} style={[styles.gainText, { top: -16 - index * 18 }]}>
            +{gain.value}
          </Text>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 260,
    height: 260,
  },
  pressArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  droplet: {
    alignItems: 'center',
    borderRadius: 96,
    elevation: 8,
    height: 180,
    justifyContent: 'center',
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    width: 180,
  },
  emoji: {
    fontSize: 72,
  },
  ripple: {
    borderColor: '#7dd3fc',
    borderRadius: 160,
    borderWidth: 3,
    height: 180,
    position: 'absolute',
    width: 180,
  },
  gainContainer: {
    alignItems: 'center',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  gainText: {
    color: '#c8f3ff',
    fontSize: 16,
    fontWeight: '800',
    position: 'absolute',
  },
});
