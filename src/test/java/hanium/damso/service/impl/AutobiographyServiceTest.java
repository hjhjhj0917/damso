package hanium.damso.service.impl;

import hanium.damso.dto.AutobiographyDTO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 모델이 실제로 돌려주는 망가진 답들을 상대로 파서를 지킨다.
 *
 * <p>{@code response_format}으로 JSON을 요청해도 모델은 코드 펜스에 싸거나, 인사말을 앞에 붙이거나,
 * 필드를 빠뜨린다. 여기 있는 사례는 전부 실제로 일어나는 것들이다.
 *
 * <p>DB에도 모델에도 닿지 않는다. {@code parse}는 static이라 서비스 인스턴스조차 필요 없다 —
 * 협력자에 닿지 않는다는 사실이 시그니처에 적혀 있는 셈이다.
 */
class AutobiographyServiceTest {
    @Test
    void 평범한_답을_읽는다() {
        AutobiographyDTO result = AutobiographyService.parse("""
                {"title":"바닷바람 속에서","period":"1948 — 1966","summary":"유년 시절.","content":"나는 바닷가에서 자랐다."}
                """);

        assertNotNull(result);
        assertEquals("바닷바람 속에서", result.getTitle());
        assertEquals("1948 — 1966", result.getPeriod());
        assertEquals("나는 바닷가에서 자랐다.", result.getContent());
    }

    @Test
    void 코드_펜스나_인사말에_싸여_와도_찾아낸다() {
        AutobiographyDTO result = AutobiographyService.parse("""
                물론이죠! 아래에 자서전 한 장을 써 드렸습니다.
                ```json
                {"title":"서울, 새로운 시작","content":"나는 스무 살에 서울에 왔다."}
                ```
                도움이 되셨으면 좋겠습니다.
                """);

        assertNotNull(result);
        assertEquals("서울, 새로운 시작", result.getTitle());
    }

    @Test
    void 중첩된_객체가_있어도_잘리지_않는다() {
        // 첫 번째 닫는 괄호로 자르면 여기서 깨진다. 가장 바깥 괄호를 잡아야 한다.
        AutobiographyDTO result = AutobiographyService.parse(
                "{\"title\":\"제목\",\"meta\":{\"model\":\"x\"},\"content\":\"본문이다.\"}");

        assertNotNull(result);
        assertEquals("본문이다.", result.getContent());
    }

    @Test
    void 본문이_없으면_요약이라도_본문으로_쓴다() {
        // CONTENT는 NOT NULL이다. 요약만 있는 답도 그 하루들이 있었다는 기록으로는 남는다.
        AutobiographyDTO result = AutobiographyService.parse(
                "{\"title\":\"제목\",\"summary\":\"짧은 요약.\"}");

        assertNotNull(result);
        assertEquals("짧은 요약.", result.getContent());
    }

    @Test
    void 제목이_없으면_요약으로_대신하고_그것도_없으면_이름을_붙인다() {
        AutobiographyDTO fromSummary = AutobiographyService.parse(
                "{\"summary\":\"요약이다.\",\"content\":\"본문이다.\"}");
        assertEquals("요약이다.", fromSummary.getTitle());

        AutobiographyDTO fallback = AutobiographyService.parse("{\"content\":\"본문이다.\"}");
        assertEquals("이름 없는 장", fallback.getTitle());
    }

    @Test
    void 본문도_요약도_없으면_저장할_것이_없다() {
        assertNull(AutobiographyService.parse("{\"title\":\"제목뿐\"}"));
    }

    @Test
    void JSON이_아니면_null을_돌려주고_던지지_않는다() {
        assertNull(AutobiographyService.parse("죄송합니다, 지금은 답변드릴 수 없습니다."));
        assertNull(AutobiographyService.parse("{망가진 json"));
        assertNull(AutobiographyService.parse("[1,2,3]"));
        assertNull(AutobiographyService.parse(""));
        assertNull(AutobiographyService.parse(null));
    }

    @Test
    void 컬럼_폭을_넘긴_제목과_시기는_잘라서_담는다() {
        // sql_mode가 STRICT_TRANS_TABLES라 자르지 않으면 INSERT가 통째로 실패한다.
        String longTitle = "가".repeat(400);
        String longPeriod = "나".repeat(120);

        AutobiographyDTO result = AutobiographyService.parse(
                "{\"title\":\"" + longTitle + "\",\"period\":\"" + longPeriod + "\",\"content\":\"본문\"}");

        assertEquals(AutobiographyService.MAX_TITLE_LENGTH, result.getTitle().length());
        assertEquals(AutobiographyService.MAX_PERIOD_LENGTH, result.getPeriod().length());
    }

    @Test
    void 모델이_완성이라고_말해도_작성_중으로_저장한다() {
        // 다 됐는지는 그 삶을 산 사람이 정한다.
        AutobiographyDTO result = AutobiographyService.parse(
                "{\"title\":\"제목\",\"content\":\"본문\",\"status\":\"DONE\"}");

        assertEquals(AutobiographyDTO.Status.DRAFT, result.getStatus());
    }

    @Test
    void 문자열이_아닌_필드는_없는_것으로_본다() {
        AutobiographyDTO result = AutobiographyService.parse(
                "{\"title\":123,\"period\":null,\"content\":\"본문\"}");

        assertNotNull(result);
        assertTrue(result.getPeriod() == null);
        assertEquals("이름 없는 장", result.getTitle());
    }
}
