package hanium.damso.service;

/**
 * 이 배포판이 설정하지 않은 기능을 부탁받았을 때 던진다.
 *
 * <p>"고장 났다"와 "아직 켜지 않았다"를 가르는 것이 이 예외의 전부다. LLM 키가 없는 서버에서
 * 채팅을 부르면 그것은 장애가 아니라 설정이고, 사용자가 다시 시도해서 될 일도 아니다.
 * 컨트롤러가 이걸 잡아 {@code NOT_AVAILABLE}로 답하고, 진짜 실패는 {@code GENERATION_FAILED}로 간다.
 *
 * <p>unchecked인 이유: 호출자가 다룰 수 있는 상황이 아니라 배포 실수다. 서명마다 적게 하면
 * 정작 아무도 잡지 않는 예외 하나 때문에 모든 시그니처가 길어진다.
 *
 * <p><b>{@link IllegalArgumentException}을 상속하지 않는다.</b> 여러 컨트롤러가 그것을 먼저 잡아
 * {@code INVALID_PARAMETER}로 옮기는데, 그러면 어떤 요청으로도 맞출 수 없었던 일을 요청 탓으로
 * 돌리게 된다. 사용자는 자기가 뭘 잘못 썼는지 찾느라 시간을 버린다.
 */
public class ServiceUnavailableException extends RuntimeException {
    public ServiceUnavailableException(String message) {
        super(message);
    }
}
