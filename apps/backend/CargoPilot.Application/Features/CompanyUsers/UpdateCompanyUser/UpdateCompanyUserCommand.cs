using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.CompanyUsers.UpdateCompanyUser;

public sealed record UpdateCompanyUserCommand(
    Guid UserId,
    UserType? NewUserType,
    bool? IsActive) : IRequest<Result<Guid>>;
