package hanium.damso.controller;

import hanium.damso.dto.ChatDTO;
import hanium.damso.dto.ResultDTO;
import hanium.damso.service.IChatService;
import hanium.damso.service.ServiceUnavailableException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * AI 파트너 도담과의 대화.
 *
 * <p>프론트 {@code ChatView}의 {@code setTimeout(550)} 가짜 응답과 {@code ansimChatThreads}
 * localStorage 키를 대체한다.
 *
 * <p><b>대화방은 본인만 볼 수 있다. 연결된 보호자에게도 열지 않는다.</b> 다른 화면과 다른 규칙이라
 * {@code linkService}를 아예 주입받지 않는다 — 주입해 두면 언젠가 누가 "일관성 있게" canView를
 * 부르고, 그 순간 화면에 적힌 약속("대화 내용은 안전하게 보호되며, 데일리노트 작성에만
 * 사용됩니다")이 깨진다.
 */
@Slf4j
@RequestMapping(value = "/api/chat")
@RequiredArgsConstructor
@RestController
public class ChatController {
    private final IChatService chatService;

    /** 방 주인이면 방을, 아니면 null. 모든 방 단위 엔드포인트가 이걸로 시작한다. */
    private ChatDTO ownedRoom(String roomId, String userId) throws Exception {
        ChatDTO room = chatService.getRoom(roomId);
        if (room == null || !userId.equals(room.getUserId())) return null;
        return room;
    }

    @GetMapping(value = "list")
    public ResultDTO<List<ChatDTO>> list(HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        try {
            return ResultDTO.success("QUERY_COMPLETE", chatService.getRoomList(userId));
        } catch (Exception e) {
            log.warn("chat list failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "create")
    public ResultDTO<ChatDTO> create(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        try {
            return ResultDTO.success("CREATE_COMPLETE",
                    chatService.createRoom(userId, request.getParameter("title")));
        } catch (Exception e) {
            log.warn("chat create failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @GetMapping(value = "messages")
    public ResultDTO<List<ChatDTO.MessageDTO>> messages(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String roomId = request.getParameter("roomId");
        if (roomId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            if (this.ownedRoom(roomId, userId) == null) return ResultDTO.error("INVALID_ACCESS");

            return ResultDTO.success("QUERY_COMPLETE", chatService.getMessages(roomId));
        } catch (Exception e) {
            log.warn("chat messages failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    /**
     * 한 턴을 주고받는다.
     *
     * <p>순서가 설계다. 발화를 <b>먼저 커밋</b>하고 모델을 부른다. 모델이 실패하면 에러 코드로
     * 답하되 {@code data.sent}에 그 발화를 실어 보낸다 — 화면은 어르신의 말을 지우지 않고
     * "답을 못 받았다"만 표시하면 된다. 늦게 답하는 것보다 나쁜 것은 사람이 한 말을 잃는 것이다.
     *
     * <p>그래서 이 메서드에는 트랜잭션이 없고, 서비스도 send와 requestReply를 나눠 두었다.
     */
    @PostMapping(value = "say")
    public ResultDTO<ChatDTO.TurnDTO> say(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String userName = (String) session.getAttribute("SESSION_USER_NAME");
        String roomId = request.getParameter("roomId");
        String message = request.getParameter("message");
        if (roomId == null || message == null) return ResultDTO.error("MISSING_PARAMETER");
        if (message.isBlank()) return ResultDTO.error("INVALID_PARAMETER");

        ChatDTO.MessageDTO sent;
        try {
            if (this.ownedRoom(roomId, userId) == null) return ResultDTO.error("INVALID_ACCESS");

            sent = chatService.send(roomId, message);
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (Exception e) {
            log.warn("chat send failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }

        // 여기부터는 무슨 일이 있어도 sent를 실어 보낸다.
        try {
            ChatDTO.MessageDTO reply = chatService.requestReply(roomId, userName);
            if (reply == null)
                return ResultDTO.error("GENERATION_FAILED", new ChatDTO.TurnDTO(sent, null));

            return ResultDTO.success("SEND_COMPLETE", new ChatDTO.TurnDTO(sent, reply));
        } catch (ServiceUnavailableException e) {
            // 모델을 아직 켜지 않았거나 키가 거절당했다. 사용자가 다시 눌러서 될 일이 아니다.
            log.warn("LLM not available: {}", e.getMessage());
            return ResultDTO.error("NOT_AVAILABLE", new ChatDTO.TurnDTO(sent, null));
        } catch (Exception e) {
            log.warn("chat reply failed", e);
            return ResultDTO.error("GENERATION_FAILED", new ChatDTO.TurnDTO(sent, null));
        }
    }

    @PostMapping(value = "rename")
    public ResultDTO<Void> rename(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String roomId = request.getParameter("roomId");
        String title = request.getParameter("title");
        if (roomId == null || title == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            if (chatService.renameRoom(roomId, userId, title) != 1) return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("UPDATE_COMPLETE");
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (Exception e) {
            log.warn("chat rename failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "delete")
    public ResultDTO<Void> delete(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String roomId = request.getParameter("roomId");
        if (roomId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            if (chatService.deleteRoom(roomId, userId) != 1) return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("DELETE_COMPLETE");
        } catch (Exception e) {
            log.warn("chat delete failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }
}
