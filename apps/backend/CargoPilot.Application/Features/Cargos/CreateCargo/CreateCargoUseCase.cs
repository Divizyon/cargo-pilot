using CargoPilot.Application.Abstractions.Persistence;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using CargoPilot.Domain.ValueObjects;
using FluentValidation;

namespace CargoPilot.Application.Features.Cargos.CreateCargo;

public class CreateCargoUseCase
{
    private readonly ICargoRepository _cargoRepository;
    private readonly IValidator<CreateCargoRequest> _validator;

    public CreateCargoUseCase(ICargoRepository cargoRepository, IValidator<CreateCargoRequest> validator)
    {
        _cargoRepository = cargoRepository;
        _validator = validator;
    }

    public async Task<Result<CreateCargoResponse>> ExecuteAsync(CreateCargoRequest request, CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var message = string.Join("; ", validationResult.Errors.Select(e => e.ErrorMessage));
            return Result<CreateCargoResponse>.Failure(
                new Error(ErrorType.Validation, "ValidationError", message));
        }

        var trackingNumber = new TrackingNumber(request.TrackingNumber);
        var status = request.Status ?? CargoStatus.Created;
        var cargo = new Cargo(Guid.NewGuid(), trackingNumber, status);

        await _cargoRepository.AddAsync(cargo, cancellationToken);

        return Result<CreateCargoResponse>.Success(
            new CreateCargoResponse(cargo.Id, cargo.TrackingNumber.Value, cargo.Status));
    }
}
