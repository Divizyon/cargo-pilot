using System.Reflection;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Common.Behaviors;

public sealed class ValidationBehavior<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(next);

        var failures = await CollectFailuresAsync(request, cancellationToken);
        if (failures.Count == 0)
        {
            return await next();
        }

        var error = new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures);
        return CreateFailureResponse(error);
    }

    private async Task<List<ValidationFailure>> CollectFailuresAsync(
        TRequest request,
        CancellationToken cancellationToken)
    {
        if (!validators.Any())
        {
            return [];
        }

        var context = new ValidationContext<TRequest>(request);
        var results = await Task.WhenAll(
            validators.Select(validator => validator.ValidateAsync(context, cancellationToken)));

        return [.. results
            .SelectMany(result => result.Errors)
            .Select(failure => new ValidationFailure(failure.PropertyName, failure.ErrorMessage))];
    }

    private static TResponse CreateFailureResponse(Error error)
    {
        var factory = typeof(TResponse).GetMethod(
            nameof(Result<object>.Failure),
            BindingFlags.Public | BindingFlags.Static,
            binder: null,
            types: [typeof(Error)],
            modifiers: null)
            ?? throw new InvalidOperationException(
                $"{typeof(TResponse).Name} tipi Result<T> sozlesmesini karsilamadigi icin dogrulama hatasi uretilemiyor.");

        return (TResponse)factory.Invoke(null, [error])!;
    }
}
