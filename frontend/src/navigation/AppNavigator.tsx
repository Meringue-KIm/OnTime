import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useAuthStore } from '../store/authStore';
import { useRouteStore } from '../store/routeStore';
import { useAppointmentStore } from '../store/appointmentStore';
import { useTodayStore } from '../store/todayStore';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TabNavigator from './TabNavigator';
import { colors } from '../constants/colors';
import { pingServer } from '../api/ping';
import { cancelAllAlarms } from '../utils/localAlarm';
import { updateFcmToken } from '../api/auth';

const Stack = createNativeStackNavigator();
const logo = require('../../assets/logo.png');

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <Image source={logo} style={styles.splashLogo} resizeMode="contain" />
    </View>
  );
}

export default function AppNavigator() {
  const { isLoggedIn, isLoading, loadToken } = useAuthStore();
  const resetRoutes       = useRouteStore(s => s.reset);
  const resetAppointments = useAppointmentStore(s => s.reset);
  const resetToday        = useTodayStore(s => s.reset);

  useEffect(() => { pingServer(); loadToken(); }, []);

  // 로그인 상태가 되면 FCM 토큰 즉시 재등록 — 앱 재설치/토큰 만료 대응
  useEffect(() => {
    if (!isLoggedIn || !Device.isDevice || Platform.OS === 'web') return;
    Notifications.getDevicePushTokenAsync()
      .then(({ data }) => updateFcmToken(data))
      .catch(() => {});
  }, [isLoggedIn]);

  // 로그아웃 시 모든 스토어 + 로컬 알람 초기화
  useEffect(() => {
    if (!isLoggedIn && !isLoading) {
      resetRoutes();
      resetAppointments();
      resetToday();
      cancelAllAlarms().catch(() => {});
    }
  }, [isLoggedIn, isLoading]);

  if (isLoading) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="Main"     component={TabNavigator} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login"          component={LoginScreen} />
            <Stack.Screen name="Signup"         component={SignupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash:      { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  splashLogo:  { width: 220, height: 100 },
});
