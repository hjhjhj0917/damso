package hanium.damso.service;

import hanium.damso.dto.ScheduleDTO;

import java.util.List;

public interface IScheduleService {
    /** from/to는 YYYY-MM-DD, 둘 다 선택. */
    List<ScheduleDTO> getList(String userId, String from, String to) throws Exception;

    ScheduleDTO getInfo(String scheduleId) throws Exception;

    ScheduleDTO create(ScheduleDTO pDTO) throws Exception;

    int update(ScheduleDTO pDTO) throws Exception;

    int complete(String scheduleId, String userId, boolean done) throws Exception;

    int delete(String scheduleId, String userId) throws Exception;
}
