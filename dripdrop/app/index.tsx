import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWalletConnectModal } from '@walletconnect/modal-react-native';

import { CloudMeter } from '@/components/CloudMeter';
import { Droplet } from '@/components/Droplet';
import { PhaseIndicator } from '@/components/PhaseIndicator';
import { useBoostMode } from '@/hooks/useBoostMode';
import { usePhase } from '@/hooks/usePhase';
import { useTapHandler } from '@/hooks/useTapHandler';
import {
  ensureProfile,
  hasSupabaseEnv,
  signInWithEmail,
  signOutSession,
  signUpWithEmail,
  supabase,
} from '@/services/supabase';
import { hasWalletConnectProjectId, parseCaipAddress } from '@/services/walletConnect';
import { useDripStore } from '@/stores/useDripStore';

export default function HomeScreen() {
  const dripBalance = useDripStore((state) => state.dripBalance);
  const phase = usePhase(dripBalance);
  const {
    isOnline,
    launchDate,
    launchCountdownEndsAt,
    isRainLive,
    referralCode,
    settings,
    user,
    canTap,
    flushTapQueue,
    setLaunchDate,
    updateSettings,
    queueExternalTransfer,
    initialize,
    loginWithEmail,
    signupWithEmail,
    logout,
    syncAuthProfile,
    evaluateLaunchReadiness,
  } = useDripStore((state) => ({
    isOnline: state.isOnline,
    launchDate: state.launchDate,
    launchCountdownEndsAt: state.launchCountdownEndsAt,
    isRainLive: state.isRainLive,
    referralCode: state.referralCode,
    settings: state.settings,
    user: state.user,
    canTap: state.canTap,
    flushTapQueue: state.flushTapQueue,
    setLaunchDate: state.setLaunchDate,
    updateSettings: state.updateSettings,
    queueExternalTransfer: state.queueExternalTransfer,
    initialize: state.initialize,
    loginWithEmail: state.loginWithEmail,
    signupWithEmail: state.signupWithEmail,
    logout: state.logout,
    syncAuthProfile: state.syncAuthProfile,
    evaluateLaunchReadiness: state.evaluateLaunchReadiness,
  }));
  const { activeBoost } = useBoostMode();
  const { handleTap, canTap: canTapButton, cooldownSeconds } = useTapHandler();
  const { open, isConnected, address } = useWalletConnectModal();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthBusy, setIsAuthBusy] = useState(false);

  const countdownMs = useMemo(() => {
    if (!launchCountdownEndsAt) {
      return null;
    }
    return Math.max(0, launchCountdownEndsAt - Date.now());
  }, [launchCountdownEndsAt]);

  const canTapNow = useMemo(() => canTap().allowed, [canTap]);

  useEffect(() => {
    void initialize();
    void syncAuthProfile();
  }, [initialize, syncAuthProfile]);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      return;
    }

    let mounted = true;
    void supabase
      .from('config')
      .select('launch_date')
      .eq('key', 'global_launch_date')
      .single()
      .then(({ data }) => {
        if (!mounted || !data?.launch_date) {
          return;
        }
        setLaunchDate(data.launch_date as string);
      });

    return () => {
      mounted = false;
    };
  }, [setLaunchDate]);

  useEffect(() => {
    if (!address) {
      return;
    }
    const parsed = parseCaipAddress(address.includes(':') ? address : `eip155:84532:${address}`);
    if (parsed) {
      void ensureProfile({ walletAddress: parsed.address });
      queueExternalTransfer({
        id: `wallet-link-${Date.now()}`,
        to: parsed.address,
        amount: '0',
        type: 'wallet',
        chain: String(parsed.chainId),
      });
    }
  }, [address, queueExternalTransfer]);

  useEffect(() => {
    evaluateLaunchReadiness();
  }, [evaluateLaunchReadiness, phase.isDarkCloudReady]);

  const handleEmailSignIn = async () => {
    try {
      setIsAuthBusy(true);
      await signInWithEmail(email, password);
      await loginWithEmail(email, password);
      await ensureProfile({ email });
      Alert.alert('Signed in', 'Welcome back to DripDrop.');
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleEmailSignUp = async () => {
    try {
      setIsAuthBusy(true);
      await signUpWithEmail(email, password);
      await signupWithEmail(email, password, email.split('@')[0] || 'dripper');
      await ensureProfile({ email });
      Alert.alert('Check your email', 'Confirm your email to complete sign up.');
    } catch (error) {
      Alert.alert('Sign up failed', error instanceof Error ? error.message : 'Unable to sign up.');
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleWalletConnect = async () => {
    if (!hasWalletConnectProjectId()) {
      Alert.alert('WalletConnect missing', 'Set EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID to enable wallet auth.');
      return;
    }
    await open();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>DripDrop</Text>
          <Text style={styles.subtitle}>Tap. Collect. Flow. Unlock the Water Cycle.</Text>
        </View>

        <View style={styles.authContainer}>
          <Text style={styles.sectionTitle}>Onboarding & Auth</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#6f8ba9"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            placeholderTextColor="#6f8ba9"
            style={styles.input}
          />
          <View style={styles.authButtons}>
            <Pressable style={styles.button} onPress={handleEmailSignIn} disabled={isAuthBusy}>
              <Text style={styles.buttonText}>Sign In</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleEmailSignUp} disabled={isAuthBusy}>
              <Text style={styles.secondaryButtonText}>Sign Up</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleWalletConnect}>
              <Text style={styles.secondaryButtonText}>{isConnected ? 'Wallet Connected' : 'Connect Wallet'}</Text>
            </Pressable>
            <Pressable
              style={styles.linkButton}
              onPress={() => {
                void signOutSession();
                void logout();
              }}
            >
              <Text style={styles.linkText}>Sign out</Text>
            </Pressable>
          </View>
        </View>

        <PhaseIndicator
          current={phase.phase}
          dripBalance={dripBalance}
          progressToNext={phase.progressToNext}
          nextPhase={phase.nextPhase}
          baseTapValue={phase.baseTapValue}
        />
        <CloudMeter darknessPercent={phase.cloudDarknessPercent} isReady={phase.isDarkCloudReady} />

        <View style={styles.centerCard}>
          <Text style={styles.balance}>Balance: {Math.floor(dripBalance).toLocaleString()} DRIP</Text>
          <Text style={styles.meta}>Current Tap Value: {activeBoost ? `${(phase.baseTapValue * activeBoost.multiplier).toFixed(1)} (boosted)` : phase.baseTapValue.toFixed(1)}</Text>
          <Text style={styles.meta}>Referral Code: {referralCode}</Text>
          <Text style={styles.meta}>User: {user?.username ?? user?.email ?? 'Guest'}</Text>
          <Text style={styles.meta}>Online: {isOnline ? 'Yes' : 'No (offline queue active)'}</Text>
          <Text style={styles.meta}>Cooldown: {cooldownSeconds > 0 ? `${cooldownSeconds}s` : 'Ready'}</Text>
          <Droplet phase={phase.phase} onTap={handleTap} disabled={!canTapButton || !canTapNow} boostMultiplier={activeBoost?.multiplier ?? 1} floatingGains={[]} />
          {!canTapButton && <ActivityIndicator color="#83d6ff" />}
          <Text style={styles.meta}>
            Boost: {activeBoost ? `${activeBoost.multiplier.toFixed(1)}x (${activeBoost.remainingSeconds}s)` : 'Inactive'}
          </Text>
          <Pressable style={styles.secondaryButton} onPress={() => void flushTapQueue()}>
            <Text style={styles.secondaryButtonText}>Sync Offline Queue</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Roadmap & Wallet</Text>
          <View style={styles.row}>
            <Link href="/upgrade-panel" asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Upgrade Panel</Text>
              </Pressable>
            </Link>
            <Link href="/wallet" asChild>
              <Pressable style={styles.button}>
                <Text style={styles.buttonText}>Wallet</Text>
              </Pressable>
            </Link>
          </View>
          <Link href="/roadmap" asChild>
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>View Roadmap</Text>
            </Pressable>
          </Link>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.meta}>Sound</Text>
            <Switch value={settings.soundEnabled} onValueChange={(value) => updateSettings({ soundEnabled: value })} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.meta}>Haptics</Text>
            <Switch value={settings.hapticEnabled} onValueChange={(value) => updateSettings({ hapticEnabled: value })} />
          </View>
          <Text style={styles.meta}>Wallet: {user?.walletAddress ?? 'Not connected'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Launch Rain</Text>
          <Text style={styles.meta}>Dark cloud readiness: {phase.cloudDarknessPercent.toFixed(0)}%</Text>
          <Text style={styles.meta}>Launch ready: {phase.isDarkCloudReady ? 'Yes' : 'No'}</Text>
          <Text style={styles.meta}>
            Countdown: {countdownMs === null ? 'Unavailable' : `${Math.ceil(countdownMs / 1000)}s`}
          </Text>
          <Text style={styles.meta}>Claimable DRIP: {isRainLive ? Math.floor(dripBalance).toLocaleString() : '0'}</Text>
          {launchDate && <Text style={styles.meta}>Global launch date: {new Date(launchDate).toLocaleString()}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#031321',
  },
  container: {
    padding: 16,
    gap: 14,
  },
  header: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#082136',
  },
  title: {
    color: '#f4fbff',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#91bad8',
    marginTop: 6,
  },
  authContainer: {
    backgroundColor: '#0b263f',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  sectionTitle: {
    color: '#f2f9ff',
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    borderColor: '#1f4b70',
    borderWidth: 1,
    borderRadius: 10,
    color: '#f5fbff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  authButtons: {
    gap: 8,
  },
  centerCard: {
    backgroundColor: '#082039',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  balance: {
    color: '#f1fbff',
    fontSize: 24,
    fontWeight: '800',
  },
  meta: {
    color: '#9dc0dd',
    fontSize: 13,
  },
  floatingContainer: {
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingText: {
    color: '#78ddff',
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#0b263f',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    backgroundColor: '#1b85d6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#12395a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#d4eeff',
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: 4,
  },
  linkText: {
    color: '#7ac9ff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
