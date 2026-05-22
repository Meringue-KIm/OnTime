import client from './client';

export interface GeocodeResult {
  lat: number;
  lng: number;
}

export interface DirectionsResult {
  durationMinutes: number;
}

export interface PlaceSuggestion {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const geocodeAddress = (address: string) =>
  client.get<GeocodeResult>('/kakao/geocode', { params: { address } });

export const searchPlaces = (query: string) =>
  client.get<PlaceSuggestion[]>('/kakao/search', { params: { query } });

export const getDrivingTime = (
  originLat: number, originLng: number,
  destLat: number,   destLng: number,
) => client.get<DirectionsResult>('/kakao/directions', {
  params: { originLat, originLng, destLat, destLng },
});
