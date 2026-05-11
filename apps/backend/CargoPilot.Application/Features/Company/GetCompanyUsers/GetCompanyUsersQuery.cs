using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.CompanyManagement.GetCompanyUsers;

public sealed record GetCompanyUsersQuery : IRequest<Result<IReadOnlyList<CompanyUserDto>>>;
