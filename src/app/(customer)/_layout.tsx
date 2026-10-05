import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { AuthGateSheet } from '@/features/auth/AuthGateSheet';

export default function CustomerLayout() {
  return (
    <ThemeProvider name="customer">
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'default', contentStyle: { backgroundColor: '#FFFFFF' } }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
      <AuthGateSheet />
    </ThemeProvider>
  );
}
