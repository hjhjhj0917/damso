package hanium.damso.mapper;

import hanium.damso.dto.DiaryDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface IDiaryMapper {
    /** userId의 일기 전체. 최신 날짜부터. */
    List<DiaryDTO> selectList(DiaryDTO pDTO);

    DiaryDTO selectDiary(DiaryDTO pDTO);

    /** 하루 한 편 규칙 확인용. 대화에서 자동 생성할 때 그날 것이 이미 있는지 본다. */
    DiaryDTO selectByDate(DiaryDTO pDTO);

    int insertDiary(DiaryDTO pDTO);

    /** 소유자 조건이 UPDATE문 안에 들어 있다. 주인이 아니면 0. */
    int updateDiary(DiaryDTO pDTO);

    int insertTag(@Param("tagId") String tagId,
                  @Param("diaryId") String diaryId,
                  @Param("tag") String tag,
                  @Param("sortNo") int sortNo);

    int deleteTags(@Param("diaryId") String diaryId);
}
