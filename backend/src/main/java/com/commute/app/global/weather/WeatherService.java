package com.commute.app.global.weather;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class WeatherService {

    @Value("${kma.service-key:}")
    private String serviceKey;

    private final RestClient restClient = RestClient.create();
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final long CACHE_TTL_MINUTES = 10;

    public WeatherService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper  = objectMapper;
    }

    // Lambert 투영 상수 (기상청 격자 좌표 변환)
    private static final double RE     = 6371.00877;
    private static final double GRID   = 5.0;
    private static final double SLAT1  = 30.0;
    private static final double SLAT2  = 60.0;
    private static final double OLON   = 126.0;
    private static final double OLAT   = 38.0;
    private static final double XO     = 43.0;
    private static final double YO     = 136.0;
    private static final double DEGRAD = Math.PI / 180.0;

    public record WeatherInfo(
        int    precipitationType,
        String condition,
        String icon,
        double temperature,
        int    bufferMinutes
    ) {}

    public record HourlyWeatherInfo(String time, String condition, String icon, double temperature) {}

    public record WeatherSummary(
        double currentTemp,
        String condition,
        String icon,
        double highTemp,
        double lowTemp,
        List<HourlyWeatherInfo> hourly
    ) {}

    // ─── 캐시 키 (소수점 2자리 반올림 → 약 1km 이내 동일 키) ──────────────────
    private String currentKey(Double lat, Double lng) {
        return String.format("weather:current:%.2f:%.2f", lat, lng);
    }

    private String summaryKey(Double lat, Double lng) {
        return String.format("weather:summary:%.2f:%.2f", lat, lng);
    }

    // ─── Public API ──────────────────────────────────────────────────────────

    public WeatherSummary getWeatherSummary(Double lat, Double lng) {
        String key = summaryKey(lat, lng);
        try {
            String cached = redisTemplate.opsForValue().get(key);
            if (cached != null) return objectMapper.readValue(cached, WeatherSummary.class);
        } catch (Exception ignored) {}

        WeatherInfo current = getWeather(lat, lng)
                .orElse(new WeatherInfo(0, "맑음", "sunny", 0.0, 0));
        List<HourlyWeatherInfo> hourly = getHourlyForecast(lat, lng);

        double high = hourly.stream().mapToDouble(HourlyWeatherInfo::temperature)
                .max().orElse(current.temperature());
        double low  = hourly.stream().mapToDouble(HourlyWeatherInfo::temperature)
                .min().orElse(current.temperature());
        high = Math.max(high, current.temperature());
        low  = Math.min(low,  current.temperature());

        WeatherSummary summary = new WeatherSummary(
                current.temperature(), current.condition(), current.icon(), high, low, hourly);

        try {
            redisTemplate.opsForValue().set(
                    key, objectMapper.writeValueAsString(summary), CACHE_TTL_MINUTES, TimeUnit.MINUTES);
        } catch (Exception ignored) {}

        return summary;
    }

    public Optional<WeatherInfo> getWeather(Double lat, Double lng) {
        if (serviceKey == null || serviceKey.isBlank() || lat == null || lng == null) {
            return Optional.empty();
        }

        String key = currentKey(lat, lng);
        try {
            String cached = redisTemplate.opsForValue().get(key);
            if (cached != null) return Optional.of(objectMapper.readValue(cached, WeatherInfo.class));
        } catch (Exception ignored) {}

        Optional<WeatherInfo> result = fetchCurrentWeather(lat, lng);
        result.ifPresent(info -> {
            try {
                redisTemplate.opsForValue().set(
                        key, objectMapper.writeValueAsString(info), CACHE_TTL_MINUTES, TimeUnit.MINUTES);
            } catch (Exception ignored) {}
        });
        return result;
    }

    // ─── 기상청 초단기실황 API 호출 ────────────────────────────────────────────
    private Optional<WeatherInfo> fetchCurrentWeather(Double lat, Double lng) {
        try {
            int[] grid = latLngToGrid(lat, lng);

            LocalDateTime now = LocalDateTime.now();
            LocalDateTime base = now.getMinute() < 10 ? now.minusHours(1) : now;
            String baseDate    = base.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            String baseTimeStr = base.format(DateTimeFormatter.ofPattern("HH")) + "00";

            KmaApiResponse response = restClient.get()
                    .uri(b -> b
                            .scheme("https")
                            .host("apis.data.go.kr")
                            .path("/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst")
                            .queryParam("serviceKey", serviceKey)
                            .queryParam("numOfRows", 10)
                            .queryParam("pageNo", 1)
                            .queryParam("dataType", "JSON")
                            .queryParam("base_date", baseDate)
                            .queryParam("base_time", baseTimeStr)
                            .queryParam("nx", grid[0])
                            .queryParam("ny", grid[1])
                            .build())
                    .retrieve()
                    .body(KmaApiResponse.class);

            if (response == null
                    || response.response() == null
                    || response.response().body() == null
                    || response.response().body().items() == null) {
                return Optional.empty();
            }

            String resultCode = response.response().header() != null
                    ? response.response().header().resultCode() : null;
            if (!"00".equals(resultCode)) {
                log.warn("기상청 API 오류 코드: {}", resultCode);
                return Optional.empty();
            }

            List<KmaItem> items = response.response().body().items().item();
            if (items == null) return Optional.empty();

            int    pty = 0;
            double t1h = 0.0;
            for (KmaItem item : items) {
                if ("PTY".equals(item.category())) pty = (int) Double.parseDouble(item.obsrValue());
                if ("T1H".equals(item.category())) t1h = Double.parseDouble(item.obsrValue());
            }

            return Optional.of(buildWeatherInfo(pty, t1h));

        } catch (Exception e) {
            log.warn("기상청 API 호출 실패: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public List<HourlyWeatherInfo> getHourlyForecast(Double lat, Double lng) {
        if (serviceKey == null || serviceKey.isBlank() || lat == null || lng == null) {
            return List.of();
        }
        try {
            int[] grid = latLngToGrid(lat, lng);

            int[] baseTimes = {2, 5, 8, 11, 14, 17, 20, 23};
            LocalDateTime now = LocalDateTime.now();
            int effectiveHour = (now.getMinute() >= 10) ? now.getHour() : now.getHour() - 1;

            int baseHour = 23;
            LocalDateTime baseDay = now;
            boolean found = false;
            for (int i = baseTimes.length - 1; i >= 0; i--) {
                if (effectiveHour >= baseTimes[i]) {
                    baseHour = baseTimes[i];
                    found = true;
                    break;
                }
            }
            if (!found) baseDay = now.minusDays(1);

            String baseDate = baseDay.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            String baseTime = String.format("%02d00", baseHour);

            KmaFcstApiResponse response = restClient.get()
                    .uri(b -> b
                            .scheme("https")
                            .host("apis.data.go.kr")
                            .path("/1360000/VilageFcstInfoService_2.0/getVilageFcst")
                            .queryParam("serviceKey", serviceKey)
                            .queryParam("numOfRows", 400)
                            .queryParam("pageNo", 1)
                            .queryParam("dataType", "JSON")
                            .queryParam("base_date", baseDate)
                            .queryParam("base_time", baseTime)
                            .queryParam("nx", grid[0])
                            .queryParam("ny", grid[1])
                            .build())
                    .retrieve()
                    .body(KmaFcstApiResponse.class);

            if (response == null || response.response() == null
                    || response.response().body() == null
                    || response.response().body().items() == null
                    || response.response().body().items().item() == null) {
                return List.of();
            }

            Map<String, Map<String, String>> byDateTime = new LinkedHashMap<>();
            for (KmaFcstItem item : response.response().body().items().item()) {
                String key = item.fcstDate() + item.fcstTime();
                byDateTime.computeIfAbsent(key, k -> new HashMap<>())
                          .put(item.category(), item.fcstValue());
            }

            String nowKey = now.format(DateTimeFormatter.ofPattern("yyyyMMddHH")) + "00";

            return byDateTime.entrySet().stream()
                    .filter(e -> e.getKey().compareTo(nowKey) >= 0)
                    .limit(24)
                    .map(entry -> {
                        String key  = entry.getKey();
                        Map<String, String> cats = entry.getValue();
                        int pty  = cats.containsKey("PTY") ? (int) Double.parseDouble(cats.get("PTY")) : 0;
                        double tmp = cats.containsKey("TMP") ? Double.parseDouble(cats.get("TMP")) : 0.0;
                        int sky  = cats.containsKey("SKY") ? (int) Double.parseDouble(cats.get("SKY")) : 1;
                        WeatherInfo info = pty != 0 ? buildWeatherInfo(pty, tmp) : buildSkyInfo(sky, tmp);
                        String displayTime = key.substring(8, 10) + ":" + key.substring(10, 12);
                        return new HourlyWeatherInfo(displayTime, info.condition(), info.icon(), info.temperature());
                    })
                    .collect(java.util.stream.Collectors.toList());

        } catch (Exception e) {
            log.warn("단기예보 API 호출 실패: {}", e.getMessage());
            return List.of();
        }
    }

    private WeatherInfo buildSkyInfo(int sky, double temperature) {
        return switch (sky) {
            case 3 -> new WeatherInfo(0, "구름많음", "cloudy", temperature, 0);
            case 4 -> new WeatherInfo(0, "흐림",    "cloudy", temperature, 0);
            default -> new WeatherInfo(0, "맑음",   "sunny",  temperature, 0);
        };
    }

    private WeatherInfo buildWeatherInfo(int pty, double temperature) {
        return switch (pty) {
            case 1 -> new WeatherInfo(pty, "비",        "rainy",  temperature, 10);
            case 2 -> new WeatherInfo(pty, "비/눈",     "sleet",  temperature, 15);
            case 3 -> new WeatherInfo(pty, "눈",        "snowy",  temperature, 15);
            case 4 -> new WeatherInfo(pty, "소나기",    "rainy",  temperature,  5);
            case 5 -> new WeatherInfo(pty, "빗방울",    "rainy",  temperature,  5);
            case 6 -> new WeatherInfo(pty, "빗방울눈날림", "sleet", temperature, 10);
            case 7 -> new WeatherInfo(pty, "눈날림",    "snowy",  temperature, 10);
            default -> new WeatherInfo(pty, "맑음",     "sunny",  temperature,  0);
        };
    }

    private int[] latLngToGrid(double lat, double lng) {
        double re    = RE / GRID;
        double slat1 = SLAT1 * DEGRAD;
        double slat2 = SLAT2 * DEGRAD;
        double olon  = OLON  * DEGRAD;
        double olat  = OLAT  * DEGRAD;

        double sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5)
                  / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
        sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);

        double sf = Math.pow(Math.tan(Math.PI * 0.25 + slat1 * 0.5), sn)
                  * Math.cos(slat1) / sn;
        double ro = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn);

        double ra    = re * sf / Math.pow(Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5), sn);
        double theta = lng * DEGRAD - olon;
        if (theta >  Math.PI) theta -= 2.0 * Math.PI;
        if (theta < -Math.PI) theta += 2.0 * Math.PI;
        theta *= sn;

        int nx = (int) Math.floor(ra * Math.sin(theta) + XO + 0.5);
        int ny = (int) Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
        return new int[]{nx, ny};
    }

    // ─── 기상청 API 응답 record types ──────────────────────────────────────────
    record KmaApiResponse(KmaApiResult response) {}
    record KmaApiResult(KmaHeader header, KmaApiBody body) {}
    record KmaHeader(String resultCode, String resultMsg) {}
    record KmaApiBody(KmaApiItems items) {}
    record KmaApiItems(List<KmaItem> item) {}
    record KmaItem(String category, String obsrValue) {}

    record KmaFcstApiResponse(KmaFcstApiResult response) {}
    record KmaFcstApiResult(KmaHeader header, KmaFcstApiBody body) {}
    record KmaFcstApiBody(KmaFcstApiItems items) {}
    record KmaFcstApiItems(List<KmaFcstItem> item) {}
    record KmaFcstItem(String category, String fcstDate, String fcstTime, String fcstValue) {}
}
