import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import debounce from 'lodash.debounce';
import { create } from 'zustand';
// Zustand's ESM middleware bundle can ship raw import.meta, which breaks Expo web's classic script output.
// Requiring the CJS entry avoids that parse-time crash on mobile browsers.
const { createJSONStorage, persist } = require('zustand/middleware') as typeof import('zustand/middleware');

import { clearPersistedSession, hasSupabaseEnv, persistSessionSecurely, supabase } from '@/services/supabase';
import { antiCheatConfig, calculateCooldownEnd, isCooldownActive } from '@/utils/antiCheat';
import { calculatePhase, PhaseName } from '@/utils/phaseCalculator';

type UpgradeState = {
  bucket: number;
  wateringCan: number;
  hose: number;
  pump: number;
  lightningBolt: number;
};

export type UpgradeType = keyof UpgradeState;

type UserSettings = {
  soundEnabled: boolean;
  hapticEnabled: boolean;
};

type TapEvent = {
  id: string;
  createdAt: number;
  incrementBy: number;
  signature: string;
};

type LeaderboardEntry = {
  id: string;
  username: string;
  dripBalance: number;
  streakMultiplier: number;
};

type PendingTransfer = {
  id: string;
  to: string;
  amount: string;
  type: 'username' | 'wallet';
  chain?: string;
};

type AuthUser = {
  id: string;
  email: string | null;
  username: string | null;
  walletAddress: string | null;
};

type DripState = {
  user: AuthUser | null;
  dripBalance: number;
  totalEarned: number;
  tapValue: number;
  phase: PhaseName;
  cloudDarknessPercent: number;
  isDarkCloudReady: boolean;
  upgradePoints: number;
  upgrades: UpgradeState;
  settings: UserSettings;
  isBoostActive: boolean;
  boostMultiplier: number;
  boostEndsAt: number | null;
  boostCooldownUntil: number | null;
  dripWalletBalance: number;
  pendingTransfers: PendingTransfer[];
  referralCode: string | null;
  referralsCount: number;
  referralBonusRate: number;
  streakCount: number;
  streakMultiplier: number;
  lastTapAt: number | null;
  recentTapTimestamps: number[];
  suspiciousCooldownUntil: number | null;
  offlineQueue: TapEvent[];
  isOnline: boolean;
  launchDate: string | null;
  launchCountdownEndsAt: number | null;
  isRainLive: boolean;
  leaderboard: LeaderboardEntry[];
  friendsLeaderboard: LeaderboardEntry[];
  isHydrated: boolean;
  setHydrated: () => void;
  initialize: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  syncAuthProfile: () => Promise<void>;
  updateSettings: (next: Partial<UserSettings>) => void;
  activateBoost: (durationMs: number, multiplier: number) => void;
  maybeTriggerBoost: () => boolean;
  clearBoostIfExpired: () => void;
  canTap: () => { allowed: boolean; retryAfterMs?: number };
  recordTapLocally: (timestamp: number) => Promise<number>;
  flushTapQueue: () => Promise<void>;
  setLaunchDate: (isoDate: string | null) => void;
  evaluateLaunchReadiness: () => void;
  sendDripToUser: (username: string, amount: string) => Promise<void>;
  queueExternalTransfer: (payload: PendingTransfer) => void;
  consumeUpgrade: (type: keyof UpgradeState) => void;
  refreshLeaderboard: () => Promise<void>;
  claimDailyStreak: () => void;
  setOnline: (next: boolean) => void;
};

export type { DripState };

const BOOST_COOLDOWN_MS = 60 * 60 * 1000;
const BOOST_DEFAULT_MS = 30 * 1000;
const OFFLINE_QUEUE_LIMIT = 2000;
const DEFAULT_REFERRAL_BONUS_RATE = 0.1;
const STREAK_MULTIPLIER_STEP = 0.2;
const STREAK_MAX_MULTIPLIER = 2;
const LIGHTNING_BOLT_DARKENING_BOOST = 1.2;

function calcTapValue(upgrades: UpgradeState, baseTapValue: number): number {
  return baseTapValue + upgrades.wateringCan * 0.5;
}

function calcBucketCap(upgrades: UpgradeState): number {
  return 300 + upgrades.bucket * 200;
}

function createEventId(now: number): string {
  return `tap_${now}_${Math.random().toString(36).slice(2, 10)}`;
}

async function buildTapSignature(userId: string, timestamp: number, incrementBy: number): Promise<string> {
  const payload = `${userId}:${timestamp}:${incrementBy}`;
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
}

const debouncedFlush = debounce(async () => {
  await useDripStore.getState().flushTapQueue();
}, 800);

export const useDripStore = create<DripState>()(
  persist(
    (set, get) => ({
      user: null,
      dripBalance: 0,
      totalEarned: 0,
      tapValue: 1,
      phase: 'Drip',
      cloudDarknessPercent: 0,
      isDarkCloudReady: false,
      upgradePoints: 0,
      upgrades: {
        bucket: 0,
        wateringCan: 0,
        hose: 0,
        pump: 0,
        lightningBolt: 0,
      },
      settings: {
        soundEnabled: true,
        hapticEnabled: true,
      },
      isBoostActive: false,
      boostMultiplier: 1,
      boostEndsAt: null,
      boostCooldownUntil: null,
      dripWalletBalance: 0,
      pendingTransfers: [],
      referralCode: null,
      referralsCount: 0,
      referralBonusRate: DEFAULT_REFERRAL_BONUS_RATE,
      streakCount: 0,
      streakMultiplier: 1,
      lastTapAt: null,
      recentTapTimestamps: [],
      suspiciousCooldownUntil: null,
      offlineQueue: [],
      isOnline: true,
      launchDate: null,
      launchCountdownEndsAt: null,
      isRainLive: false,
      leaderboard: [],
      friendsLeaderboard: [],
      isHydrated: false,
      setHydrated: () => {
        set({ isHydrated: true });
      },
      initialize: async () => {
        const net = await NetInfo.fetch();
        set({ isOnline: Boolean(net.isConnected) });
        NetInfo.addEventListener((state) => {
          const online = Boolean(state.isConnected);
          set({ isOnline: online });
          if (online) {
            debouncedFlush();
          }
        });

        if (!hasSupabaseEnv()) {
          return;
        }

        await get().syncAuthProfile();
        await get().refreshLeaderboard();
      },
      loginWithEmail: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw error;
        }
        if (data.session) {
          await persistSessionSecurely(JSON.stringify(data.session));
        }
        await get().syncAuthProfile();
      },
      signupWithEmail: async (email: string, password: string, username: string) => {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username,
            },
          },
        });
        if (error) {
          throw error;
        }
        if (data.session) {
          await persistSessionSecurely(JSON.stringify(data.session));
        }
        await get().syncAuthProfile();
      },
      logout: async () => {
        await supabase.auth.signOut();
        await clearPersistedSession();
        set({
          user: null,
        });
      },
      syncAuthProfile: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          set({ user: null });
          return;
        }

        const username = typeof user.user_metadata.username === 'string' ? user.user_metadata.username : null;
        const walletAddress = typeof user.user_metadata.wallet_address === 'string' ? user.user_metadata.wallet_address : null;
        set({
          user: {
            id: user.id,
            email: user.email ?? null,
            username,
            walletAddress,
          },
        });
      },
      updateSettings: (next) => {
        set((state) => ({ settings: { ...state.settings, ...next } }));
      },
      activateBoost: (durationMs, multiplier) => {
        const now = Date.now();
        const activeFor = durationMs > 0 ? durationMs : BOOST_DEFAULT_MS;
        set({
          isBoostActive: true,
          boostMultiplier: Math.max(2, Math.min(5, multiplier)),
          boostEndsAt: now + activeFor,
          boostCooldownUntil: now + BOOST_COOLDOWN_MS,
        });
      },
      maybeTriggerBoost: () => {
        const { isBoostActive, boostCooldownUntil, upgrades } = get();
        const now = Date.now();
        if (isBoostActive || isCooldownActive(boostCooldownUntil, now)) {
          return false;
        }

        const chance = 0.05 + upgrades.pump * 0.01;
        if (Math.random() <= chance) {
          const randomMultiplier = Math.floor(Math.random() * 4) + 2;
          get().activateBoost(BOOST_DEFAULT_MS, randomMultiplier);
          return true;
        }

        return false;
      },
      clearBoostIfExpired: () => {
        const { isBoostActive, boostEndsAt } = get();
        if (!isBoostActive || boostEndsAt === null) {
          return;
        }
        if (Date.now() > boostEndsAt) {
          set({
            isBoostActive: false,
            boostMultiplier: 1,
            boostEndsAt: null,
          });
        }
      },
      canTap: () => {
        const state = get();
        const now = Date.now();
        if (isCooldownActive(state.suspiciousCooldownUntil, now)) {
          return {
            allowed: false,
            retryAfterMs: state.suspiciousCooldownUntil ? state.suspiciousCooldownUntil - now : antiCheatConfig.cooldownMs,
          };
        }

        const windowCutoff = now - antiCheatConfig.tapWindowMs;
        const normalized = state.recentTapTimestamps.filter((item) => item >= windowCutoff);
        if (normalized.length >= antiCheatConfig.maxTapsPerWindow) {
          const cooldownEnd = calculateCooldownEnd(now);
          set({
            recentTapTimestamps: normalized,
            suspiciousCooldownUntil: cooldownEnd,
          });
          return {
            allowed: false,
            retryAfterMs: cooldownEnd - now,
          };
        }

        return {
          allowed: true,
        };
      },
      recordTapLocally: async (timestamp) => {
        const state = get();
        const phase = calculatePhase(state.totalEarned);
        const bucketCap = calcBucketCap(state.upgrades);
        const cappedBalance = Math.min(state.dripBalance, bucketCap);

        const boostedValue = state.isBoostActive ? state.boostMultiplier : 1;
        const tapIncrement = calcTapValue(state.upgrades, phase.baseTapValue) * boostedValue * state.streakMultiplier;
        const roundedIncrement = Number(tapIncrement.toFixed(2));

        const newTotalEarned = state.totalEarned + roundedIncrement;
        const nextPhase = calculatePhase(newTotalEarned);
        const lightningMultiplier = 1 + state.upgrades.lightningBolt * (LIGHTNING_BOLT_DARKENING_BOOST - 1);
        const cloudDarknessPercent = Math.min(100, Math.floor(nextPhase.cloudDarknessPercent * lightningMultiplier));

        const updatedRecentTaps = [...state.recentTapTimestamps.filter((item) => item >= timestamp - antiCheatConfig.tapWindowMs), timestamp];

        let signature = 'offline';
        if (state.user) {
          signature = await buildTapSignature(state.user.id, timestamp, roundedIncrement);
        }

        const nextEvent: TapEvent = {
          id: createEventId(timestamp),
          createdAt: timestamp,
          incrementBy: roundedIncrement,
          signature,
        };

        const nextQueue = [...state.offlineQueue, nextEvent].slice(-OFFLINE_QUEUE_LIMIT);

        set({
          dripBalance: Math.min(cappedBalance + roundedIncrement, bucketCap),
          totalEarned: newTotalEarned,
          tapValue: calcTapValue(state.upgrades, nextPhase.baseTapValue),
          phase: nextPhase.phase,
          cloudDarknessPercent,
          isDarkCloudReady: nextPhase.phase === 'Cloud' && cloudDarknessPercent >= 100,
          lastTapAt: timestamp,
          recentTapTimestamps: updatedRecentTaps,
          offlineQueue: nextQueue,
        });

        debouncedFlush();
        get().evaluateLaunchReadiness();

        return roundedIncrement;
      },
      flushTapQueue: async () => {
        const state = get();
        if (!state.isOnline || state.offlineQueue.length === 0 || !state.user || !hasSupabaseEnv()) {
          return;
        }

        const queueToSend = [...state.offlineQueue];
        try {
          const { data, error } = await supabase.functions.invoke<{
            balance: number;
            totalEarned: number;
            appliedEvents: string[];
            cooldownUntil: number | null;
          }>('handleTap', {
            body: {
              userId: state.user.id,
              events: queueToSend,
            },
          });
          if (error) {
            throw error;
          }
          if (!data) {
            return;
          }

          const applied = new Set(data.appliedEvents);
          const remainingQueue = state.offlineQueue.filter((item) => !applied.has(item.id));
          const phaseState = calculatePhase(data.totalEarned);
          set({
            dripBalance: data.balance,
            totalEarned: data.totalEarned,
            phase: phaseState.phase,
            tapValue: calcTapValue(state.upgrades, phaseState.baseTapValue),
            cloudDarknessPercent: phaseState.cloudDarknessPercent,
            isDarkCloudReady: phaseState.isDarkCloudReady,
            offlineQueue: remainingQueue,
            suspiciousCooldownUntil: data.cooldownUntil,
          });
        } catch {
          // Keep queue for retry when network/server stabilizes.
        }
      },
      setLaunchDate: (isoDate) => {
        set({ launchDate: isoDate });
        get().evaluateLaunchReadiness();
      },
      evaluateLaunchReadiness: () => {
        const state = get();
        if (!state.launchDate || !state.isDarkCloudReady) {
          set({
            launchCountdownEndsAt: null,
            isRainLive: false,
          });
          return;
        }

        const launchAt = Date.parse(state.launchDate);
        if (Number.isNaN(launchAt)) {
          return;
        }

        const now = Date.now();
        if (now < launchAt) {
          set({
            launchCountdownEndsAt: launchAt + 24 * 60 * 60 * 1000,
            isRainLive: false,
          });
          return;
        }

        const rainAt = launchAt + 24 * 60 * 60 * 1000;
        set({
          launchCountdownEndsAt: rainAt,
          isRainLive: now >= rainAt,
        });
      },
      sendDripToUser: async (username, amount) => {
        const state = get();
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
          throw new Error('Amount must be greater than 0.');
        }
        if (numericAmount > state.dripWalletBalance) {
          throw new Error('Insufficient DRIP balance.');
        }

        if (!hasSupabaseEnv() || !state.user) {
          const pending: PendingTransfer = {
            id: `transfer_${Date.now()}`,
            to: username,
            amount,
            type: 'username',
          };
          set((prev) => ({
            pendingTransfers: [...prev.pendingTransfers, pending],
            dripWalletBalance: Math.max(0, prev.dripWalletBalance - numericAmount),
          }));
          return;
        }

        const { error } = await supabase.functions.invoke('walletTransfer', {
          body: {
            toUsername: username,
            amount: numericAmount,
          },
        });
        if (error) {
          throw error;
        }

        set((prev) => ({
          dripWalletBalance: Math.max(0, prev.dripWalletBalance - numericAmount),
        }));
      },
      queueExternalTransfer: (payload) => {
        set((state) => ({
          pendingTransfers: [...state.pendingTransfers, payload],
        }));
      },
      consumeUpgrade: (type) => {
        const state = get();
        const current = state.upgrades[type];
        const maxByType: Record<keyof UpgradeState, number> = {
          bucket: 20,
          wateringCan: 30,
          hose: 10,
          pump: 20,
          lightningBolt: 5,
        };
        if (current >= maxByType[type]) {
          return;
        }

        const baseCost = {
          bucket: 30,
          wateringCan: 50,
          hose: 75,
          pump: 110,
          lightningBolt: 240,
        }[type];
        const cost = Math.round(baseCost * (1 + current * 0.25));
        if (state.dripBalance < cost) {
          return;
        }

        const upgrades = {
          ...state.upgrades,
          [type]: current + 1,
        };
        const phase = calculatePhase(state.totalEarned);
        set({
          upgrades,
          dripBalance: state.dripBalance - cost,
          tapValue: calcTapValue(upgrades, phase.baseTapValue),
        });
      },
      refreshLeaderboard: async () => {
        if (!hasSupabaseEnv()) {
          return;
        }

        const { data, error } = await supabase
          .from('balances')
          .select('user_id, drip_balance, profiles(username)')
          .order('drip_balance', { ascending: false })
          .limit(50);
        if (error || !data) {
          return;
        }

        const leaderboard: LeaderboardEntry[] = data.map((row) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          const username = profile && typeof profile.username === 'string' ? profile.username : 'anon';
          return {
            id: row.user_id as string,
            username,
            dripBalance: Number(row.drip_balance ?? 0),
            streakMultiplier: 1,
          };
        });

        set({ leaderboard });
      },
      claimDailyStreak: () => {
        const state = get();
        const nextStreakCount = state.streakCount + 1;
        const nextMultiplier = Math.min(1 + nextStreakCount * STREAK_MULTIPLIER_STEP, STREAK_MAX_MULTIPLIER);
        set({
          streakCount: nextStreakCount,
          streakMultiplier: Number(nextMultiplier.toFixed(2)),
        });
      },
      setOnline: (next) => {
        set({ isOnline: next });
      },
    }),
    {
      name: 'dripdrop-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dripBalance: state.dripBalance,
        totalEarned: state.totalEarned,
        tapValue: state.tapValue,
        phase: state.phase,
        cloudDarknessPercent: state.cloudDarknessPercent,
        isDarkCloudReady: state.isDarkCloudReady,
        upgrades: state.upgrades,
        settings: state.settings,
        dripWalletBalance: state.dripWalletBalance,
        referralCode: state.referralCode,
        referralsCount: state.referralsCount,
        referralBonusRate: state.referralBonusRate,
        streakCount: state.streakCount,
        streakMultiplier: state.streakMultiplier,
        boostCooldownUntil: state.boostCooldownUntil,
        launchDate: state.launchDate,
        launchCountdownEndsAt: state.launchCountdownEndsAt,
        isRainLive: state.isRainLive,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
