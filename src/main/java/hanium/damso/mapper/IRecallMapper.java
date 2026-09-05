package hanium.damso.mapper;

import hanium.damso.dto.RecallDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface IRecallMapper {
    // ================= 키워드 =================

    List<RecallDTO> selectKeywords(@Param("userId") String userId);

    RecallDTO selectKeyword(RecallDTO pDTO);

    /**
     * 오늘 여쭤볼 것 하나. 최근 {@code coolDays}일 안에 물어본 것은 빼고, 가장 오래
     * 안 물어본 것부터 고른다. 후보가 없으면 null.
     */
    RecallDTO selectAskTarget(@Param("userId") String userId, @Param("coolDays") int coolDays);

    int countKeywords(@Param("userId") String userId);

    int insertKeyword(RecallDTO pDTO);

    int updateKeyword(RecallDTO pDTO);

    int deleteKeyword(RecallDTO pDTO);

    /** 실제로 여쭌 뒤에만 부른다. 회전 순서의 근거가 되는 값이다. */
    int touchAsked(@Param("keywordId") String keywordId);

    // ================= 검사 기록 =================

    int insertLog(RecallDTO.LogDTO pDTO);

    /** 이 방에서 답을 기다리는 검사. {@code ttlMinutes}를 넘긴 것은 돌려주지 않는다. */
    RecallDTO.LogDTO selectPendingLog(@Param("roomId") String roomId,
                                      @Param("ttlMinutes") int ttlMinutes);

    /** ASKED인 행에만 결과를 쓴다 — 이미 채점된 것을 덮어쓰지 않는다. */
    int gradeLog(@Param("logId") String logId,
                 @Param("result") String result,
                 @Param("answerMessageId") String answerMessageId);

    /** 오늘 이 사람에게 던진 질문 수. 하루 한 번 제한의 근거. */
    int countAskedToday(@Param("userId") String userId);

    // ================= 집계 =================

    RecallDTO.ReportDTO selectSummary(RecallDTO.QueryDTO pDTO);

    List<RecallDTO.BucketDTO> selectBuckets(@Param("q") RecallDTO.QueryDTO pDTO,
                                            @Param("unit") String unit);
}
