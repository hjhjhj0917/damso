package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * INQUIRY 한 행 — 고객센터의 1:1 문의.
 *
 * <p>공지({@link NoticeDTO})와 달리 주인이 있다. 목록도 상세도 본인 것만 열리고, 연결된 보호자에게도
 * 열리지 않는다 — 결제나 개인정보 문의가 이 자리로 온다.
 */
@Getter
@Setter
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class InquiryDTO {
    /**
     * INQUIRY.CATEGORY의 CHECK 제약과 값이 정확히 같아야 한다.
     *
     * <p>한국어 라벨("서비스 이용" 등)은 담지 않는다. 프론트 {@code inquiryCategoryLabels}가 붙인다.
     */
    public enum Category {
        /** 서비스 이용 */
        SERVICE,
        /** 계정·피보호인 연동 */
        ACCOUNT,
        /** AI 대화·기록 */
        RECORD,
        /** 건강 리포트 */
        HEALTH,
        /** 병원 예약 */
        HOSPITAL,
        /** 개인정보 */
        PRIVACY,
        /** 결제·환불 */
        PAYMENT,
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
     * INQUIRY.STATUS의 CHECK 제약과 값이 정확히 같아야 한다.
     *
     * <p>화면의 배지는 이 값만 보고 그린다. 답변을 채우면서 상태를 올리지 않으면 답이 달린 채
     * "접수완료"로 남으므로, 답변 경로가 둘을 함께 바꾼다.
     */
    public enum Status {
        /** 접수완료 */
        RECEIVED,
        /** 답변중 */
        ANSWERING,
        /** 답변완료 */
        ANSWERED;

        public static Status of(String value) {
            if (value == null || value.isBlank()) return null;
            try {
                return Status.valueOf(value.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
    }

    private String id;

    /** 작성자. 조회 전용 — 쓰기는 세션에서 온 값으로만 한다. */
    private String userId;

    private Category category;
    private String title;
    private String content;
    private Status status;

    /** 운영자 답변. 아직 없으면 필드 자체가 응답에서 빠진다. */
    private String answer;

    /**
     * 답변한 운영자. 응답에는 실리지 않는다 — 매퍼의 조회 컬럼에 없다.
     * 답변을 쓸 때 INSERT 파라미터로만 쓰인다.
     */
    private String answeredBy;

    private Long answeredAt;

    /** 접수일 YYYY-MM-DD. "2026. 07. 01" 같은 표기는 화면이 만든다. */
    private String date;

    private Long createdAt;
    private Long updatedAt;

    public static InquiryDTO of(String id) {
        InquiryDTO result = new InquiryDTO();
        result.setId(id);
        return result;
    }
}
