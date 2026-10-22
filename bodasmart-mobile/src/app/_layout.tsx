import { StatusBar } from 'expo-status-bar';
import { NativeTabs } from 'expo-router/native-tabs';
import { View } from 'react-native';

import homeTabIcon from '@/assets/images/tabIcons/home.png';
import historyTabIcon from '@/assets/images/tabIcons/explore.png';
import { AuthScreen } from '@/components/auth-screen';
import { AppProvider } from '@/context/app-context';
import { useApp } from '@/hooks/use-app';

function AppShell() {
  const { user, isReady } = useApp();

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: '#f5f7f3' }} />;
  }

  if (!user) return <AuthScreen />;

  return (
    <NativeTabs
      backgroundColor="#f5f7f3"
      indicatorColor="#eaf1e8"
      iconColor={{ default: '#87938a', selected: '#174b35' }}
      labelStyle={{ default: { color: '#87938a' }, selected: { color: '#174b35' } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Ride</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={homeTabIcon} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={historyTabIcon} renderingMode="template" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <AppShell />
    </AppProvider>
  );
}
