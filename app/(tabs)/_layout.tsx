import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform, BlurView } from 'react-native';
import { colors, radius, typography, fontWeight } from '../../src/lib/theme';

// Each tab icon — emoji wrapped in a pill when active
const TabIcon = ({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) => (
  <View style={[ti.wrap, focused && ti.wrapActive]}>
    <Text style={ti.emoji}>{emoji}</Text>
    {focused && <Text style={ti.label}>{label}</Text>}
  </View>
);

const ti = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    minWidth: 36,
    justifyContent: 'center',
  },
  wrapActive: {
    backgroundColor: 'rgba(242,125,38,0.18)',
  },
  emoji: { fontSize: 20 },
  label: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 24,
          left: 20,
          right: 20,
          height: 68,
          borderRadius: 34,
          backgroundColor: 'rgba(20,20,22,0.85)',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          // Shadow for the glass pill
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5,
          shadowRadius: 24,
          elevation: 20,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
          height: 68,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚡" label="Home" focused={focused} /> }} />
      <Tabs.Screen name="ai" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="✦" label="Orbit" focused={focused} /> }} />
      <Tabs.Screen name="planner" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="◫" label="Plan" focused={focused} /> }} />
      <Tabs.Screen name="gpa" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="◎" label="GPA" focused={focused} /> }} />
      <Tabs.Screen name="research" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⌕" label="Search" focused={focused} /> }} />
      <Tabs.Screen name="leaderboard" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="◈" label="Ranks" focused={focused} /> }} />
    </Tabs>
  );
}
