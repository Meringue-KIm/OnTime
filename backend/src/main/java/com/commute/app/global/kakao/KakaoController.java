package com.commute.app.global.kakao;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/kakao")
@RequiredArgsConstructor
public class KakaoController {

    private final KakaoMapService kakaoMapService;

    @GetMapping("/geocode")
    public ResponseEntity<Map<String, Double>> geocode(@RequestParam String address) {
        return kakaoMapService.geocode(address)
                .map(c -> ResponseEntity.ok(Map.of("lat", c.lat(), "lng", c.lng())))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/directions")
    public ResponseEntity<Map<String, Integer>> directions(
            @RequestParam Double originLat, @RequestParam Double originLng,
            @RequestParam Double destLat,   @RequestParam Double destLng) {
        return kakaoMapService.getDrivingMinutes(originLat, originLng, destLat, destLng)
                .map(minutes -> ResponseEntity.ok(Map.of("durationMinutes", minutes)))
                .orElse(ResponseEntity.notFound().build());
    }
}
