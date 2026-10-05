import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { brand } from '@/theme/tokens';

export default function WorkspaceLayout() {
  return (
    <ThemeProvider name="workspace">
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'default', contentStyle: { backgroundColor: brand.cream } }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      </Stack>
    </ThemeProvider>
  );
}
