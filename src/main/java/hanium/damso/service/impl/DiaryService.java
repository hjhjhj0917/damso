package hanium.damso.service.impl;

import hanium.damso.dto.ChatDTO;
import hanium.damso.dto.ContentDTO;
import hanium.damso.dto.DiaryDTO;
import hanium.damso.dto.LLMDTO;
import hanium.damso.mapper.IDiaryCommentMapper;
import hanium.damso.mapper.IDiaryMapper;
import hanium.damso.service.IChatService;
import hanium.damso.service.IContentService;
import hanium.damso.service.IDiaryService;
import hanium.damso.service.ILLMService;
import hanium.damso.service.ILinkService;
import hanium.damso.util.IdUtil;
import hanium.damso.util.JsonUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
@Service
public class DiaryService implements IDiaryService {
    private final IDiaryMapper diaryMapper;
    private final IDiaryCommentMapper commentMapper;
    private final IContentService contentService;
    private final ILinkService linkService;
    private final IChatService chatService;
    private final ILLMService llmService;

    @Value("${damso.llm.diary.prompt}")
    private String LLM_PROMPT;

    @Value("${damso.llm.diary.format}")
    private String LLM_FORMAT;

    /** DIARY.TITLE의 컬럼 폭. sql_mode가 STRICT_TRANS_TABLES라 넘기면 잘리는 게 아니라 INSERT가 실패한다. */
    static final int MAX_TITLE_LENGTH = 255;

    /** DIARY.MOOD의 컬럼 폭. */
    static final int MAX_MOOD_LENGTH = 20;

    /** DIARY.HEALTH의 컬럼 폭. */
    static final int MAX_HEALTH_LENGTH = 255;

    /** 한 편에 붙일 수 있는 태그 수. 화면이 한 줄에 보여 주는 만큼이고, 모델이 스무 개를 뱉는 것도 막는다. */
    static final int MAX_TAGS = 5;

    /**
     * 일기를 쓰기에 필요한 최소 발화 수(어르신 쪽만 센다).
     *
     * <p>"응", "그래" 두 마디로 하루를 요약하게 두면 모델은 거절하지 않고 지어낸다.
     * 그 지어낸 글이 보호자에게 그 사람의 하루로 전달된다.
     */
    static final int MIN_MESSAGES = 3;

    /** 모델에 넘기는 대화록의 글자 수 상한. */
    static final int MAX_SOURCE_CHARS = 12_000;

    /**
     * 대화를 일기로 옮기는 프롬프트.
     */
    private static final String DEFAULT_DIARY_PROMPT = """
            당신은 어르신이 오늘 나눈 대화를 읽고, 어르신을 대신해 그날의 일기를 써 드리는 사람입니다.
            아래에 '어르신:'과 '도담:'으로 표시된 대화가 시간 순서대로 주어집니다.
            일기는 오직 대화에 실제로 나온 내용만으로 써야 합니다. 대화에 없는 일, 없는 사람, 없는 장소를 지어내서 쓰면 절대 안 됩니다.
            어르신이 직접 쓰신 것처럼 '나는'으로 시작하는 1인칭의 담담한 한국어로, 세 문장에서 다섯 문장 사이로 쓰세요.
            {date}의 일기입니다.
            당신은 반드시 아래 형태의 JSON 객체 하나만 출력해야 합니다. 설명, 인사말, Markdown, 코드 블록을 앞뒤에 붙여서는 절대 안 됩니다.
            {"title": "제목", "content": "본문", "mood": "기분", "tags": ["태그"], "health": "건강 메모"}
            각 항목의 규칙입니다.
            - title: 그날을 한마디로 나타내는 20자 이내의 제목.
            - content: 일기 본문.
            - mood: 다음 중 하나만 고르세요 — 행복해요, 평온해요, 편안해요, 그리워요, 속상해요.
            - tags: 대화에 나온 주제를 나타내는 짧은 낱말 3개 이내. 예: ["산책", "친구"]. # 기호는 붙이지 마세요.
            - health: 몸 상태에 대한 언급을 한 줄로. 대화에 몸 이야기가 없었다면 "특이사항 없음"이라고 쓰세요.
            당신은 의사가 아닙니다. health에 병명을 적거나 진단을 내려서는 안 됩니다. 어르신이 말한 그대로만 옮기세요.
            모든 문장은 한국어로 쓰고, 이모지와 표는 쓰지 마세요.
            """;

    @Override
    public List<DiaryDTO> getList(String userId) throws Exception {
        DiaryDTO pDTO = new DiaryDTO();
        pDTO.setUserId(userId);

        return diaryMapper.selectList(pDTO);
    }

    @Override
    public DiaryDTO getInfo(String diaryId) throws Exception {
        if (diaryId == null) return null;
        return diaryMapper.selectDiary(DiaryDTO.of(diaryId));
    }

    @Override
    public DiaryDTO getByDate(String userId, String date) throws Exception {
        if (userId == null || date == null) return null;

        DiaryDTO pDTO = new DiaryDTO();
        pDTO.setUserId(userId);
        pDTO.setDate(date);

        return diaryMapper.selectByDate(pDTO);
    }

    /**
     * 마스터 행과 일기 행을 함께 만든다.
     *
     * <p>{@code rollbackFor = Exception.class}가 장식이 아니다. 이 코드베이스는 모든 서비스
     * 메서드가 {@code throws Exception}인데, Spring의 기본 롤백 규칙은 RuntimeException과 Error뿐이다.
     * 기본값 그대로 두면 두 INSERT 사이에서 checked 예외가 났을 때 마스터 행만 커밋된다.
     * 그렇게 남은 행은 모든 조회가 DIARY를 조인하느라 보이지도 않고, 삭제 경로도 닿지 못한다.
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public DiaryDTO create(DiaryDTO pDTO) throws Exception {
        if (pDTO.getUserId() == null) throw new NullPointerException();
        if (pDTO.getTitle() == null || pDTO.getTitle().isBlank()) throw new IllegalArgumentException();
        if (pDTO.getContent() == null || pDTO.getContent().isBlank()) throw new IllegalArgumentException();

        pDTO.setTitle(clip(pDTO.getTitle()));
        pDTO.setContentId(contentService.create(pDTO.getUserId(), ContentDTO.Type.DIARY));
        pDTO.setId(IdUtil.generate(IdUtil.DIARY));

        diaryMapper.insertDiary(pDTO);
        this.replaceTags(pDTO.getId(), pDTO.getTags());

        log.info("Diary created: {} by {}", pDTO.getId(), pDTO.getUserId());

        return diaryMapper.selectDiary(DiaryDTO.of(pDTO.getId()));
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int update(DiaryDTO pDTO) throws Exception {
        if (pDTO.getId() == null || pDTO.getUserId() == null) throw new NullPointerException();
        if (pDTO.getTitle() != null) pDTO.setTitle(clip(pDTO.getTitle()));

        // <set>이 통째로 비면 SQL 문법 오류가 난다. 본문 필드가 하나도 안 왔는데 태그만 온 경우가
        // 실제로 있으므로(태그만 고치기), UPDATE 자체를 건너뛰고 소유권은 따로 확인한다.
        boolean touchesBody = pDTO.getDate() != null || pDTO.getTitle() != null
                || pDTO.getContent() != null || pDTO.getMood() != null || pDTO.getHealth() != null;

        DiaryDTO saved = diaryMapper.selectDiary(DiaryDTO.of(pDTO.getId()));
        if (saved == null || !pDTO.getUserId().equals(saved.getUserId())) return 0;

        int result = touchesBody ? diaryMapper.updateDiary(pDTO) : 1;

        this.replaceTags(pDTO.getId(), pDTO.getTags());
        contentService.touch(saved.getContentId());

        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int delete(String diaryId, String userId) throws Exception {
        DiaryDTO saved = diaryMapper.selectDiary(DiaryDTO.of(diaryId));
        if (saved == null) return 0;

        // 자식 행은 남긴다. 지우는 것은 마스터의 플래그 하나뿐이고, 주인이 아니면 0이 돌아온다.
        return contentService.delete(saved.getContentId(), userId);
    }

    /**
     * 태그를 통째로 갈아 끼운다.
     *
     * <p>null은 "건드리지 말라"이고 빈 리스트는 "전부 지워라"다.
     */
    private void replaceTags(String diaryId, List<String> tags) throws Exception {
        if (diaryId == null || tags == null) return;

        diaryMapper.deleteTags(diaryId);

        int sortNo = 0;
        for (String tag : tags) {
            if (tag == null || tag.isBlank()) continue;
            if (sortNo >= MAX_TAGS) break;
            diaryMapper.insertTag(IdUtil.generate(IdUtil.TAG), diaryId, tag.trim(), sortNo);
            sortNo++;
        }
    }

    // ================= 대화로 쓰는 일기 =================

    /**
     * 그날의 대화를 읽어 일기를 쓴다.
     *
     * <p>이미 그날의 일기가 있으면 <b>덮어쓰지 않고 한 편을 더 만든다.</b>
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public DiaryDTO generate(String userId, String date, String roomId) throws Exception {
        List<ChatDTO.MessageDTO> messages = chatService.getMessagesByDate(userId, date, roomId);

        // 어르신이 실제로 한 말만 센다.
        long spoken = messages == null ? 0
                : messages.stream()
                .filter(m -> m.getSenderType() == ChatDTO.MessageDTO.SenderType.USER)
                .filter(m -> m.getMessage() != null && !m.getMessage().isBlank())
                .count();

        if (spoken < MIN_MESSAGES) {
            log.debug("Not enough conversation on {} for {}: {} turns", date, userId, spoken);
            throw new IllegalStateException("NOT_ENOUGH_SOURCE");
        }

        StringBuilder transcript = new StringBuilder();
        for (ChatDTO.MessageDTO m : messages) {
            if (m.getMessage() == null || m.getMessage().isBlank()) continue;
            String who = m.getSenderType() == ChatDTO.MessageDTO.SenderType.BOT ? "도담" : "어르신";
            transcript.append(who).append(": ").append(m.getMessage()).append('\n');
            if (transcript.length() >= MAX_SOURCE_CHARS) break;
        }

        List<LLMDTO.MessageDTO> prompt = List.of(
                new LLMDTO.MessageDTO("system", this.diaryPrompt(date)),
                new LLMDTO.MessageDTO("user", transcript.toString()));

        DiaryDTO parsed = parse(llmService.complete(prompt, LLM_FORMAT));
        if (parsed == null) {
            log.warn("Diary generation produced nothing usable for {} on {}", userId, date);
            return null;
        }

        parsed.setUserId(userId);
        parsed.setDate(date);

        log.info("Diary generated for {} on {} from {} turns", userId, date, spoken);

        return this.create(parsed);
    }

    private String diaryPrompt(String date) {
        String template = (LLM_PROMPT == null || LLM_PROMPT.isBlank()) ? DEFAULT_DIARY_PROMPT : LLM_PROMPT;

        return template.replace("{date}", date == null ? "오늘" : date);
    }

    /**
     * 모델의 답에서 일기 한 편을 읽어 낸다. 쓸 만한 것이 없으면 null.
     */
    static DiaryDTO parse(String answer) {
        JsonNode node = JsonUtil.readObject(answer);
        if (node == null) return null;

        String content = JsonUtil.text(node, "content");
        String title = JsonUtil.text(node, "title");

        // CONTENT는 NOT NULL이다. 본문이 없으면 저장할 것이 없다 — 제목만 남은 하루는 기록이 아니다.
        if (content == null) return null;
        if (title == null) title = "오늘의 이야기";

        DiaryDTO result = new DiaryDTO();
        result.setTitle(JsonUtil.clip(title, MAX_TITLE_LENGTH));
        result.setContent(content);
        result.setMood(JsonUtil.clip(JsonUtil.text(node, "mood"), MAX_MOOD_LENGTH));
        result.setHealth(JsonUtil.clip(JsonUtil.text(node, "health"), MAX_HEALTH_LENGTH));
        result.setTags(JsonUtil.strings(node, "tags", MAX_TAGS));

        return result;
    }

    // ================= 댓글 =================

    @Override
    public List<DiaryDTO.CommentDTO> getComments(String diaryId) throws Exception {
        if (diaryId == null) return List.of();
        return commentMapper.selectCommentList(diaryId);
    }

    /**
     * 댓글을 단다. <b>연결된 보호자만 쓸 수 있고 일기 주인 본인은 쓸 수 없다.</b>
     */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public DiaryDTO.CommentDTO addComment(String diaryId, String authorId, String content) throws Exception {
        if (content == null || content.isBlank()) throw new IllegalArgumentException();

        DiaryDTO diary = diaryMapper.selectDiary(DiaryDTO.of(diaryId));
        if (diary == null) return null;

        if (!linkService.canComment(diary.getUserId(), authorId)) throw new IllegalAccessException();

        DiaryDTO.CommentDTO pDTO = new DiaryDTO.CommentDTO();
        pDTO.setId(IdUtil.generate(IdUtil.COMMENT));
        pDTO.setDiaryId(diaryId);
        pDTO.setAuthorId(authorId);
        pDTO.setContent(content.trim());

        commentMapper.insertComment(pDTO);

        return commentMapper.selectComment(pDTO.getId());
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int updateComment(String commentId, String authorId, String content) throws Exception {
        if (content == null || content.isBlank()) throw new IllegalArgumentException();

        DiaryDTO.CommentDTO saved = commentMapper.selectComment(commentId);
        if (saved == null) return 0;

        // 연결이 끊긴 보호자는 남긴 댓글을 고칠 수 없다. 지난 글이 남는 것과, 지금도 쓸 수 있는
        // 것은 다른 문제다 — 연결이 끊겼다는 건 더 이상 그 사람의 기록에 관여하지 않는다는 뜻이다.
        DiaryDTO diary = diaryMapper.selectDiary(DiaryDTO.of(saved.getDiaryId()));
        if (diary == null) return 0;
        if (!linkService.canComment(diary.getUserId(), authorId)) return 0;

        return commentMapper.updateComment(commentId, authorId, content.trim());
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int deleteComment(String commentId, String userId) throws Exception {
        int result = commentMapper.deleteCommentByAuthor(commentId, userId);
        if (result > 0) return result;

        return commentMapper.deleteCommentByDiaryOwner(commentId, userId);
    }

    static String clip(String title) {
        if (title == null) return null;
        String trimmed = title.trim();
        return trimmed.length() <= MAX_TITLE_LENGTH ? trimmed : trimmed.substring(0, MAX_TITLE_LENGTH);
    }
}
