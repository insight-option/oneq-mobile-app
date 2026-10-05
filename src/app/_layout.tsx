import React from 'react';
import { StyleSheet } from 'react-native';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { queryClient } from '@/lib/query';
import { ToastHost } from '@/components/ui';
import { useRole } from '@/store/session';
import { useBootstrap } from '@/features/shell/useBootstrap';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const unstable_settings = { anchor: 'index' };

const RootNavigator = () => {
  useBootstrap();
  const role = useRole();
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'default', contentStyle: { backgroundColor: '#FFFFFF' } }}>
      <Stack.Screen name="index" options={{ animation: 'fade', contentStyle: { backgroundColor: brand.maroon } }} />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', contentStyle: { backgroundColor: brand.maroon } }} />
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(customer)" options={{ animation: 'fade' }} />
      <Stack.Protected guard={role === 'company'}>
        <Stack.Screen name="(company)" options={{ animation: 'fade', contentStyle: { backgroundColor: brand.cream } }} />
      </Stack.Protected>
      <Stack.Protected guard={role === 'admin'}>
        <Stack.Screen name="(admin)" options={{ animation: 'fade', contentStyle: { backgroundColor: brand.cream } }} />
      </Stack.Protected>
      <Stack.Screen name="+not-found" />
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider name="customer">
            <StatusBar style="light" />
            <RootNavigator />
            <ToastHost />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
