import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, fontWeight, TAB_BAR_HEIGHT } from '../../src/lib/theme';

const TAB_ITEMS = [
  { name: 'index',       emoji: '⚡', label: 'Home'   },
  { name: 'ai',          emoji: '✦',  label: 'Orbit'  },
  { name: 'planner',     emoji: '◫',  label: 'Plan'   },
  { name: 'gpa',         emoji: '◎',  label: 'GPA'    },
  { name: 'research',    emoji: '⌕',  label: 'Search' },
  { name: 'leaderboard', emoji: '◈',  label: 'Ranks'  },
];

const TabIcon = ({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) => (
  <View style={[ti.item, focused && ti.itemActive]}>
    <Text style={[ti.emoji, focused && ti.emojiActive]}>{emoji}</Text>
    {focused && <Text style={ti.label}>{label}</Text>}
  </View>
);

const ti = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 20, gap: 5, minWidth: 36,
  },
  itemActive: { backgroundColor: 'rgba(242,125,38,0.18)' },
  emoji: { fontSize: 20, opacity: 0.5 },
  emojiActive: { opacity: 1 },
  label: { color: colors.primary, fontSize: 12, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 24, left: 16, right: 16,
          height: 68,
          borderRadius: 34,
          backgroundColor: Platform.OS === 'ios' ? 'rgba(28,28,30,0.85)' : 'rgba(20,20,22,0.97)',
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(255,255,255,0.14)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.6,
          shadowRadius: 30,
          elevation: 24,
          paddingBottom: 0, paddingTop: 0,
        },
        tabBarItemStyle: { height: 68, paddingVertical: 0 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      {TAB_ITEMS.map(t => (
        <Tabs.Screen key={t.name} name={t.name}
          options={{ tabBarIcon: ({ focused }) => <TabIcon emoji={t.emoji} label={t.label} focused={focused} /> }}
        />
      ))}
    </Tabs>
  );
}
