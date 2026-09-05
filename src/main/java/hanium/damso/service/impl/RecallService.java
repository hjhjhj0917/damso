package hanium.damso.service.impl;

import hanium.damso.dto.DiaryDTO;
import hanium.damso.dto.LLMDTO;
import hanium.damso.dto.RecallDTO;
import hanium.damso.mapper.IDiaryMapper;
import hanium.damso.mapper.IRecallMapper;
import hanium.damso.service.ILLMService;
import hanium.damso.service.ILinkService;
import hanium.damso.service.IRecallService;
import hanium.damso.util.IdUtil;
import hanium.damso.util.JsonUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RequiredArgsConstructor
@Service
public class RecallService implements IRecallService {
    private final IRecallMapper recallMapper;
    private final ILinkService linkService;
    private final ILLMService llmService;

    /**
     * 데일리노트는 <b>서비스가 아니라 매퍼로</b> 읽는다.
     *
     * <p>IDiaryService를 주입하면 순환이 생긴다: DiaryService → ChatService → RecallService →
     * DiaryService. 여기서 필요한 것은 목록 조회 한 줄뿐이라 매퍼로 충분하고, 그러면 고리가 끊긴다.
     */
    private final IDiaryMapper diaryMapper;

    @Value("${damso.llm.recall.prompt}")
    private String LLM_PROMPT;

    @Value("${damso.llm.recall.grader}")
    private String LLM_GRADER;

    @Value("${damso.llm.recall.suggest}")
    private String LLM_SUGGEST;

    @Value("${damso.llm.recall.format}")
    private String LLM_FORMAT;

    /** RECALL_KEYWORD.TERM의 컬럼 폭. */
    static final int MAX_TERM_LENGTH = 100;

    /** RECALL_KEYWORD.ANSWER의 컬럼 폭. */
    static final int MAX_ANSWER_LENGTH = 255;

    /** RECALL_KEYWORD.HINT의 컬럼 폭. */
    static final int MAX_HINT_LENGTH = 255;

    static final int MAX_CHECKS_PER_DAY = 3;

    /** 같은 이야깃거리를 다시 꺼내기까지 비워 두는 날. */
    static final int KEYWORD_COOLDOWN_DAYS = 7;

    /**
     * 여쭌 뒤 이만큼이 지나면 채점하지 않는다.
     *
     * <p>답하지 않고 화제를 옮기신 것이고, 한참 뒤의 엉뚱한 발화를 그 질문의 답으로 채점하면
     * 통계가 거짓이 된다. 그 행은 ASKED로 남아 집계에서 빠진다.
     */
    static final int PENDING_TTL_MINUTES = 30;

    /**
     * 대화를 검사로 열지 않는다 — 이만큼 오간 뒤부터 이야깃거리를 얹는다.
     *
     * <p>인사를 건네자마자 "손녀 이름이 뭐였지요?"가 나오면 그것은 말벗이 아니라 문진이다.
     */
    static final int MIN_TURNS_BEFORE_ASK = 4;

    /** 제안에 읽는 데일리노트 수. */
    static final int SUGGEST_SOURCE_NOTES = 20;

    /** 제안 프롬프트에 싣는 글자 수 상한. */
    static final int MAX_SOURCE_CHARS = 8192;

    /** 한 번에 제안하는 후보 수. */
    static final int MAX_SUGGESTIONS = 5;

    /** 제안을 시도할 최소 노트 수. 한두 편으로 뽑으면 모델이 없는 사람을 지어낸다. */
    static final int MIN_SUGGEST_NOTES = 3;

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * 대화 프롬프트 뒤에 덧붙는 블록.
     *
     * <p>"여쭙지 않아도 됩니다"가 규칙의 핵심이다. 반드시 물으라고 하면 모델은 흐름을 끊고서라도
     * 묻고, 그러면 매일 같은 자리에서 대화가 어색해진다.
     */
    private static final String DEFAULT_RECALL_PROMPT = """

            오늘 어르신께 여쭤볼 이야깃거리가 하나 있습니다: "{term}".
            대화의 흐름이 자연스러울 때 딱 한 번만, 지나가듯 여쭤보세요. 흐름과 맞지 않으면 여쭙지 않아도 됩니다.
            어르신이 기억나지 않는다고 하시거나 다른 이야기를 하시면 그대로 넘어가고 다시 여쭙지 마세요.
            정답을 알려 드리거나, 맞았다 틀렸다 말하거나, 다시 생각해 보시라고 재촉해서는 절대 안 됩니다.
            이것이 확인을 위한 질문이라는 사실을 어떤 식으로도 내비치지 마세요.
            """;

    /** 채점기. 판정 한 글자만 받는다. */
    private static final String DEFAULT_GRADER_PROMPT = """
            당신은 어르신의 대답이 여쭌 것을 기억해 내신 것인지만 판정합니다. 판정 외에는 아무 말도 하지 마세요.
            여쭌 것: {term}
            맞는 답: {answer}
            어르신의 대답은 다음 메시지로 주어집니다.
            표기가 조금 다르거나 조사와 존칭이 붙어도, 같은 대상을 가리키면 기억해 내신 것으로 봅니다.
            기억이 안 난다고 하시거나 전혀 다른 대상을 말씀하셨으면 기억해 내지 못하신 것입니다.
            질문과 상관없는 이야기를 하셨거나 판정할 수 없으면 UNCLEAR입니다.
            반드시 아래 형태의 JSON 객체 하나만 출력하세요. 설명이나 코드 블록을 붙이지 마세요.
            {"result": "HIT"}
            result는 HIT, MISS, UNCLEAR 중 하나입니다.
            """;

    /**
     * 후보 제안기.
     *
     * <p>대화가 아니라 데일리노트를 읽는다 — 이유는 {@link #suggest}의 주석에 있다.
     */
    private static final String DEFAULT_SUGGEST_PROMPT = """
            당신은 어르신의 데일리노트를 읽고, 나중에 대화 중에 여쭤볼 만한 이야깃거리를 뽑아 드립니다.
            아래에 어르신의 데일리노트가 여러 편 주어집니다.
            노트에 실제로 나온 것만 뽑으세요. 노트에 없는 사람, 없는 장소, 없는 일을 지어내면 절대 안 됩니다.
            건강 상태, 병명, 약 이름은 뽑지 마세요. 이것은 문진이 아니라 이야깃거리입니다.
            당신은 반드시 아래 형태의 JSON 객체 하나만 출력해야 합니다. 설명이나 코드 블록을 붙이지 마세요.
            {"items": [{"term": "여쭤볼 것", "answer": "맞는 답", "category": "FAMILY", "hint": "힌트"}]}
            각 항목의 규칙입니다.
            - term: 무엇을 여쭐지를 나타내는 20자 이내의 짧은 말. 예: "손녀 이름", "3월에 다녀온 곳"
            - answer: 노트에 적힌 그 답. 예: "지민", "울산"
            - category: FAMILY, PLACE, EVENT, DAILY, ETC 중 하나.
            - hint: 어르신이 떠올리시기 좋은 한 줄 힌트. 없으면 비워 두세요.
            최대 다섯 개까지만 뽑고, 노트에서 확실한 것이 없으면 items를 빈 배열로 두세요.
            모든 글은 한국어로 쓰고, 이모지와 표는 쓰지 마세요.
            """;

    // ================= 키워드 저장소 =================

    @Override
    public List<RecallDTO> getKeywords(String userId) throws Exception {
        if (userId == null) return List.of();
        return recallMapper.selectKeywords(userId);
    }

    private void requireEditable(String ownerId, String editorId) throws IllegalAccessException {
        if (ownerId == null || editorId == null) throw new IllegalAccessException();
        if (!linkService.canView(ownerId, editorId)) throw new IllegalAccessException();
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public RecallDTO addKeyword(RecallDTO pDTO, String editorId) throws Exception {
        if (pDTO.getUserId() == null) throw new NullPointerException();
        if (isBlank(pDTO.getTerm()) || isBlank(pDTO.getAnswer())) throw new IllegalArgumentException();

        this.requireEditable(pDTO.getUserId(), editorId);

        pDTO.setId(IdUtil.generate(IdUtil.KEYWORD));
        pDTO.setCreatedBy(editorId);
        pDTO.setCategory(pDTO.getCategory() == null ? RecallDTO.Category.ETC : pDTO.getCategory());
        pDTO.setTerm(JsonUtil.clip(pDTO.getTerm(), MAX_TERM_LENGTH));
        pDTO.setAnswer(JsonUtil.clip(pDTO.getAnswer(), MAX_ANSWER_LENGTH));
        pDTO.setHint(JsonUtil.clip(pDTO.getHint(), MAX_HINT_LENGTH));

        recallMapper.insertKeyword(pDTO);

        // 값을 로그에 남기지 않는다. term과 answer는 그 집안의 사람 이름과 사는 곳이다.
        log.info("Recall keyword created: {} for {} by {}", pDTO.getId(), pDTO.getUserId(), editorId);

        return recallMapper.selectKeyword(RecallDTO.of(pDTO.getId()));
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int updateKeyword(RecallDTO pDTO, String editorId) throws Exception {
        if (pDTO.getId() == null) throw new NullPointerException();

        RecallDTO saved = recallMapper.selectKeyword(RecallDTO.of(pDTO.getId()));
        if (saved == null) return 0;

        this.requireEditable(saved.getUserId(), editorId);

        // 빈 문자열은 "지워라"가 아니라 잘못 온 값으로 본다. TERM과 ANSWER는 NOT NULL이고,
        // 빈 값이 들어가면 그 키워드는 영영 물어볼 수 없는 유령이 된다.
        if (pDTO.getTerm() != null && pDTO.getTerm().isBlank()) throw new IllegalArgumentException();
        if (pDTO.getAnswer() != null && pDTO.getAnswer().isBlank()) throw new IllegalArgumentException();

        boolean touches = pDTO.getCategory() != null || pDTO.getTerm() != null
                || pDTO.getAnswer() != null || pDTO.getHint() != null;
        if (!touches) return 0;

        pDTO.setUserId(saved.getUserId());
        pDTO.setTerm(JsonUtil.clip(pDTO.getTerm(), MAX_TERM_LENGTH));
        pDTO.setAnswer(JsonUtil.clip(pDTO.getAnswer(), MAX_ANSWER_LENGTH));
        pDTO.setHint(JsonUtil.clip(pDTO.getHint(), MAX_HINT_LENGTH));

        return recallMapper.updateKeyword(pDTO);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int deleteKeyword(String keywordId, String editorId) throws Exception {
        RecallDTO saved = recallMapper.selectKeyword(RecallDTO.of(keywordId));
        if (saved == null) return 0;

        this.requireEditable(saved.getUserId(), editorId);

        RecallDTO pDTO = RecallDTO.of(keywordId);
        pDTO.setUserId(saved.getUserId());

        return recallMapper.deleteKeyword(pDTO);
    }

    /**
     * 데일리노트에서 후보를 뽑는다.
     */
    @Override
    public List<RecallDTO> suggest(String userId) throws Exception {
        if (userId == null) throw new NullPointerException();

        DiaryDTO query = new DiaryDTO();
        query.setUserId(userId);

        List<DiaryDTO> notes = diaryMapper.selectList(query);
        if (notes == null || notes.size() < MIN_SUGGEST_NOTES) {
            log.debug("Not enough notes to suggest keywords for {}: {}",
                    userId, notes == null ? 0 : notes.size());
            throw new IllegalStateException("NOT_ENOUGH_SOURCE");
        }

        StringBuilder source = new StringBuilder();
        int used = 0;
        for (DiaryDTO note : notes) {
            if (used >= SUGGEST_SOURCE_NOTES) break;
            if (note.getContent() == null || note.getContent().isBlank()) continue;

            source.append(note.getDate() == null ? "" : note.getDate()).append(' ')
                    .append(note.getTitle() == null ? "" : note.getTitle()).append('\n')
                    .append(note.getContent()).append("\n\n");
            used++;
            if (source.length() >= MAX_SOURCE_CHARS) break;
        }

        if (used < MIN_SUGGEST_NOTES) throw new IllegalStateException("NOT_ENOUGH_SOURCE");

        List<LLMDTO.MessageDTO> prompt = List.of(
                new LLMDTO.MessageDTO("system", template(LLM_SUGGEST, DEFAULT_SUGGEST_PROMPT)),
                new LLMDTO.MessageDTO("user", source.toString()));

        List<RecallDTO> parsed = parseSuggestions(llmService.complete(prompt, LLM_FORMAT));

        log.info("Suggested {} recall keywords for {} from {} notes", parsed.size(), userId, used);

        return parsed;
    }

    // ================= 대화 중의 검사 =================

    /**
     * 게이트를 통과한 이야깃거리 하나, 아니면 null.
     *
     * <p>여기서 조회가 두 번 일어나지만 캐시하지 않는다. 대화 한 턴에 한 번이고, 잘못 캐시하면
     * "오늘 이미 물었다"가 다음 대화까지 새어 나가거나 그 반대가 된다.
     */
    @Override
    public RecallDTO pickTarget(String userId, int turnCount) {
        if (userId == null) return null;
        if (turnCount < MIN_TURNS_BEFORE_ASK) return null;

        try {
            if (recallMapper.countAskedToday(userId) >= MAX_CHECKS_PER_DAY) return null;

            return recallMapper.selectAskTarget(userId, KEYWORD_COOLDOWN_DAYS);
        } catch (Exception e) {
            // 검사를 못 고른 것은 대화를 멈출 이유가 아니다. 오늘은 그냥 안 묻는다.
            log.warn("Failed to pick a recall target for {} - skipping the check", userId, e);
            return null;
        }
    }

    /**
     * 모델이 실제로 여쭈었을 때만 검사를 연다.
     *
     * <p>응답에 그 말이 없으면 <b>LAST_ASKED_AT도 건드리지 않는다.</b> 안 물어본 키워드를
     * 회전에서 밀어내면, 모델이 매번 자연스럽지 않다고 판단한 키워드가 영영 한 번도
     * 안 물어본 채로 순서만 뒤로 밀린다.
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public void noteAsked(String userId, String roomId, RecallDTO keyword,
                          String botMessageId, String botMessage) {
        if (keyword == null || botMessageId == null) return;
        if (!asked(botMessage, keyword.getTerm())) return;

        try {
            RecallDTO.LogDTO pDTO = new RecallDTO.LogDTO();
            pDTO.setId(IdUtil.generate(IdUtil.RECALL));
            pDTO.setUserId(userId);
            pDTO.setKeywordId(keyword.getId());
            pDTO.setRoomId(roomId);
            pDTO.setAskMessageId(botMessageId);

            recallMapper.insertLog(pDTO);
            recallMapper.touchAsked(keyword.getId());

            log.info("Recall check opened: {} keyword {} for {}", pDTO.getId(), keyword.getId(), userId);
        } catch (Exception e) {
            log.warn("Failed to open a recall check for {} - the conversation continues", userId, e);
        }
    }

    @Override
    public void gradeIfPending(String userId, String roomId, String userMessageId, String userMessage) {
        if (roomId == null || userMessageId == null || isBlank(userMessage)) return;

        try {
            RecallDTO.LogDTO pending = recallMapper.selectPendingLog(roomId, PENDING_TTL_MINUTES);
            if (pending == null) return;

            RecallDTO keyword = recallMapper.selectKeyword(RecallDTO.of(pending.getKeywordId()));
            if (keyword == null) return;

            List<LLMDTO.MessageDTO> prompt = List.of(
                    new LLMDTO.MessageDTO("system", graderPrompt(keyword)),
                    new LLMDTO.MessageDTO("user", userMessage));

            RecallDTO.Result result = parseResult(llmService.complete(prompt, LLM_FORMAT));

            // 못 알아들은 판정은 기록하지 않는다. 행은 ASKED로 남아 집계에서 빠지고,
            // TTL이 지나면 조용히 잊힌다. 아무 값이나 넣어 통계를 만드는 것보다 낫다.
            if (result == null || result == RecallDTO.Result.ASKED) {
                log.warn("Recall grading produced nothing usable for check {}", pending.getId());
                return;
            }

            recallMapper.gradeLog(pending.getId(), result.name(), userMessageId);

            log.info("Recall check {} graded {}", pending.getId(), result);
        } catch (Exception e) {
            // 채점 실패가 대화를 끊으면 안 된다. 이 메서드는 무슨 일이 있어도 조용히 돌아간다.
            log.warn("Recall grading failed for {} - the conversation continues", userId, e);
        }
    }

    // ================= 리포트 =================

    @Override
    public RecallDTO.ReportDTO getReport(String userId, String period) throws Exception {
        if (userId == null) throw new NullPointerException();

        String window = periodOf(period);
        LocalDate today = LocalDate.now();
        LocalDate from = startOf(window, today);

        RecallDTO.QueryDTO qDTO = new RecallDTO.QueryDTO();
        qDTO.setUserId(userId);
        qDTO.setFrom(from.format(DATE));
        qDTO.setTo(today.format(DATE));

        RecallDTO.ReportDTO rDTO = recallMapper.selectSummary(qDTO);
        if (rDTO == null) rDTO = new RecallDTO.ReportDTO();

        rDTO.setPeriod(window);
        rDTO.setFrom(qDTO.getFrom());
        rDTO.setTo(qDTO.getTo());
        rDTO.setKeywordCount(recallMapper.countKeywords(userId));
        rDTO.setRate(rateOf(rDTO.getHit(), rDTO.getMiss()));
        rDTO.setBuckets(fill(window, from, today, recallMapper.selectBuckets(qDTO, unitOf(window))));

        return rDTO;
    }

    // ================= 프롬프트 =================

    /**
     * 대화의 시스템 프롬프트에 덧붙을 블록. 대상이 없으면 빈 문자열이라, 프롬프트가 평소와
     * 한 글자도 다르지 않다.
     *
     * <p>package-private인 이유: ChatService가 부르고, 테스트가 "대상 없으면 빈 문자열"을 지킨다.
     */
    @Override
    public String askBlock(RecallDTO target) {
        if (target == null || isBlank(target.getTerm())) return "";

        return template(LLM_PROMPT, DEFAULT_RECALL_PROMPT).replace("{term}", target.getTerm());
    }

    private String graderPrompt(RecallDTO keyword) {
        return template(LLM_GRADER, DEFAULT_GRADER_PROMPT)
                .replace("{term}", keyword.getTerm() == null ? "" : keyword.getTerm())
                .replace("{answer}", keyword.getAnswer() == null ? "" : keyword.getAnswer());
    }

    /**
     * 덮어쓴 프로퍼티가 있으면 그것을, 없으면 코드의 기본값을.
     *
     * <p>프로퍼티가 "없음"이 아니라 "빈 문자열"인 것에 주의({@code ${LLM_RECALL_PROMPT:}}).
     * {@code @Value} 기본값에는 영영 닿지 않으므로 여기서 isBlank()로 본다 — ChatService와 같다.
     */
    static String template(String override, String fallback) {
        return (override == null || override.isBlank()) ? fallback : override;
    }

    // ================= 파싱과 계산 =================

    /**
     * 모델의 응답이 그 말을 실제로 꺼냈는가.
     *
     * <p>공백을 지우고 비교한다. term이 "손녀 이름"인데 모델은 "손녀분 이름이"라고 쓰므로
     * 통째로 찾으면 거의 안 맞는다. 그래서 term의 <b>첫 낱말</b>만으로도 인정한다 —
     * 여기서 놓치는 것은 "안 물어본 것"으로 세어져 통계가 줄어들 뿐, 없는 검사를 만들지는 않는다.
     * 둘 중 틀리는 쪽을 고르라면 적게 세는 쪽이 맞다.
     */
    static boolean asked(String botMessage, String term) {
        if (botMessage == null || term == null) return false;

        String haystack = botMessage.replaceAll("\\s+", "");
        String needle = term.replaceAll("\\s+", "");
        if (needle.isEmpty()) return false;
        if (haystack.contains(needle)) return true;

        String head = term.trim().split("\\s+")[0];
        return head.length() >= 2 && haystack.contains(head);
    }

    /** 채점 결과 한 글자. 못 읽으면 null. */
    static RecallDTO.Result parseResult(String answer) {
        JsonNode node = JsonUtil.readObject(answer);
        if (node == null) return null;

        RecallDTO.Result result = RecallDTO.Result.of(JsonUtil.text(node, "result"));

        // ASKED는 판정이 아니라 "아직 판정 전"이다. 모델이 그렇게 답했다면 못 읽은 것과 같다.
        return result == RecallDTO.Result.ASKED ? null : result;
    }

    /**
     * 제안 후보를 읽는다. 쓸 만한 것이 없으면 빈 목록.
     *
     * <p>필드 하나가 나빴다고 목록 전체를 버리지 않는다 — term과 answer가 둘 다 있는 항목만
     * 남기고 나머지는 조용히 건너뛴다.
     */
    static List<RecallDTO> parseSuggestions(String answer) {
        JsonNode node = JsonUtil.readObject(answer);
        if (node == null) return List.of();

        JsonNode items = node.get("items");
        if (items == null || !items.isArray()) return List.of();

        List<RecallDTO> result = new ArrayList<>();
        List<String> seen = new ArrayList<>();
        for (JsonNode item : items) {
            if (item == null || !item.isObject()) continue;

            String term = JsonUtil.text(item, "term");
            String value = JsonUtil.text(item, "answer");
            if (term == null || value == null) continue;
            if (seen.contains(term)) continue;
            seen.add(term);

            RecallDTO candidate = new RecallDTO();
            candidate.setTerm(JsonUtil.clip(term, MAX_TERM_LENGTH));
            candidate.setAnswer(JsonUtil.clip(value, MAX_ANSWER_LENGTH));
            candidate.setHint(JsonUtil.clip(JsonUtil.text(item, "hint"), MAX_HINT_LENGTH));
            candidate.setCategory(RecallDTO.Category.of(JsonUtil.text(item, "category")));
            result.add(candidate);

            if (result.size() >= MAX_SUGGESTIONS) break;
        }

        return result;
    }

    /** 모르는 기간은 WEEK. 화면의 select가 고장 나도 리포트는 나와야 한다. */
    static String periodOf(String period) {
        if (period == null) return "WEEK";

        String value = period.trim().toUpperCase();
        return switch (value) {
            case "MONTH", "QUARTER" -> value;
            default -> "WEEK";
        };
    }

    /** 기간별 버킷 단위. */
    static String unitOf(String period) {
        return switch (period) {
            case "MONTH" -> "WEEK";
            case "QUARTER" -> "MONTH";
            default -> "DAY";
        };
    }

    /** 창의 시작일. WEEK은 이번 주 월요일부터 — "이번 주"라고 적힌 화면과 뜻이 맞아야 한다. */
    static LocalDate startOf(String period, LocalDate today) {
        return switch (period) {
            case "MONTH" -> today.minusWeeks(3).with(DayOfWeek.MONDAY);
            case "QUARTER" -> today.minusMonths(2).withDayOfMonth(1);
            default -> today.with(DayOfWeek.MONDAY);
        };
    }

    /**
     * 검사가 없던 구간을 0으로 채운다.
     *
     * <p>SQL은 행이 있는 구간만 준다. 그대로 화면에 보내면 검사가 있던 날만 막대가 서고,
     * 주마다 막대 개수가 달라져 "이번 주"와 "지난주"를 눈으로 비교할 수 없게 된다.
     */
    static List<RecallDTO.BucketDTO> fill(String period, LocalDate from, LocalDate to,
                                          List<RecallDTO.BucketDTO> rows) {
        Map<String, RecallDTO.BucketDTO> found = new LinkedHashMap<>();
        if (rows != null) {
            for (RecallDTO.BucketDTO row : rows) {
                if (row != null && row.getDate() != null) found.put(row.getDate(), row);
            }
        }

        List<RecallDTO.BucketDTO> result = new ArrayList<>();
        for (LocalDate cursor = from; !cursor.isAfter(to); cursor = next(period, cursor)) {
            String key = cursor.format(DATE);
            RecallDTO.BucketDTO bucket = found.get(key);
            if (bucket == null) {
                bucket = new RecallDTO.BucketDTO();
                bucket.setDate(key);
                bucket.setAsked(0);
                bucket.setHit(0);
                bucket.setMiss(0);
            }
            bucket.setRate(rateOf(bucket.getHit(), bucket.getMiss()));
            bucket.setLabel(labelOf(period, cursor));
            result.add(bucket);
        }

        return result;
    }

    private static LocalDate next(String period, LocalDate cursor) {
        return switch (period) {
            case "MONTH" -> cursor.plusWeeks(1);
            case "QUARTER" -> cursor.plusMonths(1);
            default -> cursor.plusDays(1);
        };
    }

    /**
     * 축에 적을 글자.
     *
     * <p>한국어 라벨은 원칙적으로 화면의 몫이지만 이것만 서버가 만든다 — 버킷의 단위를 정하는
     * 것이 서버라서, 화면이 라벨을 만들려면 그 규칙을 통째로 한 벌 더 갖고 있어야 한다.
     */
    static String labelOf(String period, LocalDate date) {
        return switch (period) {
            case "MONTH" -> date.getMonthValue() + "/" + date.getDayOfMonth();
            case "QUARTER" -> date.getMonthValue() + "월";
            default -> switch (date.getDayOfWeek()) {
                case MONDAY -> "월";
                case TUESDAY -> "화";
                case WEDNESDAY -> "수";
                case THURSDAY -> "목";
                case FRIDAY -> "금";
                case SATURDAY -> "토";
                case SUNDAY -> "일";
            };
        };
    }

    /**
     * 회상 성공률(%). 분모가 0이면 <b>null</b>.
     *
     * <p>0을 주면 화면이 "0%"를 그리고, 한 번도 안 물어본 사람이 전부 틀린 것처럼 보인다.
     * UNCLEAR는 분모에 넣지 않는다 — 기억의 문제가 아니라 판정의 문제다.
     */
    static Integer rateOf(Integer hit, Integer miss) {
        int hits = hit == null ? 0 : hit;
        int misses = miss == null ? 0 : miss;
        int total = hits + misses;

        return total == 0 ? null : Math.round(hits * 100f / total);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
