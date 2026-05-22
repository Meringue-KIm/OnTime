import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';



export interface Coords {
  lat: number;
  lng: number;
}

export type LocationStatus = 'loading' | 'granted' | 'denied';

export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<LocationStatus>('loading');

  useEffect(() => {
    (async () => {
      const { status: existing } = await Location.getForegroundPermissionsAsync();

      if (existing === 'granted') {
        await fetchLocation();
        return;
      }

      const { status: requested } = await Location.requestForegroundPermissionsAsync();

      if (requested === 'granted') {
        await fetchLocation();
      } else {
        setStatus('denied');
        if (Platform.OS !== 'web') {
          Alert.alert(
            '위치 권한이 필요해요',
            '현재 위치 기반 날씨를 보려면 위치 권한을 허용해주세요.\n설정에서 변경하거나, 루트에서 집 주소를 등록하면 그 위치 날씨를 보여드려요.',
            [
              { text: '나중에', style: 'cancel' },
              {
                text: '설정 열기',
                onPress: () => Linking.openSettings(),
              },
            ],
          );
        }
      }
    })();
  }, []);

  async function fetchLocation() {
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setStatus('granted');
    } catch {
      setStatus('denied');
    }
  }

  return { coords, status };
}
