package hanium.damso.controller;

import hanium.damso.dto.ResultDTO;
import hanium.damso.dto.ScheduleDTO;
import hanium.damso.service.ILinkService;
import hanium.damso.service.IScheduleService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.regex.Pattern;

/**
 * 일정 캘린더.
 *
 * <p>일기와 같은 권한 구조다 — <b>읽기는 본인과 연결된 보호자, 쓰기는 본인만.</b>
 */
@Slf4j
@RequestMapping(value = "/api/schedule")
@RequiredArgsConstructor
@RestController
public class ScheduleController {
    private final IScheduleService scheduleService;
    private final ILinkService linkService;

    private static final Pattern DATE_PATTERN = Pattern.compile("^\\d{4}-\\d{2}-\\d{2}$");

    /** 프론트 <input type="time">이 보내는 모양. 초는 받지 않는다 — 일정에 초 단위는 의미가 없다. */
    private static final Pattern TIME_PATTERN = Pattern.compile("^([01]\\d|2[0-3]):[0-5]\\d$");

    @GetMapping(value = "list")
    public ResultDTO<List<ScheduleDTO>> list(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String userId = request.getParameter("userId");
        if (userId == null) userId = sessionUserId;

        if (!linkService.canView(userId, sessionUserId)) return ResultDTO.error("INVALID_ACCESS");

        String from = request.getParameter("from");
        String to = request.getParameter("to");
        if (from != null && !DATE_PATTERN.matcher(from).matches()) return ResultDTO.error("INVALID_PARAMETER");
        if (to != null && !DATE_PATTERN.matcher(to).matches()) return ResultDTO.error("INVALID_PARAMETER");

        try {
            return ResultDTO.success("QUERY_COMPLETE", scheduleService.getList(userId, from, to));
        } catch (Exception e) {
            log.warn("schedule list failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @GetMapping(value = "info")
    public ResultDTO<ScheduleDTO> info(HttpServletRequest request, HttpSession session) {
        String sessionUserId = (String) session.getAttribute("SESSION_USER_ID");
        if (sessionUserId == null) return ResultDTO.error("INVALID_ACCESS");

        String scheduleId = request.getParameter("scheduleId");
        if (scheduleId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            ScheduleDTO rDTO = scheduleService.getInfo(scheduleId);
            if (rDTO == null) return ResultDTO.error("NOT_FOUND");
            if (!linkService.canView(rDTO.getUserId(), sessionUserId))
                return ResultDTO.error("INVALID_ACCESS");

            return ResultDTO.success("QUERY_COMPLETE", rDTO);
        } catch (Exception e) {
            log.warn("schedule info failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "create")
    public ResultDTO<ScheduleDTO> create(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        ScheduleDTO pDTO = new ScheduleDTO();
        pDTO.setUserId(userId);
        pDTO.setTitle(request.getParameter("title"));

        String date = request.getParameter("date");
        String time = request.getParameter("time");
        if (pDTO.getTitle() == null || date == null || time == null)
            return ResultDTO.error("MISSING_PARAMETER");

        if (!DATE_PATTERN.matcher(date).matches()) return ResultDTO.error("INVALID_PARAMETER");
        if (!TIME_PATTERN.matcher(time).matches()) return ResultDTO.error("INVALID_PARAMETER");

        pDTO.setDate(date);
        pDTO.setTime(time);
        pDTO.setScheduleType(ScheduleDTO.Type.of(request.getParameter("scheduleType")));
        pDTO.setContent(request.getParameter("content"));
        pDTO.setLocation(request.getParameter("location"));

        try {
            return ResultDTO.success("CREATE_COMPLETE", scheduleService.create(pDTO));
        } catch (IllegalArgumentException e) {
            return ResultDTO.error("INVALID_PARAMETER");
        } catch (NullPointerException e) {
            return ResultDTO.error("MISSING_PARAMETER");
        } catch (Exception e) {
            log.warn("schedule create failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "update")
    public ResultDTO<Void> update(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String scheduleId = request.getParameter("scheduleId");
        if (scheduleId == null) return ResultDTO.error("MISSING_PARAMETER");

        ScheduleDTO pDTO = ScheduleDTO.of(scheduleId);
        pDTO.setUserId(userId);
        pDTO.setTitle(request.getParameter("title"));
        pDTO.setContent(request.getParameter("content"));
        pDTO.setLocation(request.getParameter("location"));

        String date = request.getParameter("date");
        String time = request.getParameter("time");
        if (date != null) {
            if (!DATE_PATTERN.matcher(date).matches()) return ResultDTO.error("INVALID_PARAMETER");
            pDTO.setDate(date);
        }
        if (time != null) {
            if (!TIME_PATTERN.matcher(time).matches()) return ResultDTO.error("INVALID_PARAMETER");
            pDTO.setTime(time);
        }

        String type = request.getParameter("scheduleType");
        if (type != null) pDTO.setScheduleType(ScheduleDTO.Type.of(type));

        String status = request.getParameter("status");
        if (status != null) pDTO.setStatus(ScheduleDTO.Status.of(status));

        try {
            if (scheduleService.update(pDTO) != 1) return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("UPDATE_COMPLETE");
        } catch (NullPointerException e) {
            return ResultDTO.error("MISSING_PARAMETER");
        } catch (Exception e) {
            log.warn("schedule update failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    /** 완료 표시. done=false로 되돌릴 수도 있다. */
    @PostMapping(value = "complete")
    public ResultDTO<Void> complete(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String scheduleId = request.getParameter("scheduleId");
        if (scheduleId == null) return ResultDTO.error("MISSING_PARAMETER");

        String done = request.getParameter("done");
        boolean value = done == null || Boolean.parseBoolean(done);

        try {
            if (scheduleService.complete(scheduleId, userId, value) != 1)
                return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("UPDATE_COMPLETE");
        } catch (Exception e) {
            log.warn("schedule complete failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }

    @PostMapping(value = "delete")
    public ResultDTO<Void> delete(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        String scheduleId = request.getParameter("scheduleId");
        if (scheduleId == null) return ResultDTO.error("MISSING_PARAMETER");

        try {
            if (scheduleService.delete(scheduleId, userId) != 1) return ResultDTO.error("NOT_FOUND");

            return ResultDTO.success("DELETE_COMPLETE");
        } catch (Exception e) {
            log.warn("schedule delete failed", e);
            return ResultDTO.error("UNKNOWN_ERROR");
        }
    }
}
