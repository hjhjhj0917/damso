package hanium.damso.service.impl;

import hanium.damso.dto.DiaryDTO;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 대화를 일기로 옮기는 파서를 지킨다.
 *
 * <p>여기서 나오는 글은 보호자가 읽고 그 사람의 하루를 판단하는 데 쓰인다. 파싱이 어긋나
 * 엉뚱한 값이 저장되는 것은 화면 문제가 아니다.
 */
class DiaryServiceTest {
    @Test
    void 평범한_답을_읽는다() {
        DiaryDTO result = DiaryService.parse("""
                {"title":"공원 산책","content":"나는 오늘 공원을 걸었다.","mood":"평온해요",
                 "tags":["산책","친구"],"health":"무릎이 조금 뻐근했다"}
                """);

        assertNotNull(result);
        assertEquals("공원 산책", result.getTitle());
        assertEquals("평온해요", result.getMood());
        assertEquals(java.util.List.of("산책", "친구"), result.getTags());
        assertEquals("무릎이 조금 뻐근했다", result.getHealth());
    }

    @Test
    void 태그를_쉼표로_이은_한_줄로_줘도_받는다() {
        // 배열로 달라고 프롬프트에 적어도 모델은 절반쯤 문자열로 준다.
        DiaryDTO result = DiaryService.parse(
                "{\"title\":\"제목\",\"content\":\"본문\",\"tags\":\"산책, 친구, 좋은 하루\"}");

        assertEquals(java.util.List.of("산책", "친구", "좋은 하루"), result.getTags());
    }

    @Test
    void 태그에_붙은_샵은_떼고_저장한다() {
        // 붙이는 것은 화면의 일이다. 저장해 두면 검색과 필터가 #까지 맞춰야 한다.
        DiaryDTO result = DiaryService.parse(
                "{\"title\":\"제목\",\"content\":\"본문\",\"tags\":[\"#산책\",\"#친구\"]}");

        assertEquals(java.util.List.of("산책", "친구"), result.getTags());
    }

    @Test
    void 태그가_너무_많으면_앞에서_잘라_담는다() {
        DiaryDTO result = DiaryService.parse(
                "{\"title\":\"제목\",\"content\":\"본문\",\"tags\":[\"1\",\"2\",\"3\",\"4\",\"5\",\"6\",\"7\"]}");

        assertEquals(DiaryService.MAX_TAGS, result.getTags().size(), result.getTags().toString());
    }

    @Test
    void 태그가_겹치면_한_번만_담는다() {
        DiaryDTO result = DiaryService.parse(
                "{\"title\":\"제목\",\"content\":\"본문\",\"tags\":[\"산책\",\"산책\",\"친구\"]}");

        assertEquals(java.util.List.of("산책", "친구"), result.getTags());
    }

    @Test
    void 본문이_없으면_저장하지_않는다() {
        // CONTENT는 NOT NULL이고, 제목만 남은 하루는 기록이 아니다.
        assertNull(DiaryService.parse("{\"title\":\"제목뿐\",\"mood\":\"평온해요\"}"));
    }

    @Test
    void 제목이_없어도_본문이_있으면_살린다() {
        DiaryDTO result = DiaryService.parse("{\"content\":\"오늘은 조용한 하루였다.\"}");

        assertNotNull(result);
        assertEquals("오늘의 이야기", result.getTitle());
    }

    @Test
    void 코드_펜스에_싸여_와도_찾아낸다() {
        DiaryDTO result = DiaryService.parse("""
                ```json
                {"title":"제목","content":"본문"}
                ```
                """);

        assertNotNull(result);
        assertEquals("제목", result.getTitle());
    }

    @Test
    void JSON이_아니면_null을_돌려주고_던지지_않는다() {
        assertNull(DiaryService.parse("오늘 대화가 충분하지 않아 일기를 쓸 수 없습니다."));
        assertNull(DiaryService.parse(null));
        assertNull(DiaryService.parse(""));
    }

    @Test
    void 컬럼_폭을_넘긴_값은_잘라서_담는다() {
        DiaryDTO result = DiaryService.parse(
                "{\"title\":\"" + "가".repeat(400) + "\",\"content\":\"본문\","
                        + "\"mood\":\"" + "나".repeat(50) + "\",\"health\":\"" + "다".repeat(400) + "\"}");

        assertEquals(DiaryService.MAX_TITLE_LENGTH, result.getTitle().length());
        assertEquals(DiaryService.MAX_MOOD_LENGTH, result.getMood().length());
        assertEquals(DiaryService.MAX_HEALTH_LENGTH, result.getHealth().length());
    }

    @Test
    void 제목_자르기는_공백을_먼저_턴다() {
        assertEquals("제목", DiaryService.clip("  제목  "));
        assertTrue(DiaryService.clip("가".repeat(300)).length() == DiaryService.MAX_TITLE_LENGTH);
    }
}
