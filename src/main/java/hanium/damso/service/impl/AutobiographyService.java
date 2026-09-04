package hanium.damso.service.impl;

import hanium.damso.dto.AutobiographyDTO;
import hanium.damso.dto.ContentDTO;
import hanium.damso.dto.DiaryDTO;
import hanium.damso.dto.LLMDTO;
import hanium.damso.mapper.IAutobiographyMapper;
import hanium.damso.service.IAutobiographyService;
import hanium.damso.service.IContentService;
import hanium.damso.service.IDiaryService;
import hanium.damso.service.ILLMService;
import hanium.damso.util.IdUtil;
import hanium.damso.util.JsonUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@RequiredArgsConstructor
@Service
public class AutobiographyService implements IAutobiographyService {
    private final IAutobiographyMapper autobiographyMapper;
    private final IContentService contentService;
    private final IDiaryService diaryService;
    private final ILLMService llmService;

    @Value("${damso.llm.autobiography.prompt}")
    private String LLM_PROMPT;

    @Value("${damso.llm.autobiography.format}")
    private String LLM_FORMAT;

    /** AUTOBIOGRAPHY.TITLE의 컬럼 폭. */
    static final int MAX_TITLE_LENGTH = 255;

    /** AUTOBIOGRAPHY.PERIOD의 컬럼 폭. */
    static final int MAX_PERIOD_LENGTH = 50;

    /** AUTOBIOGRAPHY.SUMMARY의 컬럼 폭. */
    static final int MAX_SUMMARY_LENGTH = 500;

    /** 한 장을 쓰는 데 필요한 최소 일기 수. */
    static final int MIN_DIARIES = 3;

    /** 한 번에 넘기는 일기 수. */
    static final int MAX_SOURCE_DIARIES = 30;

    /**
     * 넘기는 재료의 글자 수 상한.
     *
     * <p>넘치면 <b>뒤에서</b> 자른다. 한 시기를 다루는 장은 그 시기의 시작에서 출발해야 한다.
     */
    static final int MAX_SOURCE_CHARS = 12_000;

    private static final String DEFAULT_LLM_PROMPT = """
            당신은 어르신의 자서전 한 장(章)을 대신 써 드리는 작가입니다.
            아래에 어르신이 남기신 일기가 날짜 순서대로 주어집니다. 각 항목은 '[날짜] 제목' 줄과 그 아래 본문으로 되어 있습니다.
            자서전은 오직 주어진 일기에 적힌 사실과 감정만으로 써야 합니다. 일기에 없는 사건, 없는 사람, 없는 장소를 지어내서 쓰면 절대 안 됩니다. 이것은 실제로 살아 계신 분의 기록입니다.
            어르신이 직접 쓰신 것처럼 '나는'으로 시작하는 1인칭으로, 담담하고 따뜻한 문어체 한국어로 쓰세요.
            {period}
            당신은 반드시 아래 형태의 JSON 객체 하나만 출력해야 합니다. 설명, 인사말, Markdown, 코드 블록을 앞뒤에 붙여서는 절대 안 됩니다.
            {"title": "장 제목", "period": "시기", "summary": "한두 문장 요약", "content": "본문"}
            각 항목의 규칙입니다.
            - title: 이 장을 한마디로 나타내는 30자 이내의 제목.
            - period: 이 장이 다루는 시기를 나타내는 30자 이내의 짧은 말. 예: "2026년 여름", "손녀가 자주 찾아오던 무렵".
            - summary: 이 장의 내용을 한두 문장으로 줄인 요약.
            - content: 다섯 문단 이내의 자서전 본문. 각 문단은 빈 줄로 나눕니다.
            모든 문장은 한국어로 쓰고, 이모지와 표는 쓰지 마세요.
            """;

    @Override
    public List<AutobiographyDTO> getList(String userId) throws Exception {
        return autobiographyMapper.selectList(userId);
    }

    @Override
    public AutobiographyDTO getInfo(String autobiographyId) throws Exception {
        if (autobiographyId == null) return null;
        return autobiographyMapper.selectAutobiography(AutobiographyDTO.of(autobiographyId));
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public AutobiographyDTO create(AutobiographyDTO pDTO) throws Exception {
        if (pDTO.getUserId() == null) throw new NullPointerException();
        if (pDTO.getTitle() == null || pDTO.getTitle().isBlank()) throw new IllegalArgumentException();
        if (pDTO.getContent() == null || pDTO.getContent().isBlank()) throw new IllegalArgumentException();

        pDTO.setTitle(JsonUtil.clip(pDTO.getTitle(), MAX_TITLE_LENGTH));
        pDTO.setPeriod(JsonUtil.clip(pDTO.getPeriod(), MAX_PERIOD_LENGTH));
        pDTO.setSummary(JsonUtil.clip(pDTO.getSummary(), MAX_SUMMARY_LENGTH));
        if (pDTO.getStatus() == null) pDTO.setStatus(AutobiographyDTO.Status.DRAFT);

        pDTO.setContentId(contentService.create(pDTO.getUserId(), ContentDTO.Type.AUTOBIOGRAPHY));
        pDTO.setId(IdUtil.generate(IdUtil.AUTOBIOGRAPHY));

        autobiographyMapper.insertAutobiography(pDTO);

        return autobiographyMapper.selectAutobiography(AutobiographyDTO.of(pDTO.getId()));
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int update(AutobiographyDTO pDTO) throws Exception {
        if (pDTO.getId() == null || pDTO.getUserId() == null) throw new NullPointerException();

        pDTO.setTitle(JsonUtil.clip(pDTO.getTitle(), MAX_TITLE_LENGTH));
        pDTO.setPeriod(JsonUtil.clip(pDTO.getPeriod(), MAX_PERIOD_LENGTH));
        pDTO.setSummary(JsonUtil.clip(pDTO.getSummary(), MAX_SUMMARY_LENGTH));

        AutobiographyDTO saved = autobiographyMapper.selectAutobiography(AutobiographyDTO.of(pDTO.getId()));
        if (saved == null || !pDTO.getUserId().equals(saved.getUserId())) return 0;

        boolean touchesAnything = pDTO.getTitle() != null || pDTO.getPeriod() != null
                || pDTO.getSummary() != null || pDTO.getContent() != null || pDTO.getStatus() != null;
        if (!touchesAnything) return 0;

        int result = autobiographyMapper.updateAutobiography(pDTO);
        contentService.touch(saved.getContentId());

        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int delete(String autobiographyId, String userId) throws Exception {
        AutobiographyDTO saved = autobiographyMapper.selectAutobiography(AutobiographyDTO.of(autobiographyId));
        if (saved == null) return 0;

        return contentService.delete(saved.getContentId(), userId);
    }

    /**
     * 일기를 엮어 한 장을 쓴다.
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public AutobiographyDTO generate(String userId, String period) throws Exception {
        List<DiaryDTO> diaries = diaryService.getList(userId);
        if (diaries == null || diaries.size() < MIN_DIARIES) {
            // 모델을 부르지 않는다. 재료가 모자란 것은 모델이 고칠 수 있는 문제가 아니고,
            // 물어보면 지어낸 답이 돌아온다.
            //
            // null이 아니라 예외인 것은 컨트롤러가 두 실패를 갈라 답해야 하기 때문이다.
            // "일기를 더 남겨 주세요"와 "지금은 잘 안 되네요"는 사용자가 할 일이 다르다.
            log.debug("Not enough diaries for autobiography: {}", diaries == null ? 0 : diaries.size());
            throw new IllegalStateException("NOT_ENOUGH_SOURCE");
        }

        String sources = this.sources(diaries);

        List<LLMDTO.MessageDTO> messages = List.of(
                new LLMDTO.MessageDTO("system", this.systemPrompt(period)),
                new LLMDTO.MessageDTO("user", sources));

        String answer = llmService.complete(messages, LLM_FORMAT);
        AutobiographyDTO parsed = parse(answer);
        if (parsed == null) {
            log.warn("Autobiography generation produced nothing usable for {}", userId);
            return null;
        }

        parsed.setUserId(userId);
        // 요청한 시기가 있으면 그것을 쓴다. 모델이 정한 시기는 요청이 없을 때만.
        if (period != null && !period.isBlank()) parsed.setPeriod(JsonUtil.clip(period, MAX_PERIOD_LENGTH));

        log.info("Autobiography generated for {} from {} diaries", userId, diaries.size());

        return this.create(parsed);
    }

    /**
     * 일기를 모델에 넘길 한 덩이 글로 만든다. 오래된 것부터.
     *
     * <p>{@code getList}는 최신순이므로 뒤에서부터 읽는다. 자서전은 시간 순서로 읽혀야 한다.
     */
    private String sources(List<DiaryDTO> diaries) {
        List<DiaryDTO> oldestFirst = new ArrayList<>(diaries);
        java.util.Collections.reverse(oldestFirst);

        StringBuilder builder = new StringBuilder();
        int used = 0;
        for (DiaryDTO diary : oldestFirst) {
            if (used >= MAX_SOURCE_DIARIES) break;
            if (builder.length() >= MAX_SOURCE_CHARS) break;

            builder.append('[').append(diary.getDate() == null ? "날짜 미상" : diary.getDate())
                    .append("] ").append(diary.getTitle()).append('\n')
                    .append(diary.getContent()).append("\n\n");
            used++;
        }

        return builder.length() <= MAX_SOURCE_CHARS
                ? builder.toString()
                : builder.substring(0, MAX_SOURCE_CHARS);
    }

    private String systemPrompt(String period) {
        String template = (LLM_PROMPT == null || LLM_PROMPT.isBlank()) ? DEFAULT_LLM_PROMPT : LLM_PROMPT;

        // 자리표시자를 언제나 치환한다. 덮어쓴 프롬프트에 {period}가 없으면 아무 일도 일어나지
        // 않지만, 빠뜨리면 치환되지 않은 {period}가 그대로 모델에 닿아 지시로 읽힌다.
        String line = (period == null || period.isBlank())
                ? ""
                : "이 장은 '" + period + "' 시기를 다룹니다.";

        return template.replace("{period}", line);
    }

    /**
     * 모델의 답에서 한 장을 읽어 낸다. 쓸 만한 것이 없으면 null.
     *
     * <p>필드마다 따로 방어한다. 작은 모델은 객체 전체를 틀리기보다 필드 하나를 틀리고,
     * period 하나가 나빴다고 잘 써 준 본문을 버릴 이유는 없다.
     *
     * <p>package-private: 이 메서드가 이 기능에서 가장 잘 깨지는 부분이다.
     * {@code AutobiographyServiceTest}가 실제로 망가진 응답들로 때린다.
     */
    static AutobiographyDTO parse(String answer) {
        JsonNode node = JsonUtil.readObject(answer);
        if (node == null) return null;

        String content = JsonUtil.text(node, "content");
        String summary = JsonUtil.text(node, "summary");

        // CONTENT는 NOT NULL이다. 본문이 없으면 요약이라도 본문으로 쓴다 — 요약만 있는 답도
        // 그 하루들이 있었다는 기록으로는 남는다. 둘 다 없으면 저장할 것이 없다.
        if (content == null) content = summary;
        if (content == null) return null;

        String title = JsonUtil.text(node, "title");
        if (title == null) title = summary;
        if (title == null) title = "이름 없는 장";

        AutobiographyDTO result = new AutobiographyDTO();
        result.setTitle(JsonUtil.clip(title, MAX_TITLE_LENGTH));
        result.setPeriod(JsonUtil.clip(JsonUtil.text(node, "period"), MAX_PERIOD_LENGTH));
        result.setSummary(JsonUtil.clip(summary, MAX_SUMMARY_LENGTH));
        result.setContent(content);

        // status는 모델에서 읽지 않는다. 다 됐는지는 그 삶을 산 사람이 정한다.
        result.setStatus(AutobiographyDTO.Status.DRAFT);

        return result;
    }
}
