namespace CargoPilot.Application.Common.Models;

public class Result<T> {
    public bool IsSuccess { get; }
    public string Message { get; }
    public T? Data { get; }
    public Error? Error { get; }

    private Result(bool isSuccess, string message, T? data, Error? error) {
        IsSuccess = isSuccess;
        Message = message;
        Data = data;
        Error = error;
    }

    public static Result<T> Success(T data, string message = "Operation successful") =>
        new(true, message, data, null);

    public static Result<T> Failure(Error error) =>
        new(false, error.Description, default, error);
}
