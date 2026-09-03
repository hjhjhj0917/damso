package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * USER_LINK 한 행 — 보호자와 피보호인을 잇는다.
 *
 * <p>화면 하나가 아니라 권한을 정하는 표다. 보호자가 누구의 데일리노트를 읽을 수 있는지,
 * 일기 댓글을 누가 쓸 수 있는지가 전부 여기 행의 존재 여부로 갈린다.
 *
 * <p>{@code /api/link/verify}는 이 DTO를 쓰되 {@link #wardId}를 <b>비워서</b> 돌려준다.
 * {@code NON_NULL}이라 안 채운 필드는 JSON에 아예 나가지 않는다.
 */
@Getter
@Setter
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class LinkDTO {
    private String id;

    private String guardianId;
    private String guardianName;

    private String wardId;
    private String wardName;
    private String wardPhone;

    private String relation;
    private Long consentAt;
    private Long createdAt;

    /**
     * 피보호인 대조 조건.
     *
     * <p>주민등록번호는 <b>담기지도 저장되지도 않는다.</b> 컨트롤러가 앞 6자리와 뒷자리 첫 숫자를
     * 받아 {@code YYYY-MM-DD}로 환산한 뒤 그 결과만 여기에 넣는다.
     */
    @Getter
    @Setter
    @ToString
    public static class QueryDTO {
        private String name;
        private String phone;
        private String birthDate;
    }
}
