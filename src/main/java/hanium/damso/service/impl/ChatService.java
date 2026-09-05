package hanium.damso.service.impl;

import hanium.damso.dto.ChatDTO;
import hanium.damso.dto.ContentDTO;
import hanium.damso.dto.LLMDTO;
import hanium.damso.dto.RecallDTO;
import hanium.damso.mapper.IChatMapper;
import hanium.damso.service.IChatService;
import hanium.damso.service.IContentService;
import hanium.damso.service.ILLMService;
import hanium.damso.service.IRecallService;
import hanium.damso.util.IdUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Slf4j
@RequiredArgsConstructor
@Service
public class ChatService implements IChatService {
    private final IChatMapper chatMapper;
    private final IContentService contentService;
    private final ILLMService llmService;
    private final IRecallService recallService;

    @Value("${damso.llm.prompt}")
    private String LLM_PROMPT;

    /**
     * 모델에 넘기는 최근 대화 수.
     *
     * <p>방은 지우기 전까지 영원히 남으므로 "전부"는 무한히 자란다. 턴이 늘수록 요청 비용과
     * 지연이 함께 오르고, 결국 컨텍스트 창을 넘겨 기능이 아예 멈춘다. 30턴이면 한 번의
     * 대화 자리에서 오간 이야기를 대체로 담는다.
     */
    static final int LLM_HISTORY_TURNS = 30;

    /** CHAT_ROOM.TITLE의 컬럼 폭. */
    static final int MAX_TITLE_LENGTH = 255;

    private static final String DEFAULT_ROOM_TITLE = "오늘의 대화";

    /**
     * 도담의 시스템 프롬프트.
     *
     * <p>규칙 하나하나가 이 서비스의 대상 때문에 있다. 짧게 답하라는 것은 어르신이 긴 글을
     * 읽기 힘들어서고, 질문을 한 번에 하나만 하라는 것은 여러 개를 받으면 대답을 포기하기
     * 때문이다. 진단하지 말라는 것이 가장 중요하다 — 이 서비스는 의료기기가 아니고,
     * 모델이 병명을 말하는 순간 사람이 병원에 가는 대신 그 말을 믿는다.
     */
    private static final String DEFAULT_LLM_PROMPT = """
            당신의 이름은 '도담'이며, 어르신의 이야기를 들어 드리는 말벗입니다.
            당신은 언제나 정중한 존댓말을 쓰고, 재촉하지 않으며, 어르신이 하신 말씀을 먼저 받아 준 뒤에 이야기를 이어 갑니다.
            답변은 두세 문장으로 짧게 하고, 마지막에 오늘 하루에 대해 더 여쭙는 부드러운 질문을 하나만 덧붙이세요. 질문을 여러 개 한꺼번에 하지 마세요.
            당신은 의사가 아닙니다. 어르신이 편찮으시다고 하면 걱정을 전하고 병원에 가 보시기를 권할 수는 있지만, 병명을 말하거나 약을 권하거나 진단을 내려서는 절대 안 됩니다.
            어르신이 말씀하지 않은 일을 지어내서 말하지 마세요. 기억나지 않는 것은 다시 여쭤보세요.
            반드시 한국어로만 답하고, Markdown, 표, 이모지, 영어 단어를 쓰지 마세요. 문장과 문장 부호만 씁니다.
            어르신을 {username}님이라고 부르며 대화하세요.
            """;

    @Override
    public List<ChatDTO> getRoomList(String userId) throws Exception {
        return chatMapper.selectRoomList(userId);
    }

    @Override
    public ChatDTO getRoom(String roomId) throws Exception {
        if (roomId == null) return null;
        return chatMapper.selectRoom(ChatDTO.of(roomId));
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public ChatDTO createRoom(String userId, String title) throws Exception {
        if (userId == null) throw new NullPointerException();

        ChatDTO pDTO = new ChatDTO();
        pDTO.setUserId(userId);
        pDTO.setTitle(clip(title == null || title.isBlank() ? DEFAULT_ROOM_TITLE : title));
        pDTO.setContentId(contentService.create(userId, ContentDTO.Type.CHAT_ROOM));
        pDTO.setId(IdUtil.generate(IdUtil.CHAT_ROOM));

        chatMapper.insertRoom(pDTO);

        return chatMapper.selectRoom(ChatDTO.of(pDTO.getId()));
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int renameRoom(String roomId, String userId, String title) throws Exception {
        if (title == null || title.isBlank()) throw new IllegalArgumentException();

        ChatDTO pDTO = ChatDTO.of(roomId);
        pDTO.setUserId(userId);
        pDTO.setTitle(clip(title));

        return chatMapper.updateRoomTitle(pDTO);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int deleteRoom(String roomId, String userId) throws Exception {
        ChatDTO saved = chatMapper.selectRoom(ChatDTO.of(roomId));
        if (saved == null) return 0;

        return contentService.delete(saved.getContentId(), userId);
    }

    @Override
    public List<ChatDTO.MessageDTO> getMessages(String roomId) throws Exception {
        if (roomId == null) return List.of();
        return chatMapper.selectMessages(roomId);
    }

    @Override
    public List<ChatDTO.MessageDTO> getMessagesByDate(String userId, String date, String roomId)
            throws Exception {
        if (userId == null || date == null) return List.of();
        return chatMapper.selectMessagesByDate(userId, date, roomId);
    }

    /**
     * 사용자 발화를 저장한다.
     *
     * <p><b>@Transactional을 일부러 붙이지 않았다.</b> 문장이 하나라 걸 이유가 없기도 하지만,
     * 진짜 이유는 이 커밋이 뒤이은 모델 호출과 운명을 함께해서는 안 된다는 것이다. 하나의
     * 트랜잭션 안에 두면 모델 실패의 롤백이 어르신이 방금 친 말까지 지운다.
     */
    @Override
    public ChatDTO.MessageDTO send(String roomId, String message) throws Exception {
        if (roomId == null) throw new NullPointerException();
        if (message == null || message.isBlank()) throw new IllegalArgumentException();

        ChatDTO.MessageDTO pDTO = new ChatDTO.MessageDTO();
        pDTO.setId(IdUtil.generate(IdUtil.MESSAGE));
        pDTO.setRoomId(roomId);
        pDTO.setSenderType(ChatDTO.MessageDTO.SenderType.USER);
        pDTO.setMessage(message.trim());

        chatMapper.insertMessage(pDTO);

        ChatDTO room = chatMapper.selectRoom(ChatDTO.of(roomId));
        if (room != null) contentService.touch(room.getContentId());

        return pDTO;
    }

    /**
     * 답을 만들어 저장한다.
     *
     * <p>여기에 기억 회상 확인이 얹혀 있다. 세 자리 모두 <b>대화를 방해하지 않는 것</b>이
     * 첫째 규칙이라, 검사 쪽에서 무슨 일이 나도 이 메서드는 평소처럼 답을 돌려준다.
     * {@code recallService}의 세 메서드가 예외를 밖으로 내보내지 않는 이유가 그것이다.
     */
    @Override
    public ChatDTO.MessageDTO requestReply(String roomId, String userId, String userName) throws Exception {
        List<ChatDTO.MessageDTO> recent = chatMapper.selectRecentMessages(roomId, LLM_HISTORY_TURNS);
        if (recent == null || recent.isEmpty()) return null;

        // 매퍼가 최신순으로 뽑아 준다. 모델에는 오래된 것부터 가야 한다.
        Collections.reverse(recent);

        // 지난 턴에 여쭌 것이 있으면, 방금 들어온 발화가 그 답이다. 채점은 답을 만들기 전에
        // 끝내 둔다 — 모델 호출이 실패해도 어르신의 대답은 이미 채점되어 있어야 한다.
        ChatDTO.MessageDTO last = recent.get(recent.size() - 1);
        if (last.getSenderType() == ChatDTO.MessageDTO.SenderType.USER)
            recallService.gradeIfPending(userId, roomId, last.getId(), last.getMessage());

        RecallDTO target = recallService.pickTarget(userId, recent.size());

        List<LLMDTO.MessageDTO> messages = new ArrayList<>();
        messages.add(new LLMDTO.MessageDTO("system", this.systemPrompt(userName, target)));
        for (ChatDTO.MessageDTO m : recent) {
            // 빈 어시스턴트 턴은 건너뛴다. 그대로 실어 보내면 다음 요청의 히스토리가 오염되고,
            // 모델이 그 침묵을 따라 하기 시작한다.
            if (m.getMessage() == null || m.getMessage().isBlank()) continue;
            String role = m.getSenderType() == ChatDTO.MessageDTO.SenderType.BOT ? "assistant" : "user";
            messages.add(new LLMDTO.MessageDTO(role, m.getMessage()));
        }

        // 산문 답변에는 response_format을 붙이지 않는다. 말벗은 JSON으로 말하지 않고,
        // 그 멤버를 구현하지 않은 서버는 무시가 아니라 400으로 답한다.
        String answer = llmService.complete(messages, null);
        if (answer == null || answer.isBlank()) return null;

        ChatDTO.MessageDTO rDTO = new ChatDTO.MessageDTO();
        rDTO.setId(IdUtil.generate(IdUtil.MESSAGE));
        rDTO.setRoomId(roomId);
        rDTO.setSenderType(ChatDTO.MessageDTO.SenderType.BOT);
        rDTO.setMessage(answer);

        chatMapper.insertMessage(rDTO);

        // 모델이 실제로 여쭈었을 때만 검사 한 건이 열린다. 여쭙지 않는 것도 모델의 자유다.
        recallService.noteAsked(userId, roomId, target, rDTO.getId(), answer);

        return rDTO;
    }

    /**
     * 시스템 프롬프트를 만든다.
     *
     * <p>{@code {username}} 치환은 <b>덮어쓴 프롬프트에도</b> 적용한다. 자리표시자가 없는 프롬프트에
     * 치환을 돌리는 것은 아무 일도 하지 않지만, 반대로 빠뜨리면 치환되지 않은 {@code {username}}이
     * 그대로 모델에 닿아 아무도 의도하지 않은 지시로 읽힌다.
     *
     * <p>프로퍼티가 "없음"이 아니라 "빈 문자열"인 것에 주의. {@code ${LLM_PROMPT:}}이므로
     * {@code @Value} 기본값에는 영영 닿지 않는다. 그래서 여기서 isBlank()로 본다.
     *
     * <p>회상 블록은 <b>덧붙이기만</b> 한다. {@code target}이 null이면 askBlock이 빈 문자열이라
     * 결과가 예전과 완전히 같다 — 키워드를 하나도 등록하지 않은 사람의 대화가 이 기능 때문에
     * 달라지는 일은 없어야 한다.
     */
    private String systemPrompt(String userName, RecallDTO target) {
        String template = (LLM_PROMPT == null || LLM_PROMPT.isBlank()) ? DEFAULT_LLM_PROMPT : LLM_PROMPT;

        return template.replace("{username}", userName == null || userName.isBlank() ? "어르신" : userName)
                + recallService.askBlock(target);
    }

    static String clip(String title) {
        if (title == null) return null;
        String trimmed = title.trim();
        return trimmed.length() <= MAX_TITLE_LENGTH ? trimmed : trimmed.substring(0, MAX_TITLE_LENGTH);
    }
}
