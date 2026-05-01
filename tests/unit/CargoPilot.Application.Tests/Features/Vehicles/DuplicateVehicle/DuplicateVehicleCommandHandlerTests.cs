using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Vehicles.DuplicateVehicle;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;
using FluentValidation;
using NSubstitute;
using FvValidationFailure = FluentValidation.Results.ValidationFailure;
using FvValidationResult = FluentValidation.Results.ValidationResult;

namespace CargoPilot.Application.Tests.Features.Vehicles.DuplicateVehicle;

public sealed class DuplicateVehicleCommandHandlerTests {
    private readonly IVehicleRepository _repository;
    private readonly IValidator<DuplicateVehicleCommand> _validator;
    private readonly DuplicateVehicleCommandHandler _handler;

    public DuplicateVehicleCommandHandlerTests() {
        _repository = Substitute.For<IVehicleRepository>();
        _validator = Substitute.For<IValidator<DuplicateVehicleCommand>>();
        _handler = new DuplicateVehicleCommandHandler(_repository, _validator);

        // Varsayılan: validation geçer
        _validator
            .ValidateAsync(Arg.Any<DuplicateVehicleCommand>(), Arg.Any<CancellationToken>())
            .Returns(new FvValidationResult());
    }

    // ------------------------------------------------------------------ //
    //  Happy path
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Handle_ValidRequest_ReturnsSuccessWithNewGuid() {
        var source = BuildSourceVehicle();
        var command = new DuplicateVehicleCommand(source.Id, "Kopya Araç", "34-KPY-001");

        _repository.GetByIdAsync(source.Id, Arg.Any<CancellationToken>()).Returns(source);
        _repository.ExistsByPlateNumberAsync("34-KPY-001", source.CompanyId, Arg.Any<CancellationToken>()).Returns(false);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data.Should().NotBeEmpty();
        result.Data.Should().NotBe(source.Id);
    }

    [Fact]
    public async Task Handle_ValidRequest_SavesNewVehicleToRepository() {
        var source = BuildSourceVehicle();
        var command = new DuplicateVehicleCommand(source.Id, "Kopya Araç", "34-KPY-001");

        _repository.GetByIdAsync(source.Id, Arg.Any<CancellationToken>()).Returns(source);
        _repository.ExistsByPlateNumberAsync("34-KPY-001", source.CompanyId, Arg.Any<CancellationToken>()).Returns(false);

        await _handler.Handle(command, CancellationToken.None);

        _repository.Received(1).Add(Arg.Any<Vehicle>());
        await _repository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ValidRequest_CopiesAllPhysicalPropertiesFromSource() {
        var source = BuildSourceVehicleWithAxles();
        var command = new DuplicateVehicleCommand(source.Id, "Kopya Araç", "34-KPY-001");

        _repository.GetByIdAsync(source.Id, Arg.Any<CancellationToken>()).Returns(source);
        _repository.ExistsByPlateNumberAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>()).Returns(false);

        Vehicle? capturedVehicle = null;
        _repository.When(r => r.Add(Arg.Any<Vehicle>()))
                   .Do(ci => capturedVehicle = ci.Arg<Vehicle>());

        await _handler.Handle(command, CancellationToken.None);

        capturedVehicle.Should().NotBeNull();
        capturedVehicle!.VehicleName.Should().Be("Kopya Araç");
        capturedVehicle.PlateNumber.Should().Be("34-KPY-001");
        capturedVehicle.VehicleType.Should().Be(source.VehicleType);
        capturedVehicle.InternalWidth.Should().Be(source.InternalWidth);
        capturedVehicle.InternalHeight.Should().Be(source.InternalHeight);
        capturedVehicle.InternalLength.Should().Be(source.InternalLength);
        capturedVehicle.MaxWeightCapacity.Should().Be(source.MaxWeightCapacity);
        capturedVehicle.LayerCount.Should().Be(source.LayerCount);
        capturedVehicle.LoadingType.Should().Be(source.LoadingType);
        capturedVehicle.CompanyId.Should().Be(source.CompanyId);
        capturedVehicle.KingPinDistanceMm.Should().Be(source.KingPinDistanceMm);
        capturedVehicle.KingPinTareWeightKg.Should().Be(source.KingPinTareWeightKg);
        capturedVehicle.KingPinMaxLoadKg.Should().Be(source.KingPinMaxLoadKg);
        capturedVehicle.MainAxleDistanceMm.Should().Be(source.MainAxleDistanceMm);
        capturedVehicle.MainAxleTareWeightKg.Should().Be(source.MainAxleTareWeightKg);
        capturedVehicle.MainAxleMaxLoadKg.Should().Be(source.MainAxleMaxLoadKg);
        capturedVehicle.AdditionalAxleDistanceMm.Should().Be(source.AdditionalAxleDistanceMm);
        capturedVehicle.AdditionalAxleTareWeightKg.Should().Be(source.AdditionalAxleTareWeightKg);
        capturedVehicle.AdditionalAxleMaxLoadKg.Should().Be(source.AdditionalAxleMaxLoadKg);
    }

    // ------------------------------------------------------------------ //
    //  NotFound
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Handle_SourceVehicleNotFound_ReturnsNotFoundError() {
        var command = new DuplicateVehicleCommand(Guid.NewGuid(), "Kopya", "34-X-001");
        _repository.GetByIdAsync(command.Id, Arg.Any<CancellationToken>()).Returns((Vehicle?)null);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Vehicle.NotFound");
    }

    [Fact]
    public async Task Handle_SourceVehicleNotFound_DoesNotPersist() {
        var command = new DuplicateVehicleCommand(Guid.NewGuid(), "Kopya", "34-X-001");
        _repository.GetByIdAsync(command.Id, Arg.Any<CancellationToken>()).Returns((Vehicle?)null);

        await _handler.Handle(command, CancellationToken.None);

        _repository.DidNotReceive().Add(Arg.Any<Vehicle>());
        await _repository.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    // ------------------------------------------------------------------ //
    //  Conflict — plate taken
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Handle_PlateNumberAlreadyExists_ReturnsConflictError() {
        var source = BuildSourceVehicle();
        var command = new DuplicateVehicleCommand(source.Id, "Kopya", "34-EXISTING-01");

        _repository.GetByIdAsync(source.Id, Arg.Any<CancellationToken>()).Returns(source);
        _repository.ExistsByPlateNumberAsync("34-EXISTING-01", source.CompanyId, Arg.Any<CancellationToken>()).Returns(true);

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Vehicle.PlateNumberAlreadyExists");
    }

    [Fact]
    public async Task Handle_PlateNumberAlreadyExists_DoesNotPersist() {
        var source = BuildSourceVehicle();
        var command = new DuplicateVehicleCommand(source.Id, "Kopya", "34-EXISTING-01");

        _repository.GetByIdAsync(source.Id, Arg.Any<CancellationToken>()).Returns(source);
        _repository.ExistsByPlateNumberAsync(Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>()).Returns(true);

        await _handler.Handle(command, CancellationToken.None);

        _repository.DidNotReceive().Add(Arg.Any<Vehicle>());
        await _repository.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    // ------------------------------------------------------------------ //
    //  Validation failure
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Handle_ValidationFails_ReturnsValidationError() {
        var failures = new List<FvValidationFailure> {
            new("VehicleName", "Araç adı zorunludur.")
        };
        _validator
            .ValidateAsync(Arg.Any<DuplicateVehicleCommand>(), Arg.Any<CancellationToken>())
            .Returns(new FvValidationResult(failures));

        var command = new DuplicateVehicleCommand(Guid.NewGuid(), "", "34-KPY-001");

        var result = await _handler.Handle(command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Type.Should().Be(ErrorType.Validation);
        result.Error.Code.Should().Be("Validation.Failed");
    }

    [Fact]
    public async Task Handle_ValidationFails_DoesNotQueryRepository() {
        var failures = new List<FvValidationFailure> {
            new("VehicleName", "Araç adı zorunludur.")
        };
        _validator
            .ValidateAsync(Arg.Any<DuplicateVehicleCommand>(), Arg.Any<CancellationToken>())
            .Returns(new FvValidationResult(failures));

        var command = new DuplicateVehicleCommand(Guid.NewGuid(), "", "34-KPY-001");

        await _handler.Handle(command, CancellationToken.None);

        await _repository.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    // ------------------------------------------------------------------ //
    //  Helpers
    // ------------------------------------------------------------------ //

    private static Vehicle BuildSourceVehicle() =>
        new(
            id: Guid.NewGuid(),
            vehicleName: "Kaynak Araç",
            vehicleType: VehicleType.Trailer,
            plateNumber: "34-SRC-001",
            internalWidth: 2400,
            internalHeight: 2700,
            internalLength: 13600,
            maxWeightCapacity: 24000,
            layerCount: 1,
            loadingType: LoadingType.Rear,
            companyId: Guid.NewGuid());

    private static Vehicle BuildSourceVehicleWithAxles() =>
        new(
            id: Guid.NewGuid(),
            vehicleName: "Kaynak Araç (Akslar)",
            vehicleType: VehicleType.Trailer,
            plateNumber: "34-SRC-002",
            internalWidth: 2400,
            internalHeight: 2700,
            internalLength: 13600,
            maxWeightCapacity: 24000,
            kingPinDistanceMm: 7200,
            kingPinTareWeightKg: 7500,
            kingPinMaxLoadKg: 12000,
            mainAxleDistanceMm: 4500,
            mainAxleTareWeightKg: 4000,
            mainAxleMaxLoadKg: 11500,
            additionalAxleDistanceMm: 1300,
            additionalAxleTareWeightKg: 2000,
            additionalAxleMaxLoadKg: 8000,
            layerCount: 2,
            loadingType: LoadingType.SideBoth,
            companyId: Guid.NewGuid());
}
