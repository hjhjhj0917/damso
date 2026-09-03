package hanium.damso.util;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 모델이 돌려준 글에서 JSON을 캐내고, 필드를 한 개씩 방어적으로 읽는다.
 *
 * <p>여기 있는 것은 편의 함수가 아니라 방어선이다. {@code response_format}으로 JSON을 요청해도
 * 모델은 코드 펜스에 싸거나 "물론이죠!"를 앞에 붙이거나, 있어야 할 필드를 빠뜨리거나, 배열로
 * 달라고 한 것을 쉼표 문자열로 준다. 작은 모델일수록 <b>객체 전체를 틀리기보다 필드 하나를
 * 틀린다.</b> 그래서 필드마다 따로 방어한다 — 태그 하나가 나빴다고 잘 써 준 본문을 버리면 안 된다.
 *
 * <p>전부 package-private이 아니라 public static인 이유: 일기 생성기와 자서전 생성기가 함께 쓰고,
 * 두 곳에 같은 파싱을 베껴 두면 한쪽만 고쳐지는 날이 온다.
 */
public final class JsonUtil {
    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private JsonUtil() {
    }

    /**
     * 모델의 답에서 JSON 객체를 읽는다. 객체가 아니면 null.
     *
     * <p>가장 바깥 중괄호를 잡는다({@code indexOf('{')} ~ {@code lastIndexOf('}')}).
     * 첫 번째 닫는 괄호로 자르면 중첩 객체가 있는 답이 통째로 깨진다.
     */
    public static JsonNode readObject(String answer) {
        if (answer == null) return null;

        int start = answer.indexOf('{');
        int end = answer.lastIndexOf('}');
        if (start < 0 || end <= start) return null;

        try {
            JsonNode node = MAPPER.readTree(answer.substring(start, end + 1));
            return node != null && node.isObject() ? node : null;
        } catch (Exception e) {
            return null;
        }
    }

    /** 문자열 필드. 없거나 문자열이 아니거나 비어 있으면 null. 절대 던지지 않는다. */
    public static String text(JsonNode node, String field) {
        if (node == null) return null;

        JsonNode value = node.get(field);
        if (value == null || !value.isTextual()) return null;

        String result = value.asString().trim();
        return result.isEmpty() ? null : result;
    }

    /**
     * 문자열 목록 필드.
     *
     * <p>배열로도 받고 쉼표로 이은 한 줄로도 받는다. 배열로 달라고 프롬프트에 적어도 모델은
     * 절반쯤 문자열로 준다. 둘 다 받는 편이 답을 버리는 것보다 낫다.
     */
    public static List<String> strings(JsonNode node, String field, int max) {
        if (node == null) return null;

        JsonNode value = node.get(field);
        if (value == null) return null;

        List<String> raw = new ArrayList<>();
        if (value.isArray()) {
            for (JsonNode item : value) {
                if (item != null && item.isTextual()) raw.add(item.asString());
            }
        } else if (value.isTextual()) {
            raw.addAll(Arrays.asList(value.asString().split(",")));
        } else {
            return null;
        }

        List<String> result = new ArrayList<>();
        for (String item : raw) {
            String trimmed = item == null ? "" : item.trim();
            // 모델이 붙여 보내는 #은 저장하지 않는다. 붙이는 것은 화면의 일이다.
            while (trimmed.startsWith("#")) trimmed = trimmed.substring(1).trim();
            if (trimmed.isEmpty() || result.contains(trimmed)) continue;
            result.add(trimmed);
            if (result.size() >= max) break;
        }

        return result;
    }

    /**
     * 컬럼 폭에 맞춰 자른다.
     *
     * <p>sql_mode에 STRICT_TRANS_TABLES가 있어, 넘긴 값은 잘리는 게 아니라 INSERT가 통째로
     * 실패한다. 잘 만들어진 생성 결과 하나가 'Data too long for column' 한 줄로 사라진다.
     */
    public static String clip(String value, int max) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }
}
