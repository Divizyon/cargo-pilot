using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;
using ErpSettingsEntity = CargoPilot.Domain.Entities.ErpSettings;

namespace CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;

internal sealed class UpsertErpSettingsCommandHandler : IRequestHandler<UpsertErpSettingsCommand, Result<ErpSettingsResponse>>
{
    private readonly IErpSettingsRepository _repository;
    private readonly IErpPasswordProtector _passwordProtector;
    private readonly ICurrentUserService _currentUserService;

    public UpsertErpSettingsCommandHandler(
        IErpSettingsRepository repository,
        IErpPasswordProtector passwordProtector,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _passwordProtector = passwordProtector;
        _currentUserService = currentUserService;
    }

    public async Task<Result<ErpSettingsResponse>> Handle(UpsertErpSettingsCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<ErpSettingsResponse>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        var existing = await _repository.GetByCompanyIdAsync(companyId.Value, cancellationToken);

        if (existing is null)
        {
            if (string.IsNullOrWhiteSpace(request.Password))
                return Result<ErpSettingsResponse>.Failure(
                    new Error(ErrorType.Validation, "ErpSettings.PasswordRequired", "İlk kayıtta şifre zorunludur."));

            var encrypted = _passwordProtector.Protect(request.Password);
            var newSettings = new ErpSettingsEntity(
                Guid.NewGuid(),
                companyId.Value,
                request.ProviderType,
                request.CompanyCode,
                request.Username,
                encrypted,
                request.ServerAddress);

            _repository.Add(newSettings);
            await _repository.SaveChangesAsync(cancellationToken);

            return Result<ErpSettingsResponse>.Success(new ErpSettingsResponse(
                newSettings.Id,
                newSettings.ProviderType,
                newSettings.CompanyCode,
                newSettings.Username,
                newSettings.ServerAddress,
                true));
        }

        string? newEncryptedPassword = null;
        if (!string.IsNullOrWhiteSpace(request.Password))
            newEncryptedPassword = _passwordProtector.Protect(request.Password);

        existing.Update(
            request.ProviderType,
            request.CompanyCode,
            request.Username,
            request.ServerAddress,
            newEncryptedPassword);

        await _repository.SaveChangesAsync(cancellationToken);

        return Result<ErpSettingsResponse>.Success(new ErpSettingsResponse(
            existing.Id,
            existing.ProviderType,
            existing.CompanyCode,
            existing.Username,
            existing.ServerAddress,
            true));
    }
}
