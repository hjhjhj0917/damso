package hanium.damso.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.ToString;

@Getter
@ToString
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ResultDTO<T> {
    public enum Status {
        success,
        error
    }

    private Status status;
    private String code;
    private T data;

    public static <T> ResultDTO<T> success(String code, T data) {
        return new ResultDTO<>(Status.success, code, data);
    }

    public static <T> ResultDTO<T> success(String code) {
        return success(code, null);
    }

    public static <T> ResultDTO<T> error(String code, T data) {
        return new ResultDTO<>(Status.error, code, data);
    }

    public static <T> ResultDTO<T> error(String code) {
        return error(code, null);
    }
}
