package hanium.damso.service.impl;

import hanium.damso.dto.SpeechDTO;
import hanium.damso.service.ServiceUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.HttpClientErrorException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 음성 서버로 실제로 나가는 요청의 모양과, "안 켠 것"과 "고장 난 것"의 경계를 지킨다.
 *
 * <p>{@code LLMServiceTest}와 같은 방식이다 — 네트워크에도 음성 서버에도 닿지 않는다.
 * {@code optional}과 {@code refused}는 순수 함수이고, 나머지는 직렬화 결과만 본다.
 */
class SpeechServiceTest {
    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private static SpeechDTO.QueryDTO query(String model, String voice) {
        return new SpeechDTO.QueryDTO(model, "안녕하세요", voice, SpeechService.SPEECH_FORMAT, 1.0);
    }

    @Test
    void 설정되지_않은_URL은_요청을_보내기_전에_막는다() {
        // LLMService.configured를 그대로 쓴다. 같은 규칙을 두 번 구현하지 않는다.
        assertThrows(ServiceUnavailableException.class, () -> LLMService.configured(null, "STT_URL"));
        assertThrows(ServiceUnavailableException.class, () -> LLMService.configured("  ", "TTS_URL"));
    }

    @Test
    void 빈_값은_멤버를_아예_빼기_위해_null이_된다() {
        // 이름 자리의 빈 문자열은 "지정하지 않음"이 아니라 "어느 것과도 맞지 않는 이름"이고,
        // 서버는 그것을 400으로 답한다.
        assertNull(SpeechService.optional(null));
        assertNull(SpeechService.optional(""));
        assertNull(SpeechService.optional("   "));
        // 콘솔에서 복사한 키에는 개행이 붙어 온다.
        assertEquals("sk-abc", SpeechService.optional(" sk-abc\n"));
    }

    @Test
    void 합성은_언제나_wav를_부탁한다() {
        // 컨트롤러가 audio/wav라고 선언하고 있다. 기본값인 mp3가 오면 그 선언이 거짓말이 된다.
        JsonNode body = MAPPER.readTree(MAPPER.writeValueAsString(query("gpt-4o-mini-tts", "alloy")));

        assertEquals("wav", body.path("response_format").asString(), body.toString());
        assertEquals("안녕하세요", body.path("input").asString(), body.toString());
        assertEquals("alloy", body.path("voice").asString(), body.toString());
        assertEquals("gpt-4o-mini-tts", body.path("model").asString(), body.toString());
    }

    @Test
    void 모델과_음성을_설정하지_않은_서버에는_그_멤버를_보내지_않는다() {
        // 모델 하나만 서비스하며 이름을 요구하지 않는 자체 호스팅 서버가 있다. 빈 문자열을
        // 보내면 그런 서버도 400으로 답한다.
        JsonNode body = MAPPER.readTree(MAPPER.writeValueAsString(
                query(SpeechService.optional(""), SpeechService.optional(null))));

        assertFalse(body.has("model"), body.toString());
        assertFalse(body.has("voice"), body.toString());
    }

    @Test
    void 속도는_언제나_실려_나간다() {
        // 원시 double이라 NON_NULL이 지우지 못한다. 빠지면 운영자가 정한 속도가 조용히 무시되고
        // 서버 기본값으로 읽힌다.
        JsonNode body = MAPPER.readTree(MAPPER.writeValueAsString(
                new SpeechDTO.QueryDTO(null, "안녕하세요", null, SpeechService.SPEECH_FORMAT, 0.9)));

        assertTrue(body.has("speed"), body.toString());
        assertEquals(0.9, body.path("speed").asDouble(), body.toString());
    }

    @Test
    void 읽어_줄_글은_로그에_남지만_키는_담기지_않는다() {
        // QueryDTO는 toString으로 로그에 찍히는 객체다. 키가 여기 들어오면 그대로 새어 나간다.
        String printed = query("gpt-4o-mini-tts", "alloy").toString();

        assertFalse(printed.contains("key"), printed);
        assertFalse(printed.contains("Bearer"), printed);
    }

    @Test
    void 키가_거절당하면_안_켠_것과_같은_칸으로_간다() {
        // 401/403은 요청이 아니라 배포의 문제다. 사용자가 다시 눌러서 될 일이 아니라서,
        // 설정하지 않은 것과 같은 답을 준다.
        assertInstanceOf(ServiceUnavailableException.class,
                SpeechService.refused(HttpClientErrorException.create(
                        org.springframework.http.HttpStatus.UNAUTHORIZED, "", null, null, null), "STT_URL"));
        assertInstanceOf(ServiceUnavailableException.class,
                SpeechService.refused(HttpClientErrorException.create(
                        org.springframework.http.HttpStatus.FORBIDDEN, "", null, null, null), "TTS_URL"));
    }

    @Test
    void 그_밖의_실패는_재시도할_수_있는_실패로_남는다() {
        // 429는 "나중에"라는 뜻이고, 400은 우리가 보낸 것이 틀렸다는 뜻이다. 둘 다 "꺼져 있다"로
        // 읽히면 안 된다.
        HttpClientErrorException tooMany = HttpClientErrorException.create(
                org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "", null, null, null);
        assertSame(tooMany, SpeechService.refused(tooMany, "STT_URL"));

        HttpClientErrorException badRequest = HttpClientErrorException.create(
                org.springframework.http.HttpStatus.BAD_REQUEST, "", null, null, null);
        assertSame(badRequest, SpeechService.refused(badRequest, "TTS_URL"));
    }

    @Test
    void 상한은_요금이_나가기_전에_거절할_수_있는_크기다() {
        // 화면의 레코더는 60초에서 멈추고 16kHz 16bit 모노 기준 그것은 약 1.9MB다.
        // 상한은 그 화면이 아니라 그 밖의 호출자를 위한 것이고, multipart 한도(10MB)보다 낮아야
        // 바깥 API를 부르지도 청구되지도 않는다.
        assertTrue(SpeechService.MAX_AUDIO_BYTES < 10 * 1024 * 1024);
        assertTrue(SpeechService.MAX_AUDIO_BYTES > 60 * 16000 * 2);
        // 도담의 한 마디는 길어야 수백 자다.
        assertTrue(SpeechService.MAX_SPEECH_CHARS >= 1_000);
    }
}
