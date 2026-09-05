package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.util.List;

/**
 * RECALL_KEYWORD 한 행 — 도담이 대화 중에 슬쩍 여쭤볼 이야깃거리 하나.
 *
 * <p>이 표는 어르신이 만든 '기록'이 아니라 설정값이다. 그래서 CONTENT_MASTER에 얹지
 * 않았다. 다른 컨텐츠와 달리 보호자도 고칠 수 있어야 하고, 그 권한은 CONTENT_MASTER의
 * 소유권이 아니라 {@code linkService.canView}가 정한다.
 *
 * <p>{@link #userId}는 언제나 어르신(피보호인)이다. 보호자가 등록한 행도 마찬가지고,
 * 누가 등록했는지는 {@link #createdBy}에만 남는다. 이 둘을 섞으면 보호자 계정에 어르신의
 * 키워드가 달려 통계가 통째로 어긋난다.
 */
@Getter
@Setter
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecallDTO {
    /**
     * RECALL_KEYWORD.CATEGORY의 CHECK 제약과 값이 정확히 같아야 한다.
     *
     * <p>한국어 라벨은 담지 않는다. 프론트 {@code recallCategoryLabels}가 붙인다.
     */
    public enum Category {
        /** 가족 */
        FAMILY,
        /** 장소 */
        PLACE,
        /** 사건 */
        EVENT,
        /** 일상 */
        DAILY,
        /** 기타 */
        ETC;

        public static Category of(String value) {
            if (value == null || value.isBlank()) return ETC;
            try {
                return Category.valueOf(value.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ETC;
            }
        }
    }

    /**
     * RECALL_LOG.RESULT의 CHECK 제약과 값이 정확히 같아야 한다.
     *
     * <p>{@link #ASKED}는 결과가 아니라 아직 결과가 없다는 뜻이다. 물어봤는데 어르신이
     * 답하지 않고 화제를 옮긴 경우가 여기 남는다.
     *
     * <p>{@code of()}가 모르는 값에 ETC 같은 기본값을 주지 않고 null을 주는 것은 의도다
     * ({@link InquiryDTO.Status}와 같은 계약).
     */
    public enum Result {
        ASKED,
        HIT,
        MISS,
        UNCLEAR;

        public static Result of(String value) {
            if (value == null || value.isBlank()) return null;
            try {
                return Result.valueOf(value.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
    }

    private String id;

    /** 언제나 어르신. 쓰기는 세션과 canView로만 정한다 — 요청 파라미터를 그대로 믿지 않는다. */
    private String userId;

    private Category category;

    /** 여쭤볼 것. 예: "손녀 이름". 모델에게 주는 것은 <b>이것뿐</b>이다. */
    private String term;

    /**
     * 맞는 답. 예: "지민".
     */
    private String answer;

    private String hint;

    /** 등록한 사람. 어르신 본인일 수도, 연결된 보호자일 수도 있다. */
    private String createdBy;

    private Long lastAskedAt;
    private Long createdAt;
    private Long updatedAt;

    public static RecallDTO of(String id) {
        RecallDTO result = new RecallDTO();
        result.setId(id);
        return result;
    }

    /**
     * RECALL_LOG 한 행 — 검사 한 건.
     */
    @Getter
    @Setter
    @ToString
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class LogDTO {
        private String id;
        private String userId;
        private String keywordId;
        private String roomId;

        /** 도담이 여쭌 그 응답. UNIQUE라서 한 질문이 두 번 채점될 수 없다. */
        private String askMessageId;

        /** 채점한 어르신의 발화. 아직 답하지 않았으면 null. */
        private String answerMessageId;

        private Result result;
        private Long askedAt;
        private Long checkedAt;
    }

    /** 건강 리포트가 읽는 집계 한 벌. */
    @Getter
    @Setter
    @ToString
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class ReportDTO {
        /** WEEK | MONTH | QUARTER. 모르는 값은 서비스가 WEEK로 떨어뜨린다. */
        private String period;

        /** 창의 양 끝. YYYY-MM-DD. */
        private String from;
        private String to;

        /** 등록된 키워드 수. 0이면 화면이 "아직 없음"을 그린다 — 0회 실패와 다르다. */
        private Integer keywordCount;

        /** 채점이 끝난 검사 수. ASKED로 남은 것은 세지 않는다. */
        private Integer asked;
        private Integer hit;
        private Integer miss;
        private Integer unclear;

        /**
         * 회상 성공률(%). 분모(hit+miss)가 0이면 <b>null</b>이다.
         */
        private Integer rate;

        private List<BucketDTO> buckets;
    }

    /** 차트 막대 하나. 기간에 따라 하루·한 주·한 달 단위가 된다. */
    @Getter
    @Setter
    @ToString
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class BucketDTO {
        /** 축에 적을 글자. 기간마다 단위가 달라서 서버가 만든다. */
        private String label;

        /** 구간의 첫날. YYYY-MM-DD. */
        private String date;

        private Integer asked;
        private Integer hit;
        private Integer miss;

        /** 분모가 0이면 null. 화면은 이때 막대를 그리지 않는다. */
        private Integer rate;
    }

    /** 집계 조회 조건. */
    @Getter
    @Setter
    @ToString
    public static class QueryDTO {
        private String userId;
        private String from;
        private String to;
    }
}
