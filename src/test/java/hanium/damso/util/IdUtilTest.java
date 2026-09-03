package hanium.damso.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * ID가 시간순으로 정렬되는지 지킨다.
 *
 * <p>이것이 깨지면 CHAT 조회의 {@code ORDER BY SENT_AT, MESSAGE_ID}가 전순서를 잃고, 같은 밀리초에
 * 들어간 발화와 응답의 순서가 뒤집힌다. 화면에는 도담이 질문보다 먼저 답한 것처럼 보인다 —
 * 에러가 아니라 잘못된 순서로 나타나는 종류의 고장이라 테스트가 없으면 오래 안 보인다.
 */
class IdUtilTest {
    @Test
    void 앞자리가_시간순이면_문자열_정렬도_시간순이다() {
        String earlier = IdUtil.base36(1_700_000_000_000L);
        String later = IdUtil.base36(1_700_000_000_001L);

        assertTrue(earlier.compareTo(later) < 0, earlier + " vs " + later);
    }

    @Test
    void 자릿수가_늘어도_0으로_채워_정렬이_깨지지_않는다() {
        // 0으로 채우지 않으면 짧은 문자열이 사전순으로 뒤에 올 수 있다.
        String small = IdUtil.base36(1L);
        String big = IdUtil.base36(1_700_000_000_000L);

        assertEquals(small.length(), big.length(), small + " / " + big);
        assertTrue(small.compareTo(big) < 0, small + " vs " + big);
    }

    @Test
    void 접두사가_붙어_어느_표의_키인지_행에_드러난다() {
        assertTrue(IdUtil.generate(IdUtil.DIARY).startsWith("DIA-"));
        assertTrue(IdUtil.generate(IdUtil.MESSAGE).startsWith("MSG-"));
    }

    @Test
    void 같은_밀리초에_두_번_불러도_값이_갈린다() {
        // 뒤 8자리 랜덤이 하는 일이 이것 하나다.
        assertNotEquals(IdUtil.generate(IdUtil.MESSAGE), IdUtil.generate(IdUtil.MESSAGE));
    }

    @Test
    void VARCHAR_100_에_넉넉히_들어간다() {
        assertTrue(IdUtil.generate(IdUtil.AUTOBIOGRAPHY).length() <= 100);
    }
}
