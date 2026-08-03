using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Me.GetMyProfile;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Me.UpdateMyProfile;

internal sealed class UpdateMyProfileCommandHandler
    : IRequestHandler<UpdateMyProfileCommand, Result<GetMyProfileResponse>>
{
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<UpdateMyProfileCommand> _validator;

    public UpdateMyProfileCommandHandler(
        IUserRepository userRepository,
        ICurrentUserService currentUserService,
        IValidator<UpdateMyProfileCommand> validator)
    {
        _userRepository = userRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<GetMyProfileResponse>> Handle(
        UpdateMyProfileCommand request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<GetMyProfileResponse>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        if (_currentUserService.UserId is not { } userId)
            return Result<GetMyProfileResponse>.Failure(
                new Error(ErrorType.Unauthorized, "AUTH_UNAUTHORIZED", "Kimlik doğrulaması gereklidir."));

        var user = await _userRepository.GetByIdWithCompanyAsync(userId, cancellationToken);
        if (user is null)
            return Result<GetMyProfileResponse>.Failure(
                new Error(ErrorType.NotFound, "USER_NOT_FOUND", "Kullanıcı bulunamadı."));

        if (!string.IsNullOrWhiteSpace(request.CompanyName))
        {
            if (user.UserType != UserType.CompanyAdmin)
                return Result<GetMyProfileResponse>.Failure(
                    new Error(ErrorType.Forbidden, "ME_COMPANY_UPDATE_FORBIDDEN", "Firma adını yalnızca CompanyAdmin güncelleyebilir."));

            if (user.Company is null)
                return Result<GetMyProfileResponse>.Failure(
                    new Error(ErrorType.NotFound, "ME_COMPANY_NOT_FOUND", "Kullanıcıya bağlı firma bulunamadı."));

            user.Company.UpdateName(request.CompanyName);
        }

        user.UpdateProfile(request.FirstName, request.LastName);

        await _userRepository.SaveChangesAsync(cancellationToken);

        return Result<GetMyProfileResponse>.Success(
            new GetMyProfileResponse(
                user.Id,
                user.FirstName,
                user.LastName,
                $"{user.FirstName} {user.LastName}",
                user.Email,
                user.Company?.Name,
                user.TourCompleted));
    }
}
