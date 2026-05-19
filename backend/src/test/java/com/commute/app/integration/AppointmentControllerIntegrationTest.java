package com.commute.app.integration;

import com.commute.app.domain.appointment.dto.AppointmentRequest;
import com.commute.app.integration.support.IntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AppointmentControllerIntegrationTest extends IntegrationTestSupport {

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = signupAndGetToken("appt@example.com", "password123");
    }

    private AppointmentRequest sampleAppointment() {
        return new AppointmentRequest(
                "서울시 종로구",
                37.57,
                126.97,
                LocalDateTime.now().plusDays(1),
                15
        );
    }

    @Test
    @DisplayName("약속 생성 성공")
    void createAppointment_success() throws Exception {
        mockMvc.perform(post("/api/appointments")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleAppointment())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.destAddress").value("서울시 종로구"))
                .andExpect(jsonPath("$.isDone").value(false));
    }

    @Test
    @DisplayName("과거 시간으로 약속 생성하면 400")
    void createAppointment_pastTime_returns400() throws Exception {
        AppointmentRequest pastAppointment = new AppointmentRequest(
                "서울시 종로구", 37.57, 126.97,
                LocalDateTime.now().minusDays(1), 15
        );

        mockMvc.perform(post("/api/appointments")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(pastAppointment)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("내 약속 목록 조회")
    void getAppointments_success() throws Exception {
        mockMvc.perform(post("/api/appointments")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleAppointment())))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/appointments")
                        .header("Authorization", bearerToken(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("약속 수정 성공")
    void updateAppointment_success() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/appointments")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleAppointment())))
                .andExpect(status().isOk())
                .andReturn();

        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        AppointmentRequest updated = new AppointmentRequest(
                "새 장소", 37.5, 127.0, LocalDateTime.now().plusDays(2), 30);

        mockMvc.perform(put("/api/appointments/" + id)
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.destAddress").value("새 장소"))
                .andExpect(jsonPath("$.alarmBeforeMinutes").value(30));
    }

    @Test
    @DisplayName("약속 완료 처리 성공")
    void markDone_success() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/appointments")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleAppointment())))
                .andExpect(status().isOk())
                .andReturn();

        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        mockMvc.perform(patch("/api/appointments/" + id + "/done")
                        .header("Authorization", bearerToken(token)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/appointments")
                        .header("Authorization", bearerToken(token)))
                .andExpect(jsonPath("$[0].isDone").value(true));
    }

    @Test
    @DisplayName("약속 삭제 성공")
    void deleteAppointment_success() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/appointments")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleAppointment())))
                .andExpect(status().isOk())
                .andReturn();

        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        mockMvc.perform(delete("/api/appointments/" + id)
                        .header("Authorization", bearerToken(token)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/appointments")
                        .header("Authorization", bearerToken(token)))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("다른 유저의 약속은 삭제할 수 없다")
    void deleteAppointment_otherUsersAppointment_throwsError() throws Exception {
        String otherToken = signupAndGetToken("other-appt@example.com", "password123");

        MvcResult createResult = mockMvc.perform(post("/api/appointments")
                        .header("Authorization", bearerToken(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sampleAppointment())))
                .andExpect(status().isOk())
                .andReturn();

        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .get("id").asLong();

        mockMvc.perform(delete("/api/appointments/" + id)
                        .header("Authorization", bearerToken(otherToken)))
                .andExpect(status().isBadRequest());
    }
}
