package hanium.damso.service.impl;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * 주민등록번호를 생년월일로 옮기는 환산을 지킨다.
 *
 * <p>이 환산이 틀리면 아무도 보호자 연결에 성공하지 못하는데, 화면에 보이는 것은
 * "일치하는 계정이 없습니다" 한 줄뿐이다. 원인을 가리키지 않는 실패라 여기서 붙잡는다.
 *
 * <p>DB에도 모델에도 닿지 않는다 — {@code birthDateOf}는 순수 함수다.
 */
class LinkServiceTest {
    @Test
    void 뒷자리_1과_2는_1900년대로_읽는다() {
        assertEquals("1948-03-12", LinkService.birthDateOf("480312", "2"));
        assertEquals("1948-03-12", LinkService.birthDateOf("480312", "1"));
    }

    @Test
    void 뒷자리_3과_4는_2000년대로_읽는다() {
        assertEquals("2005-11-30", LinkService.birthDateOf("051130", "3"));
        assertEquals("2005-11-30", LinkService.birthDateOf("051130", "4"));
    }

    @Test
    void 형식이_아니면_조회를_보내지_않는다() {
        assertNull(LinkService.birthDateOf("48031", "2"));
        assertNull(LinkService.birthDateOf("4803123", "2"));
        assertNull(LinkService.birthDateOf("48031a", "2"));
        assertNull(LinkService.birthDateOf("480312", "5"));
        assertNull(LinkService.birthDateOf("480312", "0"));
        assertNull(LinkService.birthDateOf(null, "2"));
        assertNull(LinkService.birthDateOf("480312", null));
    }

    @Test
    void 있을_수_없는_달과_날은_거른다() {
        // 형식만 맞는 480099는 어떤 계정과도 일치할 수 없다. 조회를 보내기 전에 자른다.
        assertNull(LinkService.birthDateOf("480099", "2"));
        assertNull(LinkService.birthDateOf("481301", "2"));
        assertNull(LinkService.birthDateOf("480132", "2"));
    }

    @Test
    void 한자리_달과_날의_0이_보존된다() {
        // "1948-3-2"로 만들면 USER_INFO.BIRTH_DATE의 'YYYY-MM-DD'와 문자열 비교가 어긋난다.
        assertEquals("1948-03-02", LinkService.birthDateOf("480302", "2"));
    }
}
