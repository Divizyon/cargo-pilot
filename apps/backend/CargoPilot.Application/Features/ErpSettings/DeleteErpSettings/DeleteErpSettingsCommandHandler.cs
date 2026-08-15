using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.ErpSettings.DeleteErpSettings;

internal sealed class DeleteErpSettingsCommandHandler : IRequestHandler<DeleteErpSettingsCommand, Result<bool>>
{
    private readonly IErpSettingsRepository _repository;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;

    public DeleteErpSettingsCommandHandler(
        IErpSettingsRepository repository,
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService)
    {
        _repository = repository;
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
    }

    public async Task<Result<bool>> Handle(DeleteErpSettingsCommand request, CancellationToken cancellationToken)
    {
        var companyId = _currentUserService.CompanyId;
        if (companyId is null)
            return Result<bool>.Failure(
                new Error(ErrorType.Unauthorized, "Auth.NoCompany", "Şirket bağlamı bulunamadı."));

        var settings = await _repository.GetByCompanyIdAsync(companyId.Value, cancellationToken);
        if (settings is null)
            return Result<bool>.Failure(
                new Error(ErrorType.NotFound, "ErpSettings.NotFound", "Kaldırılacak ERP bağlantısı bulunamadı."));

        // Kimlik bilgileri kalici olarak silinir; entegrasyon kaydi ise senkronizasyon
        // gecmisinin bagli kalmasi icin yalnizca pasiflestirilir.
        _repository.Remove(settings);

        var integrations = await _integrationRepository.ListTrackedByCompanyAsync(companyId.Value, cancellationToken);
        foreach (var integration in integrations)
            integration.MarkAsDeleted();

        await _repository.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true, "ERP bağlantısı kaldırıldı.");
    }
}
