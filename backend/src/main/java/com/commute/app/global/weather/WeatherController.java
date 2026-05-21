package com.commute.app.global.weather;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/weather")
@RequiredArgsConstructor
public class WeatherController {

    private final WeatherService weatherService;

    @GetMapping("/hourly")
    public ResponseEntity<List<WeatherService.HourlyWeatherInfo>> getHourlyWeather(
            @RequestParam Double lat,
            @RequestParam Double lng) {
        return ResponseEntity.ok(weatherService.getHourlyForecast(lat, lng));
    }

    @GetMapping("/summary")
    public ResponseEntity<WeatherService.WeatherSummary> getWeatherSummary(
            @RequestParam Double lat,
            @RequestParam Double lng) {
        return ResponseEntity.ok(weatherService.getWeatherSummary(lat, lng));
    }
}
