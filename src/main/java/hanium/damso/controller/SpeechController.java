package hanium.damso.controller;

import hanium.damso.dto.ResultDTO;
import hanium.damso.dto.SpeechDTO;
import hanium.damso.service.ISpeechService;
import hanium.damso.service.ServiceUnavailableException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 말을 글로, 글을 말로.
 *
 * <p>대화방에 속하지 않는다. 전사와 합성은 어느 방의 것도 아니고, 나중에 데일리노트나 자서전을
 * 읽어 주는 화면이 생기면 그쪽도 같은 자리를 부른다. 그래서 {@code ChatController}에 얹지 않고
 * 따로 두었다 — 얹었다면 방 소유 검사와 무관한 엔드포인트가 방 검사를 하는 컨트롤러에 살게 된다.
 *
 * <p><b>셋 다 로그인을 요구한다.</b> 바깥 API에 돈이 나가는 자리라 익명 호출을 받지 않는다.
 */
@Slf4j
@RequestMapping(value = "/api/speech")
@RequiredArgsConstructor
@RestController
public class SpeechController {
    private final ISpeechService speechService;

    /**
     * 이 배포에서 음성이 켜져 있는가.
     *
     * <p>화면이 눌러도 늘 실패하는 버튼을 그리지 않게 하려는 것이다. 켜지지 않은 기능은 오류로
     * 알리는 것보다 아예 보이지 않는 편이 낫다.
     */
    @GetMapping(value = "config")
    public ResultDTO<SpeechDTO.StatusDTO> config(HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");

        return ResultDTO.success("QUERY_COMPLETE",
                new SpeechDTO.StatusDTO(speechService.isSttConfigured(), speechService.isTtsConfigured()));
    }

    /**
     * 녹음 한 덩어리를 글로 옮긴다.
     *
     * <p>{@code required = false}인 이유: 파일 없이 부르면 스프링이 자기 오류 페이지를 그리는데,
     * 그것은 {status, code, data} 봉투가 아니라서 화면에는 "파싱 실패"로 도착한다. 이름을 붙일 수
     * 있는 오류로 답하려면 여기까지 들어와야 한다.
     */
    @PostMapping(value = "transcribe")
    public ResultDTO<String> transcribe(@RequestParam(value = "file", required = false) MultipartFile file,
                                        HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResultDTO.error("INVALID_ACCESS");
        if (file == null || file.isEmpty()) return ResultDTO.error("INVALID_PARAMETER");

        try {
            String result = speechService.transcribe(file.getResource());

            // 빈 문자열도 성공이다. 버튼을 눌러 놓고 아무 말도 하지 않은 것은 실패가 아니다 —
            // 화면이 그때 "다시 한 번 말씀해 주세요"라고 안내한다.
            return ResultDTO.success("TRANSCRIPTION_COMPLETE", result == null ? "" : result);
        } catch (ServiceUnavailableException e) {
            // 아직 켜지 않았거나 키가 거절당했다. 다시 눌러서 될 일이 아니다.
            log.warn("STT not available: {}", e.getMessage());
            return ResultDTO.error("NOT_AVAILABLE");
        } catch (IllegalArgumentException e) {
            // 녹음이 상한을 넘었다. 기능은 멀쩡하고 이 요청이 컸을 뿐이라, 켜지지 않았다는 답을
            // 주면 안 된다.
            log.warn("transcription rejected: {}", e.getMessage());
            return ResultDTO.error("TRANSCRIPTION_FAILED");
        } catch (Exception e) {
            log.warn("transcription failed", e);
            return ResultDTO.error("TRANSCRIPTION_FAILED");
        }
    }

    /**
     * 글을 읽어 준다. 돌려주는 것은 봉투가 아니라 오디오다.
     *
     * <p>그래서 실패도 코드가 아니라 상태로 말한다. 401은 세션이 끊긴 것(화면이 다시 로그인시킬 수
     * 있다), 503은 위에 아무것도 없는 것(운영자가 켜야 한다), 502는 상류가 실패한 것(다시 눌러 볼
     * 만하다)이다.
     *
     * <p>글을 폼 파라미터로 받는 이유는 나머지 엔드포인트와 같다 —
     * {@code request.getParameter}로 읽는 서버와 폼 인코딩으로 보내는 화면이 이미 짝을 이룬다.
     */
    @PostMapping(value = "speak", produces = "audio/wav")
    public ResponseEntity<Resource> speak(HttpServletRequest request, HttpSession session) {
        String userId = (String) session.getAttribute("SESSION_USER_ID");
        if (userId == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();

        String text = request.getParameter("text");
        if (text == null || text.isBlank()) return ResponseEntity.badRequest().build();

        try {
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType("audio/wav"))
                    .body(speechService.synthesize(text));
        } catch (ServiceUnavailableException e) {
            // 502가 아니라 503이다. 상류가 실패한 것이 아니라 상류가 없다.
            log.warn("TTS not available: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        } catch (IllegalArgumentException e) {
            log.warn("speech rejected: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.warn("speech synthesis failed ({} chars)", text.length(), e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }
}
