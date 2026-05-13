using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Integrations.GetSyncSettings;
using CargoPilot.Domain.Enums;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.UpdateSyncSettings;

internal sealed class UpdateSyncSettingsCommandHandler : IRequestHandler<UpdateSyncSettingsCommand, Result<SyncSettingsResponse>>
{
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<UpdateSyncSettingsCommand> _validator;

    public UpdateSyncSettingsCommandHandler(
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService,
        IValidator<UpdateSyncSettingsCommand> validator)
    {
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<SyncSettingsResponse>> Handle(UpdateSyncSettingsCommand request, CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<SyncSettingsResponse>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<SyncSettingsResponse>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId, companyId.Value, cancellationToken);

        if (integration is null)
            return Result<SyncSettingsResponse>.Failure(
                new Error(ErrorType.NotFound, "Integration.NotFound", "Entegrasyon bulunamadı."));

        DateTime? nextScheduledSyncAt = request.SyncFrequency.HasValue
            ? DateTime.UtcNow.Add(request.SyncFrequency.Value.ToTimeSpan())
            : null;

        integration.UpdateSyncSettings(request.SyncFrequency, nextScheduledSyncAt);
        await _integrationRepository.SaveChangesAsync(cancellationToken);

        return Result<SyncSettingsResponse>.Success(new SyncSettingsResponse(
            integration.Id,
            integration.SyncFrequency,
            integration.LastSyncDate,
            integration.NextScheduledSyncAt,
            integration.SyncStatus
        ));
    }
}
