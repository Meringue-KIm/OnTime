import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from '../screens/HomeScreen';
import RouteScreen from '../screens/RouteScreen';
import AppointmentScreen from '../screens/AppointmentScreen';
import AlarmScreen from '../screens/AlarmScreen';
import StatsScreen from '../screens/StatsScreen';
import { colors } from '../constants/colors';

const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, [IoniconName, IoniconName]> = {
  Home:        ['grid',     'grid-outline'],
  Route:       ['navigate', 'navigate-outline'],
  Appointment: ['calendar', 'calendar-outline'],
  Alarm:       ['alarm',    'alarm-outline'],
  Stats:       ['bar-chart','bar-chart-outline'],
};

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const [startTab, setStartTab] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_done').then(v => {
      setStartTab(v ? 'Home' : 'Route');
      if (!v) AsyncStorage.setItem('onboarding_done', 'true');
    });
  }, []);

  if (!startTab) return null;

  return (
    <Tab.Navigator
      initialRouteName={startTab}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 62 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const [active, inactive] = TAB_ICONS[route.name] ?? ['grid', 'grid-outline'];
          return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"        component={HomeScreen}        options={{ tabBarLabel: '대시보드' }} />
      <Tab.Screen name="Route"       component={RouteScreen}       options={{ tabBarLabel: '루트' }} />
      <Tab.Screen name="Appointment" component={AppointmentScreen} options={{ tabBarLabel: '약속' }} />
      <Tab.Screen name="Alarm"       component={AlarmScreen}       options={{ tabBarLabel: '알람' }} />
      <Tab.Screen name="Stats"       component={StatsScreen}       options={{ tabBarLabel: '통계' }} />
    </Tab.Navigator>
  );
}
