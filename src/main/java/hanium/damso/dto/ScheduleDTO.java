package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * SCHEDULE 한 행. 프론트의 {@code ScheduleEvent}에 대응한다.
 *
 * <p>DB는 {@code SCHEDULE_TIME} 하나의 DATETIME으로 갖고 있지만 여기서는 {@link #date}와
 * {@link #time}으로 나눠 준다. 프론트의 등록 폼이 {@code <input type="date">}와
 * {@code <input type="time">} 두 개이고, 캘린더가 날짜만으로 묶어 그리기 때문이다.
 * 합치고 나누는 일은 매퍼 XML이 한다.
 *
 * <p>{@link #time}은 24시간제 {@code HH:mm}로만 오간다. "오후 3:30" 같은 한국어 표기는 화면의
 * 몫이다 — 프론트에 이미 {@code toKoreanTimeLabel}이 있다. 표시 문자열을 API에 실으면 그것을
 * 다시 파싱하는 코드가 양쪽에 생긴다.
 */
@Getter
@Setter
@ToString
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ScheduleDTO {
    /**
     * SCHEDULE.SCHEDULE_TYPE의 CHECK 제약과 값이 정확히 같아야 한다.
     *
     * <p>프론트 {@code ScheduleEvent.type}은 소문자({@code 'hospital'})라서 {@link #of}가
     * 대문자로 올린다. 화면이 아이콘과 알림 문구를 이 값으로 고르므로(scheduleReminderMessage),
     * 모르는 값 하나가 들어오면 그 화면이 조용히 잘못 그려진다. 그래서 DB에도 CHECK가 있다.
     */
    public enum Type {
        HOSPITAL,
        MEDICATION,
        TREATMENT,
        DAILY,
        PERSONAL;

        /** 프론트가 직접 등록한 일정은 personal이다. 못 알아들은 값도 그쪽으로 보낸다. */
        public static Type of(String value) {
            if (value == null || value.isBlank()) return PERSONAL;
            try {
                return Type.valueOf(value.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return PERSONAL;
            }
        }
    }

    /** 한국어 라벨(예정/완료)은 프론트가 붙인다. 한글은 자바 열거형 상수 이름이 될 수 없다. */
    public enum Status {
        SCHEDULED,
        DONE;

        public static Status of(String value) {
            if (value == null || value.isBlank()) return SCHEDULED;
            try {
                return Status.valueOf(value.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return SCHEDULED;
            }
        }
    }

    private String id;
    private String contentId;
    private String userId;

    private String title;
    private Type scheduleType;

    /** YYYY-MM-DD */
    private String date;

    /** HH:mm (24시간제) */
    private String time;

    private String content;
    private String location;
    private Status status;

    private Long createdAt;
    private Long updatedAt;

    public static ScheduleDTO of(String id) {
        ScheduleDTO result = new ScheduleDTO();
        result.setId(id);
        return result;
    }
}
