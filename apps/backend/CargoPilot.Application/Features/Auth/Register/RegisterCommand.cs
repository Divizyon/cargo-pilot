using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Auth.Register;

public sealed record RegisterCommand(
    string FirstName,
    string LastName,
    string Email,
    string Password) : IRequest<Result<RegisterResponse>>;
