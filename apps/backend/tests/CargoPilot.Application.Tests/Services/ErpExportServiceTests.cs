using CargoPilot.Application.Common.Models;
using CargoPilot.Infrastructure.Services;
using FluentAssertions;

namespace CargoPilot.Application.Tests.Services;

/// <remarks>
/// Davranis-sabitleme: ERP aktarimi henuz uygulanmadi ve servis bilerek Failure
/// donuyor. ERP-18 gercek aktarimi getirdiginde bu test 'aktarildi' senaryosuna
/// cevrilmelidir.
/// </remarks>
public sealed class ErpExportServiceTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    [Fact]
    public async Task ExportAsync_SuAnHerZaman_NotImplementedHatasiDoner()
    {
        var sut = new ErpExportService();
        var plan = TestData.CreateCalculatedPlan(Guid.NewGuid(), CompanyId);
        var integration = TestData.CreateIntegration(Guid.NewGuid(), CompanyId);

        var result = await sut.ExportAsync(plan, integration, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Erp.ExportNotImplemented");
        result.Error.Type.Should().Be(ErrorType.Unexpected);
    }
}
