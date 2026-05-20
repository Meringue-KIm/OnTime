package com.commute.app.global.kakao;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
public class KakaoMapService {

    @Value("${kakao.rest-api-key:}")
    private String restApiKey;

    private final RestClient restClient = RestClient.create();

    public record Coordinates(Double lat, Double lng) {}

    public Optional<Coordinates> geocode(String address) {
        if (restApiKey.isBlank()) return Optional.empty();
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
            return Optional.of(new Coordinates(Double.parseDouble(doc.y()), Double.parseDouble(doc.x())));
        } catch (Exception e) {
            log.warn("Kakao geocode failed for '{}': {}", address, e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<Integer> getDrivingMinutes(Double originLat, Double originLng,
                                               Double destLat, Double destLng) {
        if (restApiKey.isBlank() || originLat == null || destLat == null) return Optional.empty();
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
            return Optional.of((int) Math.ceil(summary.duration() / 60.0));
        } catch (RestClientException e) {
            log.warn("Kakao directions failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    // ─── Kakao Geocode response ────────────────────────────────────────────────
    record GeocodeResponse(List<GeocodeDocument> documents) {}
    record GeocodeDocument(String x, String y) {} // x=경도(lng), y=위도(lat)

    // ─── Kakao Directions response ─────────────────────────────────────────────
    record DirectionsResponse(List<Route> routes) {}
    record Route(RouteSummary summary) {}
    record RouteSummary(int duration, int distance) {} // duration=seconds, distance=meters
}
