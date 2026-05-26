package com.commute.app.global.odsay;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class OdsayService {

    @Value("${odsay.api-key:}")
    private String apiKey;

    private final RestClient restClient = RestClient.create();
    private final StringRedisTemplate redisTemplate;

    public OdsayService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public Optional<Integer> getTransitMinutes(Double originLat, Double originLng,
                                               Double destLat, Double destLng) {
        if (apiKey.isBlank() || originLat == null || destLat == null) return Optional.empty();

        String cacheKey = String.format("odsay:transit:%.4f:%.4f:%.4f:%.4f",
                originLat, originLng, destLat, destLng);
        try {
            String cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached != null) return Optional.of(Integer.parseInt(cached));
        } catch (Exception ignored) {}

        try {
            URI uri = UriComponentsBuilder
                    .fromHttpUrl("https://api.odsay.com/v1/api/searchPubTransPathT")
                    .queryParam("apiKey", apiKey)
                    .queryParam("SX", originLng)
                    .queryParam("SY", originLat)
                    .queryParam("EX", destLng)
                    .queryParam("EY", destLat)
                    .build(true)
                    .toUri();

            OdsayResponse response = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(OdsayResponse.class);

            if (response == null || response.result() == null
                    || response.result().path() == null
                    || response.result().path().isEmpty()) {
                return Optional.empty();
            }

            int totalMinutes = response.result().path().stream()
                    .mapToInt(p -> p.info().totalTime())
                    .min()
                    .orElse(0);

            if (totalMinutes <= 0) return Optional.empty();

            try {
                redisTemplate.opsForValue().set(cacheKey, String.valueOf(totalMinutes), 30, TimeUnit.MINUTES);
            } catch (Exception ignored) {}

            return Optional.of(totalMinutes);

        } catch (Exception e) {
            log.warn("ODsay transit failed ({:.4f},{:.4f})→({:.4f},{:.4f}): {}",
                    originLat, originLng, destLat, destLng, e.getMessage());
            return Optional.empty();
        }
    }

    record OdsayResponse(OdsayResult result) {}
    record OdsayResult(List<OdsayPath> path) {}
    record OdsayPath(OdsayPathInfo info) {}
    record OdsayPathInfo(int totalTime) {}
}
