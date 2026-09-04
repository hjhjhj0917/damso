package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * CONTENT_MASTER 한 행.
 *
 * <p>일기, 일정, 자서전, 대화방이 전부 이 표에 얹힌다. <b>소유자와 삭제 여부를 가진 곳은 여기뿐이고,</b>
 * 자식 표에는 USER_ID도 IS_DELETED도 없다. 그래서 자식을 읽는 모든 질의가 이 표를 조인해서
 * 걸러야 한다 — 빠뜨리면 남의 글이나 지운 글이 조회된다.
 */
@Getter
@Setter
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ContentDTO {
    /**
     * CONTENT_MASTER.CONTENT_TYPE의 CHECK 제약과 값이 정확히 같아야 한다.
     *
     * <p>DB에만 있고 여기 없는 값이 하나라도 생기면 그 행을 읽는 순간 MyBatis 열거형 핸들러 안에서
     * 터진다 — 컬럼에서가 아니라. {@link UserDTO.Role}과 같은 계약이다. 종류를 늘릴 때는
     * 이 열거형과 CHECK 제약을 반드시 함께 고친다.
     */
    public enum Type {
        CHAT_ROOM,
        DIARY,
        SCHEDULE,
        AUTOBIOGRAPHY
    }

    private String contentId;
    private String userId;
    private Type contentType;
    private Long createdAt;
    private Long updatedAt;

    public static ContentDTO of(String contentId) {
        ContentDTO result = new ContentDTO();
        result.setContentId(contentId);
        return result;
    }
}
