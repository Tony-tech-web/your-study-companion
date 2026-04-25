import { Tabs } from 'expo-router';
import { colors, radius } from '../../src/lib/theme';
import { Text, View, StyleSheet } from 'react-native';

const TabIcon = ({ emoji, focused }: { emoji: string; focused: boolean }) => (
  <View style={[ti.wrap, focused && ti.wrapActive]}>
    <Text style={ti.emoji}>{emoji}</Text>
  </View>
);

const ti = StyleSheet.create({
  wrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  wrapActive: { backgroundColor: colors.primary + '20' },
  emoji: { fontSize: 20 },
});

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        paddingTop: 6,
        paddingBottom: 8,
        height: 80,
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="ai" options={{ title: 'Orbit', tabBarIcon: ({ focused }) => <TabIcon emoji="✨" focused={focused} /> }} />
      <Tabs.Screen name="planner" options={{ title: 'Planner', tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} /> }} />
      <Tabs.Screen name="gpa" options={{ title: 'GPA', tabBarIcon: ({ focused }) => <TabIcon emoji="🎓" focused={focused} /> }} />
      <Tabs.Screen name="research" options={{ title: 'Research', tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} /> }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'Ranks', tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} /> }} />
    </Tabs>
  );
}
