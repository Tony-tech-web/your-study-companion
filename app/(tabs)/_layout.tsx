import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontWeight } from '../../src/lib/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; label: string; icon: IoniconName; activeIcon: IoniconName }[] = [
  { name: 'index',       label: 'Home',     icon: 'home-outline',      activeIcon: 'home'            },
  { name: 'ai',          label: 'Orbit',    icon: 'sparkles-outline',  activeIcon: 'sparkles'        },
  { name: 'planner',     label: 'Planner',  icon: 'calendar-outline',  activeIcon: 'calendar'        },
  { name: 'gpa',         label: 'GPA',      icon: 'school-outline',    activeIcon: 'school'          },
  { name: 'research',    label: 'Search',   icon: 'search-outline',    activeIcon: 'search'          },
  { name: 'courses',     label: 'PDFs',     icon: 'document-outline',  activeIcon: 'document'        },
  { name: 'leaderboard', label: 'Ranks',    icon: 'trophy-outline',    activeIcon: 'trophy'          },
];

const TabIcon = ({ icon, activeIcon, label, focused }: { icon: IoniconName; activeIcon: IoniconName; label: string; focused: boolean }) => (
  <View style={[ti.wrap, focused && ti.wrapActive]}>
    <Ionicons name={focused ? activeIcon : icon} size={22} color={focused ? colors.primary : colors.muted} />
    {focused && <Text style={ti.label}>{label}</Text>}
  </View>
);

const ti = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 16, gap: 2 },
  wrapActive: { backgroundColor: colors.primary + '18', paddingHorizontal: 12 },
  label: { color: colors.primary, fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: -0.2 },
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
          height: 64,
          borderRadius: 32,
          backgroundColor: Platform.OS === 'ios'
            ? 'rgba(20,20,22,0.88)' : 'rgba(20,20,22,0.97)',
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: 'rgba(255,255,255,0.12)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.55,
          shadowRadius: 24,
          elevation: 20,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarItemStyle: { height: 64 },
      }}
    >
      {TABS.map(t => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon icon={t.icon} activeIcon={t.activeIcon} label={t.label} focused={focused} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
