package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;

/**
 * 음성 서버와 주고받는 몸통.
 *
 * <p>{@link LLMDTO}와 같은 자리의 물건이고 같은 규칙을 따른다. <b>API 키는 여기 담기지 않는다.</b>
 * 이 객체들은 로그에 통째로 찍히고, 키는 보내는 자리에서 헤더로 붙인다.
 *
 * <p><b>전사(STT) 요청 DTO는 없다.</b> 없는 것이 아니라 있을 수 없다 — OpenAI 방언의 전사는
 * multipart 업로드라서 JSON 몸통이 아니고({@code file}, {@code model}, {@code language} …
 * 전부 폼 필드다), {@code response_format=text}로 부탁하므로 응답도 봉투 없는 평문이다.
 * 그래서 여기 있는 것은 합성(TTS) 쪽뿐이다.
 */
public class SpeechDTO {
    /**
     * OpenAI 방언 {@code /v1/audio/speech} 한 번.
     *
     * <p>이 한 가지 모양을 OpenAI, openedai-speech, Kokoro-FastAPI, Speaches가 모두 읽는다.
     * 응답은 base64가 아니라 오디오 파일 그 자체라서, 짝이 되는 응답 DTO가 없다.
     */
    @Getter
    @ToString
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class QueryDTO {
        /** 비면 멤버를 아예 뺀다. 모델 하나만 서비스하며 이름을 요구하지 않는 서버가 있다. */
        private final String model;

        /** 읽을 글. OpenAI는 input, 구글은 input.text라고 부르는 같은 것. */
        private final String input;

        /** 비면 멤버를 뺀다. 빈 문자열은 "아무 지정 없음"이 아니라 "어느 음성과도 맞지 않는 이름"이다. */
        private final String voice;

        /**
         * 언제나 "wav".
         *
         * <p>컨트롤러의 {@code produces = "audio/wav"}와 한 몸이라 하나만 옮길 수 없다.
         * 이 값을 빼면 서버 기본값인 mp3가 오고, 그러면 우리가 선언한 콘텐츠 타입이 거짓말이 된다.
         */
        @JsonProperty("response_format")
        private final String responseFormat;

        /**
         * 말하는 속도. 1.0이 그 음성의 제 속도다.
         *
         * <p>{@link LLMDTO.QueryDTO}의 stream과 같은 이유로 Double이 아니라 원시
         * double이다 — {@code NON_NULL}이 지우지 못하게 하려는 것이다. 빠지면 값이 서버 기본값이
         * 되고, 운영자가 설정한 속도가 조용히 무시된다.
         */
        private final double speed;
    }

    /**
     * 음성 기능이 켜져 있는가. 화면이 마이크·스피커 버튼을 미리 감추는 용도다.
     *
     * <p>둘을 따로 답하는 이유: STT만 켠 배포와 TTS만 켠 배포가 둘 다 말이 된다. 하나로 합치면
     * 한쪽만 켠 배포에서 멀쩡한 기능이 화면에서 사라지거나, 없는 기능의 버튼이 남는다.
     */
    @Getter
    @ToString
    @AllArgsConstructor
    public static class StatusDTO {
        private final boolean stt;
        private final boolean tts;
    }
}
