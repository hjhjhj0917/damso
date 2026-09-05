package hanium.damso.service;

import hanium.damso.dto.ScheduleDTO;

import java.util.List;

public interface IScheduleService {
    /** from/to는 YYYY-MM-DD, 둘 다 선택. */
    List<ScheduleDTO> getList(String userId, String from, String to) throws Exception;

    ScheduleDTO getInfo(String scheduleId) throws Exception;

    ScheduleDTO create(ScheduleDTO pDTO, String editorId) throws Exception;

    int update(ScheduleDTO pDTO, String editorId) throws Exception;

    int complete(String scheduleId, String editorId, boolean done) throws Exception;

    int delete(String scheduleId, String editorId) throws Exception;
}
