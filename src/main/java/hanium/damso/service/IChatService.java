package hanium.damso.service;

import hanium.damso.dto.ChatDTO;

import java.util.List;

/**
 * 도담과의 대화.
 */
public interface IChatService {
    List<ChatDTO> getRoomList(String userId) throws Exception;

    ChatDTO getRoom(String roomId) throws Exception;

    ChatDTO createRoom(String userId, String title) throws Exception;

    int renameRoom(String roomId, String userId, String title) throws Exception;

    int deleteRoom(String roomId, String userId) throws Exception;

    List<ChatDTO.MessageDTO> getMessages(String roomId) throws Exception;

    /** 그날 그 사람의 대화 전체. roomId가 null이면 그날의 모든 방. */
    List<ChatDTO.MessageDTO> getMessagesByDate(String userId, String date, String roomId) throws Exception;

    /** 사용자 발화를 저장하고 그 행을 돌려준다. 모델은 부르지 않는다. */
    ChatDTO.MessageDTO send(String roomId, String message) throws Exception;

    /**
     * 최근 대화를 모델에 넘겨 답을 받아 저장한다. 쓸 만한 답이 없으면 null.
     *
     * @throws ServiceUnavailableException 모델이 설정되지 않았거나 키가 거절당했을 때
     */
    ChatDTO.MessageDTO requestReply(String roomId, String userId, String userName) throws Exception;
}
