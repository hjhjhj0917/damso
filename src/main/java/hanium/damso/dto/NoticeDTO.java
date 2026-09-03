package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * NOTICE 한 행 — 운영팀이 쓰는 공지사항.
 */
@Getter
@Setter
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NoticeDTO {
    /**
     * NOTICE.CATEGORY의 CHECK 제약과 값이 정확히 같아야 한다.
     *
     * <p>한국어 라벨("점검 안내" 등)은 담지 않는다. 프론트 {@code noticeCategoryLabels}가 붙인다 —
     * 표시 문자열을 API에 실으면 그것을 다시 해석하는 코드가 양쪽에 생긴다.
     */
    public enum Category {
        MAINTENANCE,
        SAFETY,
        UPDATE,
        GENERAL;

        public static Category of(String value) {
            if (value == null || value.isBlank()) return GENERAL;
            try {
                return Category.valueOf(value.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return GENERAL;
            }
        }
    }

    private String id;
    private Category category;

    private String title;
    private String summary;
    private String content;

    /** 중요 표시. DB는 CHAR(1) 'Y'/'N'이고 매퍼가 참/거짓으로 바꿔 준다. */
    private Boolean important;

    /** 게시일 YYYY-MM-DD. "2026. 07. 03" 같은 표기는 화면이 만든다. */
    private String date;

    private Long createdAt;
    private Long updatedAt;

    public static NoticeDTO of(String id) {
        NoticeDTO result = new NoticeDTO();
        result.setId(id);
        return result;
    }
}
