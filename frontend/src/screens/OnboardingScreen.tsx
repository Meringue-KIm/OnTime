import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts, cardShadow } from '../constants/colors';

const logo = require('../../assets/logo.png');

const FEATURES = [
  {
    icon: 'navigate-outline' as const,
    title: '집·직장 루트 등록',
    desc: '집과 직장 주소, 도착 목표 시간을 등록하면 매일 자동으로 출발 시간을 계산해드려요.',
    color: colors.primary,
    bg: colors.primaryLight,
  },
  {
    icon: 'alarm-outline' as const,
    title: '스마트 출발 알람',
    desc: '실시간 교통량과 날씨를 반영해 딱 맞는 시간에 알람이 울려요. 여유 시간도 직접 조절할 수 있어요.',
    color: '#2E7D32',
    bg: '#E8F5E9',
  },
  {
    icon: 'calendar-outline' as const,
    title: '약속 알람',
    desc: '약속 장소와 시간을 등록하면 출발 시간을 자동 계산해 미리 알람이 울려요.',
    color: '#7B1FA2',
    bg: '#F3E5F5',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const handleStart = async () => {
    await AsyncStorage.setItem('onboarding_done', 'true');
    navigation.replace('Main');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>스마트 출발 시간 알람</Text>
        </View>

        <Text style={styles.heading}>OnTime이 처음이신가요?</Text>
        <Text style={styles.sub}>3가지 기능으로 매일 정시 출근을 도와드려요.</Text>

        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={[styles.featureIconWrap, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon} size={26} color={f.color} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.hint}>먼저 루트를 등록해볼게요. 1분이면 충분해요!</Text>

        <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
          <Text style={styles.startBtnText}>루트 등록하러 가기 →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.bg },
  inner:           { flexGrow: 1, padding: 24, paddingBottom: 40 },
  logoWrap:        { alignItems: 'center', marginTop: 8, marginBottom: 24 },
  logo:            { width: 160, height: 72 },
  tagline:         { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, marginTop: 4 },
  heading:         { fontSize: 22, fontFamily: fonts.bold, color: colors.textPrimary, marginBottom: 6 },
  sub:             { fontSize: 14, fontFamily: fonts.regular, color: colors.textSecondary, marginBottom: 24, lineHeight: 20 },
  featureList:     { gap: 12, marginBottom: 28 },
  featureCard:     { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: colors.card, borderRadius: 14, padding: 16, ...cardShadow },
  featureIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureTextWrap: { flex: 1 },
  featureTitle:    { fontSize: 15, fontFamily: fonts.semiBold, color: colors.textPrimary, marginBottom: 4 },
  featureDesc:     { fontSize: 13, fontFamily: fonts.regular, color: colors.textSecondary, lineHeight: 19 },
  hint:            { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center', marginBottom: 16, lineHeight: 19 },
  startBtn:        { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  startBtnText:    { fontSize: 16, fontFamily: fonts.bold, color: '#fff' },
});
