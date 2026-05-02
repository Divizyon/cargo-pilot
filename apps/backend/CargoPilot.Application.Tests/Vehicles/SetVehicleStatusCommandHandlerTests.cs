using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Vehicles.SetVehicleStatus;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentValidation;
using Moq;

namespace CargoPilot.Application.Tests.Vehicles;

public sealed class SetVehicleStatusCommandHandlerTests {
    private readonly Mock<IVehicleRepository> _repositoryMock = new();
    private readonly IValidator<SetVehicleStatusCommand> _validator = new SetVehicleStatusCommandValidator();

    private SetVehicleStatusCommandHandler CreateHandler() =>
        new(_repositoryMock.Object, _validator);

    private static Vehicle BuildActiveVehicle(Guid id) {
        var v = new Vehicle(id, "Test Araç", VehicleType.Trailer, "34ABC123",
            2400, 2700, 13600, 24000, 1, LoadingType.Rear, null);
        v.SetStatus(true);
        return v;
    }

    private static Vehicle BuildInactiveVehicle(Guid id) {
        var v = new Vehicle(id, "Test Araç", VehicleType.Trailer, "34ABC123",
            2400, 2700, 13600, 24000, 1, LoadingType.Rear, null);
        v.SetStatus(false);
        return v;
    }

    [Fact]
    public async Task Handle_ActiveVehicle_SetToInactive_IsActiveBecomesFalse() {
        var vehicleId = Guid.NewGuid();
        var vehicle = BuildActiveVehicle(vehicleId);
        Assert.True(vehicle.IsActive);

        _repositoryMock.Setup(r => r.GetByIdAsync(vehicleId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(vehicle);

        var result = await CreateHandler().Handle(
            new SetVehicleStatusCommand(vehicleId, IsActive: false),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(vehicle.IsActive);
        _repositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_InactiveVehicle_SetToActive_IsActiveBeccomesTrue() {
        var vehicleId = Guid.NewGuid();
        var vehicle = BuildInactiveVehicle(vehicleId);
        Assert.False(vehicle.IsActive);

        _repositoryMock.Setup(r => r.GetByIdAsync(vehicleId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(vehicle);

        var result = await CreateHandler().Handle(
            new SetVehicleStatusCommand(vehicleId, IsActive: true),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.True(vehicle.IsActive);
        _repositoryMock.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_VehicleNotFound_ReturnsNotFoundFailure() {
        _repositoryMock.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Vehicle?)null);

        var result = await CreateHandler().Handle(
            new SetVehicleStatusCommand(Guid.NewGuid(), IsActive: false),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.NotFound, result.Error!.Type);
    }

    [Fact]
    public async Task Handle_EmptyId_ReturnsValidationFailure() {
        var result = await CreateHandler().Handle(
            new SetVehicleStatusCommand(Guid.Empty, IsActive: false),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(ErrorType.Validation, result.Error!.Type);
        _repositoryMock.Verify(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
