package com.commute.app.integration;

import com.commute.app.domain.route.dto.RouteRequest;
import com.commute.app.integration.support.IntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RouteControllerIntegrationTest extends IntegrationTestSupport {

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = signupAndGetToken("route@example.com", "password123");
    }

    private RouteRequest sampleRoute() {
        return new RouteRequest("서울시 강남구", 37.495, 127.028,
                "서울시 중구", 37.563, 126.997,
                LocalTime.of(9, 0), 10, null, null);
    }

    @Test
    @DisplayName("루트 생성 성공")
    void createRoute_success() throws Exception {
        mockMvc.perform(post("/api/routes")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRoute())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.homeAddress").value("서울시 강남구"))
                .andExpect(jsonPath("$.workAddress").value("서울시 중구"))
                .andExpect(jsonPath("$.isActive").value(true));
    }

    @Test
    @DisplayName("토큰 없이 루트 생성하면 403")
    void createRoute_withoutToken_returns403() throws Exception {
        mockMvc.perform(post("/api/routes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRoute())))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("필수 필드 누락 시 400")
    void createRoute_missingRequiredField_returns400() throws Exception {
        mockMvc.perform(post("/api/routes")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"homeAddress\":\"\",\"workAddress\":\"회사\",\"arrivalTime\":\"09:00\",\"alarmBeforeMinutes\":10}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("내 루트 목록 조회")
    void getMyRoutes_success() throws Exception {
        mockMvc.perform(post("/api/routes")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRoute())))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/routes")
                        .header("Authorization", bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("루트 수정 성공")
    void updateRoute_success() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/routes")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRoute())))
                .andExpect(status().isOk())
                .andReturn();

        Long routeId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        RouteRequest updatedRoute = new RouteRequest("새 집 주소", 37.5, 127.0,
                "새 회사 주소", 37.6, 127.1, LocalTime.of(8, 30), 15, null, null);

        mockMvc.perform(put("/api/routes/" + routeId)
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedRoute)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.homeAddress").value("새 집 주소"))
                .andExpect(jsonPath("$.alarmBeforeMinutes").value(15));
    }

    @Test
    @DisplayName("루트 삭제(비활성화) 성공")
    void deleteRoute_success() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/routes")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRoute())))
                .andExpect(status().isOk())
                .andReturn();

        Long routeId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        mockMvc.perform(delete("/api/routes/" + routeId)
                        .header("Authorization", bearerToken(token)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/routes")
                        .header("Authorization", bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].isActive").value(false));
    }

    @Test
    @DisplayName("다른 유저의 루트는 수정할 수 없다")
    void updateRoute_otherUsersRoute_throwsError() throws Exception {
        String otherToken = signupAndGetToken("other@example.com", "password123");

        MvcResult createResult = mockMvc.perform(post("/api/routes")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRoute())))
                .andExpect(status().isOk())
                .andReturn();

        Long routeId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        mockMvc.perform(put("/api/routes/" + routeId)
                        .header("Authorization", bearerToken(otherToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleRoute())))
                .andExpect(status().isBadRequest());
    }
}
