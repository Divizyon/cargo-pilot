using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.CompanyManagement.GetCompanyUsers;

internal sealed class GetCompanyUsersQueryHandler
    : IRequestHandler<GetCompanyUsersQuery, Result<IReadOnlyList<CompanyUserDto>>>
{
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;

    public GetCompanyUsersQueryHandler(
        IUserRepository userRepository,
        ICurrentUserService currentUserService)
    {
        _userRepository = userRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<IReadOnlyList<CompanyUserDto>>> Handle(
        GetCompanyUsersQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUserService.CompanyId is not { } companyId)
            return Result<IReadOnlyList<CompanyUserDto>>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        var users = await _userRepository.GetCompanyUsersAsync(companyId, cancellationToken);

        var dtos = users
            .Select(u => new CompanyUserDto(
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                u.UserType == UserType.CompanyAdmin ? "Admin" : "Operator",
                u.IsActive))
            .ToList();

        return Result<IReadOnlyList<CompanyUserDto>>.Success(dtos);
    }
}
