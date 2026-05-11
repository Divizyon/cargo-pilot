using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.CompanyManagement.UpdateCompanyUserStatus;

public sealed record UpdateCompanyUserStatusCommand(Guid UserId, bool IsActive)
    : IRequest<Result<bool>>;
