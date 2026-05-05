import { WalletConnectModal } from '@walletconnect/modal-react-native';
import { Analytics } from '@vercel/analytics/react';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { walletConnectModalConfig } from '@/services/walletConnect';

export default function RootLayout() {
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }, []);

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="upgrade-panel" options={{ presentation: 'modal' }} />
          <Stack.Screen name="wallet" options={{ presentation: 'card' }} />
          <Stack.Screen name="roadmap" options={{ presentation: 'modal' }} />
        </Stack>
        {Platform.OS === 'web' ? <Analytics /> : null}
        <WalletConnectModal {...walletConnectModalConfig} />
        <StatusBar style="light" />
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}
