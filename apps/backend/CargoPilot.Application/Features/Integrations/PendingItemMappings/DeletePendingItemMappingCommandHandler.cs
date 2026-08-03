using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.PendingItemMappings;

public sealed class DeletePendingItemMappingCommandHandler
    : IRequestHandler<DeletePendingItemMappingCommand, Result<bool>>
{
    private readonly IPendingItemMappingRepository _repository;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<DeletePendingItemMappingCommand> _validator;

    public DeletePendingItemMappingCommandHandler(
        IPendingItemMappingRepository repository,
        IIntegrationRepository integrationRepository,
        ICurrentUserService currentUserService,
        IValidator<DeletePendingItemMappingCommand> validator)
    {
        _repository = repository;
        _integrationRepository = integrationRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<bool>> Handle(
        DeletePendingItemMappingCommand request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<bool>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var companyId = _currentUserService.CompanyId;

        var integration = await _integrationRepository.GetByIdAsync(request.IntegrationId, companyId, cancellationToken);
        if (integration is null)
        {
            return Result<bool>.Failure(
                new Error(ErrorType.NotFound, "Integration.NotFound", "Entegrasyon bulunamadı."));
        }

        var mapping = await _repository.GetByIdAsync(request.MappingId, request.IntegrationId, cancellationToken);
        if (mapping is null)
        {
            return Result<bool>.Failure(
                new Error(ErrorType.NotFound, "PendingItemMapping.NotFound", "Bekleyen eşleştirme bulunamadı."));
        }

        mapping.Dismiss();
        _repository.Update(mapping);
        await _repository.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
