using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using FluentValidation;
using MediatR;

namespace CargoPilot.Application.Features.Vehicles.SetVehicleStatus;

public sealed class SetVehicleStatusCommandHandler : IRequestHandler<SetVehicleStatusCommand, Result<Guid>> {
    private readonly IVehicleRepository _vehicleRepository;
    private readonly IValidator<SetVehicleStatusCommand> _validator;

    public SetVehicleStatusCommandHandler(
        IVehicleRepository vehicleRepository,
        IValidator<SetVehicleStatusCommand> validator) {
        _vehicleRepository = vehicleRepository;
        _validator = validator;
    }

    public async Task<Result<Guid>> Handle(SetVehicleStatusCommand request, CancellationToken cancellationToken) {
        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid) {
            var failures = validationResult.Errors
                .Select(e => new ValidationFailure(e.PropertyName, e.ErrorMessage))
                .ToList();
            return Result<Guid>.Failure(
                new Error(ErrorType.Validation, "Validation.Failed", "Doğrulama hatası.", failures));
        }

        var vehicle = await _vehicleRepository.GetByIdAsync(request.Id, cancellationToken);
        if (vehicle is null)
            return Result<Guid>.Failure(
                new Error(ErrorType.NotFound, "Vehicle.NotFound", "Araç bulunamadı."));

        vehicle.SetStatus(request.IsActive);
        await _vehicleRepository.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(vehicle.Id);
    }
}
