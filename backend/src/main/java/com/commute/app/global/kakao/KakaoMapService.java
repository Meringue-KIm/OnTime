package com.commute.app.global.kakao;

import com.commute.app.global.odsay.OdsayService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class KakaoMapService {

    @Value("${kakao.rest-api-key:}")
    private String restApiKey;

    private final RestClient restClient = RestClient.create();
    private final StringRedisTemplate redisTemplate;
    private final OdsayService odsayService;

    public KakaoMapService(StringRedisTemplate redisTemplate, OdsayService odsayService) {
        this.redisTemplate = redisTemplate;
        this.odsayService = odsayService;
    }

    public record Coordinates(Double lat, Double lng) {}

    public Optional<Coordinates> geocode(String address) {
        if (restApiKey.isBlank()) return Optional.empty();

        String key = "kakao:geocode:" + address;
        try {
            String cached = redisTemplate.opsForValue().get(key);
            if (cached != null) {
                String[] parts = cached.split(",");
                return Optional.of(new Coordinates(Double.parseDouble(parts[0]), Double.parseDouble(parts[1])));
            }
        } catch (Exception ignored) {}

        try {
            GeocodeResponse response = restClient.get()
                    .uri("https://dapi.kakao.com/v2/local/search/address.json?query={q}", address)
                    .header("Authorization", "KakaoAK " + restApiKey)
                    .retrieve()
                    .body(GeocodeResponse.class);

            if (response == null || response.documents() == null || response.documents().isEmpty()) {
                return Optional.empty();
            }
            GeocodeDocument doc = response.documents().get(0);
            Coordinates coords = new Coordinates(Double.parseDouble(doc.y()), Double.parseDouble(doc.x()));

            try {
                redisTemplate.opsForValue().set(key, coords.lat() + "," + coords.lng(), 24, TimeUnit.HOURS);
            } catch (Exception ignored) {}

            return Optional.of(coords);
        } catch (Exception e) {
            log.warn("Kakao geocode failed for '{}': {}", address, e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<Integer> getDrivingMinutes(Double originLat, Double originLng,
                                               Double destLat, Double destLng) {
        return getTravelMinutes(originLat, originLng, destLat, destLng, "car");
    }

    public Optional<Integer> getTravelMinutes(Double originLat, Double originLng,
                                              Double destLat, Double destLng, String transportMode) {
        if (originLat == null || destLat == null) return Optional.empty();

        if ("walk".equals(transportMode)) {
            double distKm = haversineKm(originLat, originLng, destLat, destLng);
            int minutes = (int) Math.ceil(distKm * 1.3 / 5.0 * 60);
            return Optional.of(minutes);
        }

        if ("transit".equals(transportMode)) {
            Optional<Integer> odsayResult = odsayService.getTransitMinutes(originLat, originLng, destLat, destLng);
            if (odsayResult.isPresent()) return odsayResult;
        }

        if (restApiKey.isBlank()) return Optional.empty();

        String key = String.format("kakao:directions:%s:%.4f:%.4f:%.4f:%.4f",
                transportMode, originLat, originLng, destLat, destLng);
        try {
            String cached = redisTemplate.opsForValue().get(key);
            if (cached != null) return Optional.of(Integer.parseInt(cached));
        } catch (Exception ignored) {}

        try {
            String origin = String.format("%.7f,%.7f", originLng, originLat);
            String destination = String.format("%.7f,%.7f", destLng, destLat);

            DirectionsResponse response = restClient.get()
                    .uri("https://apis-navi.kakaomobility.com/v1/directions?origin={o}&destination={d}&priority=RECOMMEND",
                            origin, destination)
                    .header("Authorization", "KakaoAK " + restApiKey)
                    .retrieve()
                    .body(DirectionsResponse.class);

            if (response == null || response.routes() == null || response.routes().isEmpty()) {
                return Optional.empty();
            }
            RouteSummary summary = response.routes().get(0).summary();
            if (summary == null) return Optional.empty();

            int carMinutes = (int) Math.ceil(summary.duration() / 60.0);
            int minutes = carMinutes;

            try {
                redisTemplate.opsForValue().set(key, String.valueOf(minutes), 30, TimeUnit.MINUTES);
            } catch (Exception ignored) {}

            return Optional.of(minutes);
        } catch (RestClientException e) {
            log.warn("Kakao directions failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public record PlaceSuggestion(String name, String address, double lat, double lng) {}

    public List<PlaceSuggestion> searchPlaces(String query) {
        if (restApiKey.isBlank() || query == null || query.isBlank()) return List.of();

        // 1차: 키워드 검색 (POI — 장소명, 브랜드, 상호)
        try {
            KeywordResponse response = restClient.get()
                    .uri("https://dapi.kakao.com/v2/local/search/keyword.json?query={q}&size=5", query)
                    .header("Authorization", "KakaoAK " + restApiKey)
                    .retrieve()
                    .body(KeywordResponse.class);
            if (response != null && response.documents() != null && !response.documents().isEmpty()) {
                return response.documents().stream()
                        .map(d -> new PlaceSuggestion(
                                d.place_name(),
                                d.road_address_name().isBlank() ? d.address_name() : d.road_address_name(),
                                Double.parseDouble(d.y()),
                                Double.parseDouble(d.x())))
                        .toList();
            }
        } catch (Exception e) {
            log.warn("Kakao keyword search failed for '{}': {}", query, e.getMessage());
        }

        // 2차: 주소 검색 fallback (행정구역·도로명 — "인천 서구" 등)
        try {
            GeocodeResponse response = restClient.get()
                    .uri("https://dapi.kakao.com/v2/local/search/address.json?query={q}&size=5", query)
                    .header("Authorization", "KakaoAK " + restApiKey)
                    .retrieve()
                    .body(GeocodeResponse.class);
            if (response == null || response.documents() == null || response.documents().isEmpty()) return List.of();
            return response.documents().stream()
                    .map(d -> {
                        String addr = (d.road_address() != null
                                && d.road_address().address_name() != null
                                && !d.road_address().address_name().isBlank())
                                ? d.road_address().address_name()
                                : (d.address_name() != null ? d.address_name() : "");
                        String name = d.address_name() != null ? d.address_name() : addr;
                        return new PlaceSuggestion(name, addr,
                                Double.parseDouble(d.y()), Double.parseDouble(d.x()));
                    })
                    .toList();
        } catch (Exception e) {
            log.warn("Kakao address search fallback failed for '{}': {}", query, e.getMessage());
            return List.of();
        }
    }

    // ─── Kakao Geocode / Address search response ───────────────────────────────
    record GeocodeResponse(List<GeocodeDocument> documents) {}
    record GeocodeDocument(String x, String y, String address_name, RoadAddress road_address) {}
    record RoadAddress(String address_name) {}

    // ─── Kakao Keyword search response ────────────────────────────────────────
    record KeywordResponse(List<KeywordDocument> documents) {}
    record KeywordDocument(String place_name, String road_address_name, String address_name, String x, String y) {}

    // ─── Kakao Directions response ─────────────────────────────────────────────
    record DirectionsResponse(List<Route> routes) {}
    record Route(RouteSummary summary) {}
    record RouteSummary(int duration, int distance) {} // duration=seconds, distance=meters
}
