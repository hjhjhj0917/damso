package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AutobiographyDTO {
    public enum Status {
        DRAFT,
        DONE;

        public static Status of(String value) {
            if (value == null || value.isBlank()) return DRAFT;
            try {
                return Status.valueOf(value.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return DRAFT;
            }
        }
    }

    private String id;
    private String contentId;
    private String userId;

    private String title;

    /**
     * 이 장이 다루는 시기. 날짜가 아니라 자유 문자열이다.
     *
     * <p>"1948 — 1966"도 되고 "손녀가 자주 찾아오던 무렵"도 된다.
     */
    private String period;

    private String summary;

    private String content;
    private Status status;

    private Long createdAt;
    private Long updatedAt;

    public static AutobiographyDTO of(String id) {
        AutobiographyDTO result = new AutobiographyDTO();
        result.setId(id);
        return result;
    }
}
