using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Vehicles.SearchVehicles;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentValidation;
using Moq;

namespace CargoPilot.Application.Tests.Vehicles;

public sealed class InactiveVehiclePlanningFilterTests {
    private readonly Mock<IVehicleRepository> _repositoryMock = new();
    private readonly IValidator<SearchVehiclesQuery> _validator = new SearchVehiclesQueryValidator();

    private SearchVehiclesQueryHandler CreateHandler() =>
        new(_repositoryMock.Object, _validator);

    private static Vehicle ActiveVehicle() {
        var v = new Vehicle(Guid.NewGuid(), "Aktif Araç", VehicleType.Trailer,
            "34AAA001", 2400, 2700, 13600, 24000, 1, LoadingType.Rear, null);
        v.SetStatus(true);
        return v;
    }

    [Fact]
    public async Task Search_WithIsActiveTrue_RepositoryReceivesActiveTrueFilter() {
        _repositoryMock
            .Setup(r => r.SearchAsync(null, null, true, 1, 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PagedResult<Vehicle>([ActiveVehicle()], 1, 1, 20));

        var query = new SearchVehiclesQuery(null, null, IsActive: true);
        var result = await CreateHandler().Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Single(result.Data!.Items);
        _repositoryMock.Verify(
            r => r.SearchAsync(null, null, true, 1, 20, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Search_WithIsActiveTrue_DoesNotReturnInactiveVehicles() {
        var active = ActiveVehicle();
        _repositoryMock
            .Setup(r => r.SearchAsync(null, null, true, 1, 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PagedResult<Vehicle>([active], 1, 1, 20));

        var query = new SearchVehiclesQuery(null, null, IsActive: true);
        var result = await CreateHandler().Handle(query, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.All(result.Data!.Items, item => Assert.True(item.IsActive));
    }
}
