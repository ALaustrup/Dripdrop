import { Asset } from 'expo-asset';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

const tapSoundUris = [
  Asset.fromModule(require('@/assets/sounds/tap-1.mp3')).uri,
  Asset.fromModule(require('@/assets/sounds/tap-2.mp3')).uri,
  Asset.fromModule(require('@/assets/sounds/tap-3.mp3')).uri,
];

const boostSoundUri = Asset.fromModule(require('@/assets/sounds/boost.mp3')).uri;
const rainSoundUri = Asset.fromModule(require('@/assets/sounds/rain.mp3')).uri;

let isConfigured = false;

async function ensureAudioMode(): Promise<void> {
  if (isConfigured) {
    return;
  }

  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });

  isConfigured = true;
}

async function playByUri(uri: string): Promise<void> {
  await ensureAudioMode();
  const { sound } = await Audio.Sound.createAsync(
    { uri },
    { shouldPlay: true, volume: 0.7, isLooping: false },
    undefined,
    false
  );
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      void sound.unloadAsync();
    }
  });
}

export async function preloadAudioAssets(): Promise<void> {
  await Promise.all([
    Asset.loadAsync(require('@/assets/sounds/tap-1.mp3')),
    Asset.loadAsync(require('@/assets/sounds/tap-2.mp3')),
    Asset.loadAsync(require('@/assets/sounds/tap-3.mp3')),
    Asset.loadAsync(require('@/assets/sounds/boost.mp3')),
    Asset.loadAsync(require('@/assets/sounds/rain.mp3')),
  ]);
}

export async function playRandomTapSound(enabled: boolean): Promise<void> {
  if (!enabled) {
    return;
  }

  const index = Math.floor(Math.random() * tapSoundUris.length);
  await playByUri(tapSoundUris[index]);
}

export async function playBoostSound(enabled: boolean): Promise<void> {
  if (!enabled) {
    return;
  }
  await playByUri(boostSoundUri);
}

export async function playRainSound(enabled: boolean): Promise<void> {
  if (!enabled) {
    return;
  }
  await playByUri(rainSoundUri);
}
