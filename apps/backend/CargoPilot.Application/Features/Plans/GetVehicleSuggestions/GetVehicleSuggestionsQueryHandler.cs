using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Plans.GetVehicleSuggestions;

public sealed class GetVehicleSuggestionsQueryHandler
    : IRequestHandler<GetVehicleSuggestionsQuery, Result<IReadOnlyList<VehicleSuggestionDto>>>
{
    private readonly IItemRepository _itemRepository;
    private readonly IVehicleRepository _vehicleRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<GetVehicleSuggestionsQuery> _validator;

    public GetVehicleSuggestionsQueryHandler(
        IItemRepository itemRepository,
        IVehicleRepository vehicleRepository,
        ICurrentUserService currentUserService,
        IValidator<GetVehicleSuggestionsQuery> validator)
    {
        _itemRepository = itemRepository;
        _vehicleRepository = vehicleRepository;
        _currentUserService = currentUserService;
        _validator = validator;
    }

    public async Task<Result<IReadOnlyList<VehicleSuggestionDto>>> Handle(
        GetVehicleSuggestionsQuery request,
        CancellationToken cancellationToken)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<IReadOnlyList<VehicleSuggestionDto>>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var companyId = _currentUserService.CompanyId;

        var requestedItemIds = request.Items.Select(i => i.ItemId).Distinct().ToList();
        var items = await _itemRepository.GetByIdsAsync(requestedItemIds, companyId, cancellationToken);

        var missingIds = requestedItemIds.Except(items.Select(i => i.Id)).ToList();
        if (missingIds.Count > 0)
        {
            var failures = missingIds
                .Select(id => new ValidationFailure("Items", $"Item bulunamadı: {id}"))
                .ToList();
            return Result<IReadOnlyList<VehicleSuggestionDto>>.Failure(
                new Error(ErrorType.NotFound, "Items.NotFound", "Bir veya daha fazla item bulunamadı.", failures));
        }

        var itemMap = items.ToDictionary(i => i.Id);

        var totalItemVolume = request.Items
            .Sum(r =>
            {
                var item = itemMap[r.ItemId];
                return item.Width * item.Height * item.Length * r.Quantity;
            });

        var totalItemWeight = request.Items
            .Sum(r => itemMap[r.ItemId].Weight * r.Quantity);

        var vehicles = await _vehicleRepository.GetAllActiveAsync(companyId, cancellationToken);

        var suggestions = vehicles
            .Select(v =>
            {
                var vehicleVolume = v.InternalWidth * v.InternalHeight * v.InternalLength;
                var rawFillRate = vehicleVolume > 0
                    ? Math.Round(totalItemVolume / vehicleVolume * 100m, 2)
                    : 0m;
                var canFitAll = rawFillRate <= 100m && totalItemWeight <= v.MaxWeightCapacity;
                return (
                    Dto: new VehicleSuggestionDto(v.Id, v.VehicleName, v.PlateNumber, v.VehicleType,
                        Math.Min(rawFillRate, 100m), canFitAll),
                    RawFillRate: rawFillRate,
                    CanFitAll: canFitAll
                );
            })
            .OrderByDescending(x => x.CanFitAll)
            .ThenByDescending(x => x.CanFitAll ? x.RawFillRate : -x.RawFillRate)
            .Select(x => x.Dto)
            .ToList();

        return Result<IReadOnlyList<VehicleSuggestionDto>>.Success(suggestions);
    }
}
