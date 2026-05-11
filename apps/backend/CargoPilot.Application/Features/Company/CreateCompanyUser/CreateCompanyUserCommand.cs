using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.CompanyManagement.GetCompanyUsers;
using MediatR;

namespace CargoPilot.Application.Features.CompanyManagement.CreateCompanyUser;

public sealed record CreateCompanyUserCommand(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string Role) : IRequest<Result<CompanyUserDto>>;
