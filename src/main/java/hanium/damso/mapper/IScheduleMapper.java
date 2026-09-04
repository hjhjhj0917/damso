package hanium.damso.mapper;

import hanium.damso.dto.ScheduleDTO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface IScheduleMapper {
    /**
     * from/to는 YYYY-MM-DD이고 선택이다. 둘 다 없으면 전부.
     *
     * <p>DTO에 담지 않고 @Param으로 받는 이유: 조회 범위는 일정 한 건의 속성이 아니다.
     * ScheduleDTO에 from/to 필드를 두면 저장되지 않는 필드가 DTO에 섞여 INSERT문을 읽을 때
     * 헷갈린다.
     */
    List<ScheduleDTO> selectList(@Param("userId") String userId,
                                 @Param("from") String from,
                                 @Param("to") String to);

    ScheduleDTO selectSchedule(ScheduleDTO pDTO);

    int insertSchedule(ScheduleDTO pDTO);

    /** 소유자 조건이 UPDATE문 안에 있다. 주인이 아니면 0. */
    int updateSchedule(ScheduleDTO pDTO);

    int updateStatus(ScheduleDTO pDTO);
}
