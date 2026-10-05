import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';
import { queryClient } from '@/lib/query';
import { WEB_MAX_WIDTH } from '@/lib/layout';
import { applyWebDirection, isRTL } from '@/lib/rtl';
import { useWebFonts } from '@/lib/webFonts';
import { ToastHost } from '@/components/ui';
import { useRole } from '@/store/session';
import { useBootstrap } from '@/features/shell/useBootstrap';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
applyWebDirection();

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

// react-native-web resolves inline logical styles (start/end, marginStart…) from its locale context, which only the
// `dir` prop sets; the document-level dir (src/lib/rtl.ts) covers the compiled stylesheet rules.
const shellDirection = Platform.OS === 'web' ? ({ dir: isRTL ? 'rtl' : 'ltr' } as object) : {};

export default function RootLayout() {
  useWebFonts();
  return (
    <GestureHandlerRootView style={[styles.flex, Platform.OS === 'web' && styles.webBackdrop]}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider name="customer">
            <StatusBar style="light" />
            <View {...shellDirection} style={[styles.flex, Platform.OS === 'web' && styles.webShell]}>
              <RootNavigator />
              <ToastHost />
            </View>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // web: the browser renders the app as a centred phone-width column on a dark backdrop (see src/lib/layout.ts)
  webBackdrop: { backgroundColor: '#2A0010' },
  webShell: { width: '100%', maxWidth: WEB_MAX_WIDTH, alignSelf: 'center', overflow: 'hidden', backgroundColor: '#FFFFFF' },
});
