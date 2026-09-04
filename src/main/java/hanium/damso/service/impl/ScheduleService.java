package hanium.damso.service.impl;

import hanium.damso.dto.ContentDTO;
import hanium.damso.dto.ScheduleDTO;
import hanium.damso.mapper.IScheduleMapper;
import hanium.damso.service.IContentService;
import hanium.damso.service.IScheduleService;
import hanium.damso.util.IdUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
@Service
public class ScheduleService implements IScheduleService {
    private final IScheduleMapper scheduleMapper;
    private final IContentService contentService;

    /** SCHEDULE.TITLE의 컬럼 폭. */
    static final int MAX_TITLE_LENGTH = 255;

    /** SCHEDULE.LOCATION의 컬럼 폭. 지도에서 고른 주소가 길어질 수 있다. */
    static final int MAX_LOCATION_LENGTH = 255;

    @Override
    public List<ScheduleDTO> getList(String userId, String from, String to) throws Exception {
        return scheduleMapper.selectList(userId, from, to);
    }

    @Override
    public ScheduleDTO getInfo(String scheduleId) throws Exception {
        if (scheduleId == null) return null;
        return scheduleMapper.selectSchedule(ScheduleDTO.of(scheduleId));
    }

    /** rollbackFor의 이유는 DiaryService.create 주석과 같다. */
    @Transactional(rollbackFor = Exception.class)
    @Override
    public ScheduleDTO create(ScheduleDTO pDTO) throws Exception {
        if (pDTO.getUserId() == null) throw new NullPointerException();
        if (pDTO.getTitle() == null || pDTO.getTitle().isBlank()) throw new IllegalArgumentException();
        if (pDTO.getDate() == null || pDTO.getTime() == null) throw new NullPointerException();

        pDTO.setTitle(clip(pDTO.getTitle(), MAX_TITLE_LENGTH));
        pDTO.setLocation(clip(pDTO.getLocation(), MAX_LOCATION_LENGTH));
        if (pDTO.getScheduleType() == null) pDTO.setScheduleType(ScheduleDTO.Type.PERSONAL);
        if (pDTO.getStatus() == null) pDTO.setStatus(ScheduleDTO.Status.SCHEDULED);

        pDTO.setContentId(contentService.create(pDTO.getUserId(), ContentDTO.Type.SCHEDULE));
        pDTO.setId(IdUtil.generate(IdUtil.SCHEDULE));

        scheduleMapper.insertSchedule(pDTO);

        return scheduleMapper.selectSchedule(ScheduleDTO.of(pDTO.getId()));
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int update(ScheduleDTO pDTO) throws Exception {
        if (pDTO.getId() == null || pDTO.getUserId() == null) throw new NullPointerException();

        pDTO.setTitle(clip(pDTO.getTitle(), MAX_TITLE_LENGTH));
        pDTO.setLocation(clip(pDTO.getLocation(), MAX_LOCATION_LENGTH));

        ScheduleDTO saved = scheduleMapper.selectSchedule(ScheduleDTO.of(pDTO.getId()));
        if (saved == null || !pDTO.getUserId().equals(saved.getUserId())) return 0;

        // <set>이 통째로 비면 SQL 문법 오류가 난다. 고칠 것이 없으면 문장을 보내지 않는다.
        boolean touchesAnything = pDTO.getTitle() != null || pDTO.getScheduleType() != null
                || pDTO.getContent() != null || pDTO.getLocation() != null
                || pDTO.getStatus() != null || pDTO.getDate() != null || pDTO.getTime() != null;
        if (!touchesAnything) return 0;

        int result = scheduleMapper.updateSchedule(pDTO);
        contentService.touch(saved.getContentId());

        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int complete(String scheduleId, String userId, boolean done) throws Exception {
        ScheduleDTO pDTO = ScheduleDTO.of(scheduleId);
        pDTO.setUserId(userId);
        pDTO.setStatus(done ? ScheduleDTO.Status.DONE : ScheduleDTO.Status.SCHEDULED);

        int result = scheduleMapper.updateStatus(pDTO);
        if (result > 0) {
            ScheduleDTO saved = scheduleMapper.selectSchedule(ScheduleDTO.of(scheduleId));
            if (saved != null) contentService.touch(saved.getContentId());
        }

        return result;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public int delete(String scheduleId, String userId) throws Exception {
        ScheduleDTO saved = scheduleMapper.selectSchedule(ScheduleDTO.of(scheduleId));
        if (saved == null) return 0;

        return contentService.delete(saved.getContentId(), userId);
    }

    static String clip(String value, int max) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }
}
