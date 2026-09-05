package hanium.damso.service.impl;

import hanium.damso.dto.RecallDTO;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 기억 회상 확인의 판정과 집계를 지킨다.
 *
 * <p>여기서 나오는 수치는 보호자가 보고 "어머니 기억이 나빠지셨나" 하고 판단하는 데 쓰인다.
 * 틀린 판정 하나가 없는 병을 만들 수 있으므로, 애매하면 세지 않는 쪽으로 기울어야 한다.
 */
class RecallServiceTest {
    // ================= 채점 결과 파싱 =================

    @Test
    void 평범한_판정을_읽는다() {
        assertEquals(RecallDTO.Result.HIT, RecallService.parseResult("{\"result\":\"HIT\"}"));
        assertEquals(RecallDTO.Result.MISS, RecallService.parseResult("{\"result\":\"MISS\"}"));
        assertEquals(RecallDTO.Result.UNCLEAR, RecallService.parseResult("{\"result\":\"UNCLEAR\"}"));
    }

    @Test
    void 코드_펜스와_서론이_붙어도_읽는다() {
        assertEquals(RecallDTO.Result.HIT, RecallService.parseResult("""
                물론이죠!
                ```json
                {"result": "HIT"}
                ```
                """));
    }

    @Test
    void 소문자로_와도_읽는다() {
        assertEquals(RecallDTO.Result.MISS, RecallService.parseResult("{\"result\":\"miss\"}"));
    }

    @Test
    void 못_읽는_판정은_null이다() {
        // null이 곧 "이 검사는 기록하지 않는다"이다. 아무 값이나 넣어 통계를 만들면 안 된다.
        assertNull(RecallService.parseResult(null));
        assertNull(RecallService.parseResult("잘 모르겠습니다"));
        assertNull(RecallService.parseResult("{\"result\":\"MAYBE\"}"));
        assertNull(RecallService.parseResult("{\"verdict\":\"HIT\"}"));
    }

    @Test
    void ASKED는_판정이_아니라_판정_전이라_거절한다() {
        assertNull(RecallService.parseResult("{\"result\":\"ASKED\"}"));
    }

    // ================= 여쭈었는가 =================

    @Test
    void 응답에_그_말이_있으면_여쭌_것이다() {
        assertTrue(RecallService.asked("손녀 이름이 뭐였는지 기억나세요?", "손녀 이름"));
    }

    @Test
    void 조사가_끼어들어도_첫_낱말로_알아본다() {
        // 모델은 "손녀 이름"을 "손녀분 이름이"로 바꿔 쓴다. 통째로 찾으면 거의 안 맞는다.
        assertTrue(RecallService.asked("손녀분 이름이 뭐라고 하셨지요?", "손녀 이름"));
    }

    @Test
    void 그_말이_없으면_안_여쭌_것이다() {
        // 놓쳐서 적게 세는 것은 괜찮지만, 없는 검사를 만들어서는 안 된다.
        assertFalse(RecallService.asked("오늘 점심은 무엇을 드셨어요?", "손녀 이름"));
        assertFalse(RecallService.asked(null, "손녀 이름"));
        assertFalse(RecallService.asked("아무 말", null));
    }

    @Test
    void 첫_낱말이_한_글자면_그것만으로_인정하지_않는다() {
        // "그 사람" 같은 term의 "그" 하나로 아무 문장이나 걸리면 검사가 거짓으로 열린다.
        assertFalse(RecallService.asked("그러셨군요. 오늘은 어떠셨어요?", "그 사람 이름"));
    }

    // ================= 제안 파싱 =================

    @Test
    void 제안을_읽는다() {
        List<RecallDTO> result = RecallService.parseSuggestions("""
                {"items":[{"term":"손녀 이름","answer":"지민","category":"FAMILY","hint":"자주 오는 손녀"},
                          {"term":"지난주에 다녀온 곳","answer":"남산","category":"PLACE"}]}
                """);

        assertEquals(2, result.size());
        assertEquals("손녀 이름", result.get(0).getTerm());
        assertEquals("지민", result.get(0).getAnswer());
        assertEquals(RecallDTO.Category.FAMILY, result.get(0).getCategory());
        assertEquals("남산", result.get(1).getAnswer());
        assertNull(result.get(1).getHint());
    }

    @Test
    void 모르는_분류는_기타로_받는다() {
        List<RecallDTO> result = RecallService.parseSuggestions(
                "{\"items\":[{\"term\":\"낱말\",\"answer\":\"답\",\"category\":\"음식\"}]}");

        assertEquals(RecallDTO.Category.ETC, result.get(0).getCategory());
    }

    @Test
    void 항목_하나가_나빠도_나머지는_살린다() {
        // answer가 없는 항목만 버린다. 필드 하나 때문에 잘 뽑은 것을 통째로 버리면 안 된다.
        List<RecallDTO> result = RecallService.parseSuggestions(
                "{\"items\":[{\"term\":\"답이 없는 것\"},{\"term\":\"낱말\",\"answer\":\"답\"}]}");

        assertEquals(1, result.size());
        assertEquals("낱말", result.get(0).getTerm());
    }

    @Test
    void 겹치는_제안은_한_번만_담는다() {
        List<RecallDTO> result = RecallService.parseSuggestions(
                "{\"items\":[{\"term\":\"낱말\",\"answer\":\"답\"},{\"term\":\"낱말\",\"answer\":\"다른 답\"}]}");

        assertEquals(1, result.size());
    }

    @Test
    void 제안이_너무_많으면_앞에서_자른다() {
        StringBuilder json = new StringBuilder("{\"items\":[");
        for (int i = 0; i < 12; i++) {
            if (i > 0) json.append(',');
            json.append("{\"term\":\"낱말").append(i).append("\",\"answer\":\"답\"}");
        }
        json.append("]}");

        assertEquals(RecallService.MAX_SUGGESTIONS, RecallService.parseSuggestions(json.toString()).size());
    }

    @Test
    void 쓸_만한_제안이_없으면_빈_목록이다() {
        assertTrue(RecallService.parseSuggestions(null).isEmpty());
        assertTrue(RecallService.parseSuggestions("{\"items\":[]}").isEmpty());
        assertTrue(RecallService.parseSuggestions("{\"items\":\"산책, 친구\"}").isEmpty());
        assertTrue(RecallService.parseSuggestions("죄송합니다").isEmpty());
    }

    // ================= 프롬프트 블록 =================

    @Test
    void 대상이_없으면_덧붙는_것이_없다() {
        // 키워드를 하나도 등록하지 않은 사람의 대화는 이 기능이 생기기 전과 똑같아야 한다.
        RecallService service = new RecallService(null, null, null, null);

        assertEquals("", service.askBlock(null));
        assertEquals("", service.askBlock(new RecallDTO()));
    }

    @Test
    void 덧붙는_블록에_정답이_들어가면_안_된다() {
        // 정답이 프롬프트에 실리면 모델이 질문 안에 답을 흘려서 검사가 성립하지 않는다.
        RecallDTO target = new RecallDTO();
        target.setTerm("손녀 이름");
        target.setAnswer("지민");

        String block = new RecallService(null, null, null, null).askBlock(target);

        assertTrue(block.contains("손녀 이름"));
        assertFalse(block.contains("지민"));
    }

    // ================= 기간과 집계 =================

    @Test
    void 모르는_기간은_이번_주로_떨어진다() {
        assertEquals("WEEK", RecallService.periodOf(null));
        assertEquals("WEEK", RecallService.periodOf("이번 주"));
        assertEquals("WEEK", RecallService.periodOf("WEEK"));
        assertEquals("MONTH", RecallService.periodOf("month"));
        assertEquals("QUARTER", RecallService.periodOf(" QUARTER "));
    }

    @Test
    void 기간마다_버킷_단위가_다르다() {
        assertEquals("DAY", RecallService.unitOf("WEEK"));
        assertEquals("WEEK", RecallService.unitOf("MONTH"));
        assertEquals("MONTH", RecallService.unitOf("QUARTER"));
    }

    @Test
    void 이번_주는_월요일부터_일곱_칸이다() {
        LocalDate sunday = LocalDate.of(2026, 9, 6);
        LocalDate from = RecallService.startOf("WEEK", sunday);

        assertEquals(LocalDate.of(2026, 8, 31), from);

        List<RecallDTO.BucketDTO> buckets = RecallService.fill("WEEK", from, sunday, List.of());

        assertEquals(7, buckets.size());
        assertEquals("월", buckets.get(0).getLabel());
        assertEquals("일", buckets.get(6).getLabel());
    }

    @Test
    void 검사가_없던_칸은_0으로_채운다() {
        // 있는 날만 막대가 서면 주마다 막대 개수가 달라져 눈으로 비교할 수 없다.
        LocalDate sunday = LocalDate.of(2026, 9, 6);
        LocalDate from = RecallService.startOf("WEEK", sunday);

        RecallDTO.BucketDTO row = new RecallDTO.BucketDTO();
        row.setDate("2026-09-02");
        row.setAsked(2);
        row.setHit(1);
        row.setMiss(1);

        List<RecallDTO.BucketDTO> buckets = RecallService.fill("WEEK", from, sunday, List.of(row));

        assertEquals(7, buckets.size());
        assertEquals(0, buckets.get(0).getAsked());
        assertNull(buckets.get(0).getRate(), "검사가 없던 날은 0%가 아니라 값이 없어야 한다");
        assertEquals(2, buckets.get(2).getAsked());
        assertEquals(50, buckets.get(2).getRate());
    }

    @Test
    void 지난_4주는_주_단위_네_칸이다() {
        LocalDate today = LocalDate.of(2026, 9, 6);
        LocalDate from = RecallService.startOf("MONTH", today);

        assertEquals(4, RecallService.fill("MONTH", from, today, List.of()).size());
    }

    @Test
    void 최근_3개월은_달_단위_세_칸이다() {
        LocalDate today = LocalDate.of(2026, 9, 6);
        LocalDate from = RecallService.startOf("QUARTER", today);

        List<RecallDTO.BucketDTO> buckets = RecallService.fill("QUARTER", from, today, List.of());

        assertEquals(3, buckets.size());
        assertEquals("7월", buckets.get(0).getLabel());
        assertEquals("9월", buckets.get(2).getLabel());
    }

    @Test
    void 물어본_적이_없으면_성공률은_0퍼센트가_아니라_없음이다() {
        assertNull(RecallService.rateOf(0, 0));
        assertNull(RecallService.rateOf(null, null));
    }

    @Test
    void 성공률은_HIT와_MISS만으로_센다() {
        // UNCLEAR는 기억의 문제가 아니라 판정의 문제라 분모에 넣지 않는다.
        assertEquals(100, RecallService.rateOf(3, 0));
        assertEquals(0, RecallService.rateOf(0, 3));
        assertEquals(67, RecallService.rateOf(2, 1));
    }

    // ================= 프롬프트 덮어쓰기 =================

    @Test
    void 빈_프로퍼티는_기본값으로_떨어진다() {
        // 프로퍼티가 "없음"이 아니라 "빈 문자열"이라 @Value 기본값에는 영영 닿지 않는다.
        assertEquals("기본", RecallService.template(null, "기본"));
        assertEquals("기본", RecallService.template("   ", "기본"));
        assertEquals("덮어쓴 것", RecallService.template("덮어쓴 것", "기본"));
    }
}
