package hanium.damso.mapper;

import hanium.damso.dto.ChatDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface IChatMapper {
    List<ChatDTO> selectRoomList(@Param("userId") String userId);

    ChatDTO selectRoom(ChatDTO pDTO);

    int insertRoom(ChatDTO pDTO);

    /** 소유자 조건이 UPDATE문 안에 있다. */
    int updateRoomTitle(ChatDTO pDTO);

    int insertMessage(ChatDTO.MessageDTO pDTO);

    List<ChatDTO.MessageDTO> selectMessages(@Param("roomId") String roomId);

    /** LLM에 보낼 최근 대화. 최신순으로 limit개 — 뒤집는 것은 서비스가 한다. */
    List<ChatDTO.MessageDTO> selectRecentMessages(@Param("roomId") String roomId,
                                                  @Param("limit") int limit);

    /** 그날 어르신이 한 말. 일기 자동 생성이 읽는다. */
    List<ChatDTO.MessageDTO> selectMessagesByDate(@Param("userId") String userId,
                                                  @Param("date") String date,
                                                  @Param("roomId") String roomId);
}
