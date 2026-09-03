package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * CHAT_ROOM 한 행 — 도담과의 대화방 하나.
 *
 * <p>프론트 {@code ChatView}가 localStorage({@code ansimChatThreads})에 들고 있던 스레드가 이것이다.
 *
 * <p><b>대화는 연결된 보호자에게도 열지 않는다.</b> 프론트가 화면에 적어 둔 약속이 근거다 —
 * "대화 내용은 안전하게 보호되며, 데일리노트 작성에만 사용됩니다." 보호자가 보는 것은
 * 어르신이 노트로 남기기로 한 것뿐이어야 한다.
 */
@Getter
@Setter
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ChatDTO {
    private String id;
    private String contentId;
    private String userId;
    private String title;

    /** 목록 화면이 미리보기로 쓴다. 방마다 메시지를 따로 부르지 않게 하려는 것. */
    private String lastMessage;

    private Integer messageCount;
    private Long createdAt;
    private Long updatedAt;

    public static ChatDTO of(String id) {
        ChatDTO result = new ChatDTO();
        result.setId(id);
        return result;
    }

    /** CHAT 한 행. */
    @Getter
    @Setter
    @ToString
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class MessageDTO {
        /**
         * CHAT.SENDER_TYPE의 CHECK 제약과 값이 정확히 같아야 한다.
         *
         * <p>프론트는 {@code 'user' | 'ai'}로 쓰지만 DB 제약이 USER/BOT이다. 프론트 쪽을 고친다 —
         * 이미 만들어져 있는 제약을 화면 어휘에 맞추려고 마이그레이션할 이유가 없다.
         */
        public enum SenderType {
            USER,
            BOT
        }

        private String id;
        private String roomId;
        private SenderType senderType;
        private String message;
        private Long sentAt;
    }

    /**
     * 한 번 주고받은 것.
     *
     * <p>{@code reply}가 null일 수 있다. 모델이 답하지 못해도 {@code sent}는 반드시 채워서
     * 돌려준다 — 어르신이 친 말이 모델 사정으로 사라지면 안 된다.
     */
    @Getter
    @ToString
    @AllArgsConstructor
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class TurnDTO {
        private MessageDTO sent;
        private MessageDTO reply;
    }
}
