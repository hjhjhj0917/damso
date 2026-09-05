package hanium.damso.util;

import java.util.concurrent.ThreadLocalRandom;

/**
 * VARCHAR(100) 기본키 생성기.
 *
 * <p>USER_INFO를 뺀 모든 표의 PK가 {@code VARCHAR(100)}이고 AUTO_INCREMENT가 없다. 값을 만드는
 * 것은 애플리케이션의 몫이다.
 *
 * <p>모양은 {@code PREFIX-<시각을 base36 13자로>-<랜덤 8자리 hex>} 이다. 예: {@code MSG-000000MJ8QZ2R-9f3a1c04}
 *
 * <p><b>왜 맨 UUID가 아닌가.</b> 앞자리가 시각이라 문자열 정렬이 곧 시간 정렬이다. CHAT을
 * {@code ORDER BY SENT_AT, MESSAGE_ID}로 읽을 때 이것이 전순서를 만든다 — SENT_AT을 밀리초로
 * 올려 뒀지만(migration-content-fix.sql) 같은 밀리초에 두 행이 들어가는 경우까지 막지는 못한다.
 * 그때 순서가 뒤집히면 화면에는 봇이 질문보다 먼저 답한 것처럼 보인다.
 *
 * <p><b>왜 접두사가 붙는가.</b> CONTENT_ID, ROOM_ID, DIARY_ID, USER_ID가 전부 VARCHAR(100)이라
 * 타입 시스템이 서로 바꿔치기하는 실수를 못 막는다. 접두사가 있으면 그 실수가 "0건 조회"가 아니라
 * 눈에 보이는 행으로 드러난다.
 *
 * <p><b>왜 SecureRandom이 아닌가.</b> 이 값은 자격증명이 아니다. 접근 권한은 CONTENT_MASTER.USER_ID가
 * 정하지, ID를 못 맞힌다는 사실이 정하지 않는다. 뒤 8자리는 같은 밀리초 충돌을 흩는 용도일 뿐이다.
 * 나중에 누가 "보안 강화"로 SecureRandom을 넣지 않도록 여기 적어 둔다.
 */
public final class IdUtil {
    public static final String CONTENT = "CNT";
    public static final String CHAT_ROOM = "ROOM";
    public static final String MESSAGE = "MSG";
    public static final String DIARY = "DIA";
    public static final String SCHEDULE = "SCH";
    public static final String AUTOBIOGRAPHY = "AUT";
    public static final String COMMENT = "CMT";
    public static final String LINK = "LNK";
    public static final String TAG = "TAG";
    public static final String NOTICE = "NTC";
    public static final String INQUIRY = "INQ";
    public static final String KEYWORD = "KWD";
    public static final String RECALL = "RCL";

    /**
     * base36으로 적은 epoch millis의 자릿수. {@code Long.MAX_VALUE}가 13자리라 이 폭을 넘길 수
     * 없고, 0으로 채워 두면 자릿수가 늘어나는 순간에도 문자열 정렬이 깨지지 않는다.
     */
    private static final int TIME_LENGTH = 13;

    private IdUtil() {
    }

    public static String generate(String prefix) {
        return prefix + "-" + base36(System.currentTimeMillis())
                + "-" + String.format("%08x", ThreadLocalRandom.current().nextInt());
    }

    /** private이 아닌 이유: 0 채우기가 정렬의 전제라서 IdUtilTest가 직접 확인한다. */
    static String base36(long millis) {
        String value = Long.toString(millis, 36).toUpperCase();
        return "0".repeat(Math.max(0, TIME_LENGTH - value.length())) + value;
    }
}
