using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Errors;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.CompanyManagement.UpdateCompanyUserStatus;

internal sealed class UpdateCompanyUserStatusCommandHandler
    : IRequestHandler<UpdateCompanyUserStatusCommand, Result<bool>>
{
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;

    public UpdateCompanyUserStatusCommandHandler(
        IUserRepository userRepository,
        ICurrentUserService currentUserService)
    {
        _userRepository = userRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<bool>> Handle(
        UpdateCompanyUserStatusCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUserService.CompanyId is not { } companyId)
            return Result<bool>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        var user = await _userRepository.GetByIdAsync(request.UserId, cancellationToken);
        if (user is null || user.CompanyId != companyId)
            return Result<bool>.Failure(CompanyErrors.UserNotFound);

        user.SetIsActive(request.IsActive);
        await _userRepository.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
