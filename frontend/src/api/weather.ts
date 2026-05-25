import client from './client';

export interface HourlyWeatherInfo {
  time: string;
  condition: string;
  icon: string;
  temperature: number;
  precipitationProb: number;
}

export interface WeatherSummary {
  currentTemp: number;
  condition: string;
  icon: string;
  highTemp: number;
  lowTemp: number;
  currentPop: number;
  hourly: HourlyWeatherInfo[];
}

export const getHourlyWeather = (lat: number, lng: number) =>
  client.get<HourlyWeatherInfo[]>('/weather/hourly', { params: { lat, lng } });

export const getWeatherSummary = (lat: number, lng: number) =>
  client.get<WeatherSummary>('/weather/summary', { params: { lat, lng } });
