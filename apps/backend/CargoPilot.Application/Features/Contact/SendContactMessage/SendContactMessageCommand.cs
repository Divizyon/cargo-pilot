using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Contact.SendContactMessage;

public sealed record SendContactMessageCommand(
    string Name,
    string Email,
    string Subject,
    string Message) : IRequest<Result<bool>>;
