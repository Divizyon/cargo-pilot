using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;
using ErpSettingsEntity = CargoPilot.Domain.Entities.ErpSettings;

namespace CargoPilot.Application.Features.ErpSettings.UpsertErpSettings;

public sealed class UpsertErpSettingsCommandHandler : IRequestHandler<UpsertErpSettingsCommand, Result<Guid>>
{
    private readonly IErpSettingsRepository _erpSettingsRepository;
    private readonly IErpEncryptionService _encryptionService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<UpsertErpSettingsCommand> _validator;

    public UpsertErpSettingsCommandHandler(
        IErpSettingsRepository erpSettingsRepository,
        IErpEncryptionService encryptionService,
        ICurrentUserService currentUserService,
        IValidator<UpsertErpSettingsCommand> validator)
    {
        _erpSettingsRepository = erpSettingsRepository;
        _encryptionService = encryptionService;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(UpsertErpSettingsCommand request, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.Forbidden, "ErpSettings.NoCompany", "Bu işlem için bir şirket üyeliği gereklidir."));

        var encryptedPassword = _encryptionService.Encrypt(request.Password);

        var existing = await _erpSettingsRepository.GetByCompanyIdAsync(companyId.Value, cancellationToken);

        if (existing is null)
        {
            var settings = new ErpSettingsEntity(
                id: Guid.NewGuid(),
                companyId: companyId.Value,
                companyCode: request.CompanyCode,
                username: request.Username,
                serverAddress: request.ServerAddress,
                encryptedPassword: encryptedPassword,
                provider: request.Provider);

            _erpSettingsRepository.Add(settings);
            await _erpSettingsRepository.SaveChangesAsync(cancellationToken);
            return Result<Guid>.Success(settings.Id);
        }

        existing.Update(
            request.CompanyCode,
            request.Username,
            request.ServerAddress,
            encryptedPassword,
            request.Provider);

        _erpSettingsRepository.Update(existing);
        await _erpSettingsRepository.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(existing.Id);
    }
}
