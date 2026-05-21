type WeatherIcon = 'sunny' | 'snowy' | 'cloudy' | 'rainy' | 'sleet';

const WEATHER_MAP: Record<string, { emoji: string; navIcon: 'sunny' | 'rainy' | 'snow'; ionicon: string }> = {
  sunny:  { emoji: '☀️', navIcon: 'sunny',  ionicon: 'sunny-outline'  },
  snowy:  { emoji: '❄️', navIcon: 'snow',   ionicon: 'snow-outline'   },
  cloudy: { emoji: '☁️', navIcon: 'sunny',  ionicon: 'cloudy-outline' },
  rainy:  { emoji: '🌧', navIcon: 'rainy',  ionicon: 'rainy-outline'  },
  sleet:  { emoji: '🌧', navIcon: 'rainy',  ionicon: 'rainy-outline'  },
};

export function getWeatherEmoji(icon: string): string {
  return WEATHER_MAP[icon]?.emoji ?? '☀️';
}

export function getWeatherNavIcon(icon: string): 'sunny' | 'rainy' | 'snow' {
  return WEATHER_MAP[icon]?.navIcon ?? 'sunny';
}

export function getWeatherIonicon(icon: string): string {
  return WEATHER_MAP[icon]?.ionicon ?? 'sunny-outline';
}
