package hanium.damso.service.impl;

import hanium.damso.dto.LLMDTO;
import hanium.damso.service.ServiceUnavailableException;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * "아직 안 켰다"와 "고장 났다"의 경계, 그리고 실제로 나가는 요청의 모양을 지킨다.
 *
 * <p>모델에도 네트워크에도 닿지 않는다. {@code configured}와 {@code responseFormat}은 순수 함수이고,
 * 나머지는 직렬화 결과만 본다.
 */
class LLMServiceTest {
    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    @Test
    void 설정되지_않은_값은_요청을_보내기_전에_막는다() {
        assertThrows(ServiceUnavailableException.class, () -> LLMService.configured(null, "LLM_URL"));
        assertThrows(ServiceUnavailableException.class, () -> LLMService.configured("", "LLM_URL"));
        assertThrows(ServiceUnavailableException.class, () -> LLMService.configured("   ", "LLM_URL"));
    }

    @Test
    void 설정된_값은_그대로_통과한다() {
        assertEquals("https://api.openai.com/v1/chat/completions",
                LLMService.configured("https://api.openai.com/v1/chat/completions", "LLM_URL"));
    }

    @Test
    void 포맷이_비면_response_format을_아예_보내지_않는다() {
        // 그 멤버를 구현하지 않은 서버는 무시가 아니라 400으로 답한다.
        assertNull(LLMService.responseFormat(null));
        assertNull(LLMService.responseFormat(""));
        assertNull(LLMService.responseFormat("  "));
    }

    @Test
    void 못_알아들은_포맷도_json_object로_요청한다() {
        // 여기까지 온 호출자는 JSON을 원한 것이 분명하다. 오타 하나 때문에 산문을 받는 것보다 낫다.
        assertNotNull(LLMService.responseFormat("jsno"));
        assertEquals("json_object", LLMService.responseFormat("json").getType());
    }

    @Test
    void stream은_언제나_실려_나가고_언제나_false다() {
        // 원시 boolean이라 NON_NULL이 지우지 못한다. 빠지면 값이 서버 기본값이 되고,
        // 그 기본값이 true로 바뀌면 우리는 읽을 수 없는 chunked 응답을 받는다.
        LLMDTO.QueryDTO query = new LLMDTO.QueryDTO(
                "gpt-4o-mini", List.of(new LLMDTO.MessageDTO("user", "안녕")), null);

        JsonNode body = MAPPER.readTree(MAPPER.writeValueAsString(query));

        assertTrue(body.has("stream"), body.toString());
        assertFalse(body.get("stream").asBoolean(), body.toString());
        assertFalse(body.has("response_format"), body.toString());
    }

    @Test
    void 포맷을_주면_response_format이_스네이크_케이스로_나간다() {
        LLMDTO.QueryDTO query = new LLMDTO.QueryDTO(
                "gpt-4o-mini", List.of(new LLMDTO.MessageDTO("user", "안녕")),
                LLMDTO.QueryDTO.ResponseFormat.JSON_OBJECT);

        JsonNode body = MAPPER.readTree(MAPPER.writeValueAsString(query));

        assertEquals("json_object", body.path("response_format").path("type").asString(), body.toString());
    }

    @Test
    void 응답은_OpenAI_모양을_먼저_읽는다() {
        LLMDTO.ResponseDTO response = MAPPER.readValue(
                "{\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"안녕하세요\"}}]}",
                LLMDTO.ResponseDTO.class);

        assertEquals("안녕하세요", response.firstContent());
    }

    @Test
    void 모르는_필드가_섞여_와도_읽는다() {
        // 제공자마다 붙여 보내는 메타데이터가 다르다. 그중 하나 때문에 멀쩡한 답을 버리면 안 된다.
        LLMDTO.ResponseDTO response = MAPPER.readValue(
                "{\"id\":\"x\",\"usage\":{\"total_tokens\":1},"
                        + "\"choices\":[{\"index\":0,\"finish_reason\":\"stop\","
                        + "\"message\":{\"content\":\"안녕하세요\"}}]}",
                LLMDTO.ResponseDTO.class);

        assertEquals("안녕하세요", response.firstContent());
    }

    @Test
    void 다른_방언도_읽는다() {
        LLMDTO.ResponseDTO ollama = MAPPER.readValue(
                "{\"message\":{\"content\":\"안녕\"}}", LLMDTO.ResponseDTO.class);
        assertEquals("안녕", ollama.firstContent());

        LLMDTO.ResponseDTO plain = MAPPER.readValue(
                "{\"response\":\"안녕\"}", LLMDTO.ResponseDTO.class);
        assertEquals("안녕", plain.firstContent());
    }

    @Test
    void 아는_모양이_하나도_없으면_null이다() {
        LLMDTO.ResponseDTO response = MAPPER.readValue("{\"unexpected\":1}", LLMDTO.ResponseDTO.class);

        assertNull(response.firstContent());
    }
}
