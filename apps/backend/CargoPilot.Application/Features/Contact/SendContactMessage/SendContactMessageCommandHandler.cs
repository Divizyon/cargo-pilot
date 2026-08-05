using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Logging;

namespace CargoPilot.Application.Features.Contact.SendContactMessage;

internal sealed class SendContactMessageCommandHandler
    : IRequestHandler<SendContactMessageCommand, Result<bool>>
{
    private static readonly Action<ILogger, string, Exception?> LogAutoReplyFailed =
        LoggerMessage.Define<string>(
            LogLevel.Warning,
            new EventId(2001, nameof(LogAutoReplyFailed)),
            "İletişim formu otomatik yanıt gönderilemedi. Alıcı: {Email}");

    private readonly IEmailService _emailService;
    private readonly ILogger<SendContactMessageCommandHandler> _logger;

    public SendContactMessageCommandHandler(
        IEmailService emailService,
        IValidator<SendContactMessageCommand> validator,
        ILogger<SendContactMessageCommandHandler> logger)
    {
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<Result<bool>> Handle(
        SendContactMessageCommand request,
        CancellationToken cancellationToken)
    {
        await _emailService.SendContactNotificationEmailAsync(
            request.Name,
            request.Email,
            request.Subject,
            request.Message,
            cancellationToken);

        try
        {
            await _emailService.SendContactAutoReplyEmailAsync(
                request.Email,
                request.Name,
                cancellationToken);
        }
        catch (Exception ex)
        {
            LogAutoReplyFailed(_logger, request.Email, ex);
        }

        return Result<bool>.Success(true);
    }
}
