package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

import java.util.List;

/**
 * OpenAI chat-completions와 주고받는 몸통.
 *
 * <p><b>API 키는 여기 담기지 않는다.</b> {@link QueryDTO}는 로그에 통째로 찍히는 객체이고,
 * 키는 보내는 자리에서 헤더로 붙인다.
 */
public class LLMDTO {
    @Getter
    @ToString
    @AllArgsConstructor
    public static class MessageDTO {
        /** system / user / assistant */
        private String role;
        private String content;
    }

    @Getter
    @ToString
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class QueryDTO {
        private final String model;
        private final List<MessageDTO> messages;

        /**
         * 언제나 보내고 언제나 false다.
         *
         * <p>Boolean이 아니라 원시 boolean인 것이 요점이다 — {@code NON_NULL}이 지우지 못하게
         * 하려는 것이다. 이 멤버를 빼면 값은 서버 기본값이 되는데, 그 기본값이 언젠가 true로
         * 바뀌면 우리는 {@link ResponseDTO}가 읽을 수 없는 chunked 응답을 받는다. 그때 증상은
         * "모델이 답을 안 한다"로 보인다.
         */
        private final boolean stream;

        @JsonProperty("response_format")
        private final ResponseFormat responseFormat;

        public QueryDTO(String model, List<MessageDTO> messages, ResponseFormat responseFormat) {
            this.model = model;
            this.messages = messages;
            this.stream = false;
            this.responseFormat = responseFormat;
        }

        @Getter
        @ToString
        @AllArgsConstructor
        public static class ResponseFormat {
            public static final ResponseFormat JSON_OBJECT = new ResponseFormat("json_object");

            private String type;
        }
    }

    /**
     * 응답. 모르는 필드는 전부 무시한다.
     */
    @Getter
    @Setter
    @ToString
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ResponseDTO {
        private List<Choice> choices;

        /** Ollama 계열이 쓰는 모양. */
        private MessageValue message;

        /** 그 밖의 최후 수단. */
        private String response;

        /**
         * 어시스턴트가 실제로 쓴 글. 어느 모양으로도 못 읽으면 null.
         *
         * <p>null과 빈 문자열을 호출부가 구분하지 않아도 되도록 여기서 정리한다 —
         * "답을 못 받았다"는 한 가지 상황이지 두 가지가 아니다.
         */
        public String firstContent() {
            if (choices != null && !choices.isEmpty()) {
                Choice first = choices.get(0);
                if (first != null) {
                    if (first.getMessage() != null && first.getMessage().getContent() != null)
                        return first.getMessage().getContent();
                    if (first.getText() != null) return first.getText();
                }
            }
            if (message != null && message.getContent() != null) return message.getContent();

            return response;
        }

        @Getter
        @Setter
        @ToString
        @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Choice {
            private MessageValue message;

            /** 옛 completions 방언. */
            private String text;
        }

        @Getter
        @Setter
        @ToString
        @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class MessageValue {
            private String role;
            private String content;
        }
    }
}
