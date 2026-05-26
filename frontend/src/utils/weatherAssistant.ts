import type { WeatherSummary } from '../api/weather';

export interface WeatherRecommendation {
  umbrella: { needed: boolean; urgent: boolean; label: string } | null;
  outfit: string;
  tempGap: boolean;
  sunscreen: boolean;
}

export function getWeatherRecommendations(weather: WeatherSummary): WeatherRecommendation {
  const isRainingNow = weather.icon === 'rainy' || weather.icon === 'sleet' || weather.icon === 'snowy';
  const maxPop = Math.max(weather.currentPop, ...weather.hourly.map(h => h.precipitationProb ?? 0));

  let umbrella: WeatherRecommendation['umbrella'] = null;
  if (isRainingNow || maxPop >= 60) {
    umbrella = { needed: true, urgent: true, label: '우산 꼭 챙기세요' };
  } else if (maxPop >= 30) {
    umbrella = { needed: true, urgent: false, label: '우산 챙기면 좋아요' };
  }

  const temp = weather.highTemp;
  let outfit = '';
  if      (temp >= 28) outfit = '반팔 · 반바지';
  else if (temp >= 23) outfit = '반팔 · 얇은 셔츠';
  else if (temp >= 20) outfit = '얇은 긴팔 · 가디건';
  else if (temp >= 15) outfit = '자켓 · 가디건';
  else if (temp >= 10) outfit = '두꺼운 자켓 · 니트';
  else if (temp >= 5)  outfit = '코트';
  else                 outfit = '패딩 · 두꺼운 코트';

  const tempGap = (weather.highTemp - weather.lowTemp) >= 10;
  const sunscreen = weather.icon === 'sunny' && weather.highTemp >= 22;

  return { umbrella, outfit, tempGap, sunscreen };
}
