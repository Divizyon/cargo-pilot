using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.PendingItemMappings;

public sealed class ApprovePendingItemMappingCommandHandler
    : IRequestHandler<ApprovePendingItemMappingCommand, Result<bool>>
{
    private readonly IPendingItemMappingRepository _repository;
    private readonly IIntegrationRepository _integrationRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<ApprovePendingItemMappingCommand> _validator;

    public ApprovePendingItemMappingCommandHandler(
        IPendingItemMappingRepository repository,
        IIntegrationRepository integrationRepository,
        IItemRepository itemRepository,
        ICurrentUserService currentUserService,
        IValidator<ApprovePendingItemMappingCommand> validator)
    {
        _repository = repository;
        _integrationRepository = integrationRepository;
        _itemRepository = itemRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<bool>> Handle(
        ApprovePendingItemMappingCommand request,
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

        var item = await _itemRepository.GetByIdAsync(request.CargoPilotItemId, companyId, cancellationToken);
        if (item is null)
        {
            return Result<bool>.Failure(
                new Error(ErrorType.NotFound, "Item.NotFound", "Ürün bulunamadı."));
        }

        mapping.Approve(request.CargoPilotItemId);
        _repository.Update(mapping);
        await _repository.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
