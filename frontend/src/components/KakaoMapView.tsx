import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../constants/colors';

interface Props {
  lat: number;
  lng: number;
  label?: string;
  height?: number;
}

const KAKAO_JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';

function buildMapHtml(lat: number, lng: number, label: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
  <script type="text/javascript"
    src="//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false">
  </script>
</head>
<body>
  <div id="map"></div>
  <script>
    kakao.maps.load(function() {
      var container = document.getElementById('map');
      var center = new kakao.maps.LatLng(${lat}, ${lng});
      var map = new kakao.maps.Map(container, { center: center, level: 4 });

      var marker = new kakao.maps.Marker({ position: center, map: map });

      ${label ? `
      var infowindow = new kakao.maps.InfoWindow({
        content: '<div style="padding:6px 10px;font-size:13px;font-weight:600;">${label.replace(/'/g, "\\'")}</div>'
      });
      infowindow.open(map, marker);
      ` : ''}
    });
  </script>
</body>
</html>`;
}

export default function KakaoMapView({ lat, lng, label = '', height = 160 }: Props) {
  if (!KAKAO_JS_KEY) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>
          .env 파일에 EXPO_PUBLIC_KAKAO_JS_KEY 설정이 필요합니다
        </Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    const html = buildMapHtml(lat, lng, label);
    return (
      <View style={{ height, overflow: 'hidden', borderRadius: 10 }}>
        <iframe
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="kakao-map"
        />
      </View>
    );
  }

  // Native: react-native-webview (npx expo install react-native-webview 후 사용 가능)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WebView } = require('react-native-webview');
    const html = buildMapHtml(lat, lng, label);
    return (
      <View style={{ height, borderRadius: 10, overflow: 'hidden' }}>
        <WebView
          source={{ html }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
    );
  } catch {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>
          npx expo install react-native-webview
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
