namespace CargoPilot.Application.Common.Models;

public enum ErrorType
{
    None = 0,
    Validation = 1,
    Unauthorized = 2,
    Forbidden = 3,
    NotFound = 4,
    Conflict = 5,
    BusinessRule = 6,
    RateLimit = 7,
    Unexpected = 8
}

public sealed record ValidationFailure(string Field, string Message);

public record Error(
    ErrorType Type,
    string Code,
    string Description,
    IReadOnlyList<ValidationFailure>? ValidationErrors = null)
{
    public static readonly Error None = new(ErrorType.None, string.Empty, string.Empty);
}
