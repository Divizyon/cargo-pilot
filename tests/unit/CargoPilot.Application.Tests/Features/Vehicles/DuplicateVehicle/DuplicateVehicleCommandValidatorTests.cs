using CargoPilot.Application.Features.Vehicles.DuplicateVehicle;
using FluentAssertions;

namespace CargoPilot.Application.Tests.Features.Vehicles.DuplicateVehicle;

public sealed class DuplicateVehicleCommandValidatorTests {
    private readonly DuplicateVehicleCommandValidator _validator = new();

    // ------------------------------------------------------------------ //
    //  Happy path
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Validate_ValidCommand_PassesWithNoErrors() {
        var command = new DuplicateVehicleCommand(Guid.NewGuid(), "Kopya Araç", "34-KPY-001");

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    // ------------------------------------------------------------------ //
    //  Id
    // ------------------------------------------------------------------ //

    [Fact]
    public async Task Validate_EmptyId_FailsWithError() {
        var command = new DuplicateVehicleCommand(Guid.Empty, "Kopya Araç", "34-KPY-001");

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "Id");
    }

    // ------------------------------------------------------------------ //
    //  VehicleName
    // ------------------------------------------------------------------ //

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Validate_EmptyOrWhitespaceVehicleName_FailsWithError(string name) {
        var command = new DuplicateVehicleCommand(Guid.NewGuid(), name, "34-KPY-001");

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "VehicleName");
    }

    [Fact]
    public async Task Validate_VehicleNameExactly200Chars_Passes() {
        var command = new DuplicateVehicleCommand(Guid.NewGuid(), new string('A', 200), "34-KPY-001");

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_VehicleNameOver200Chars_FailsWithError() {
        var command = new DuplicateVehicleCommand(Guid.NewGuid(), new string('A', 201), "34-KPY-001");

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "VehicleName");
    }

    // ------------------------------------------------------------------ //
    //  PlateNumber
    // ------------------------------------------------------------------ //

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Validate_EmptyOrWhitespacePlateNumber_FailsWithError(string plate) {
        var command = new DuplicateVehicleCommand(Guid.NewGuid(), "Kopya Araç", plate);

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "PlateNumber");
    }

    [Fact]
    public async Task Validate_PlateNumberExactly20Chars_Passes() {
        var command = new DuplicateVehicleCommand(Guid.NewGuid(), "Kopya Araç", new string('X', 20));

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_PlateNumberOver20Chars_FailsWithError() {
        var command = new DuplicateVehicleCommand(Guid.NewGuid(), "Kopya Araç", new string('X', 21));

        var result = await _validator.ValidateAsync(command);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == "PlateNumber");
    }
}
