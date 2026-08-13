using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;

namespace CargoPilot.Application.Tests.Features.DraftItems;

public sealed class DraftItemMissingFieldsTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid IntegrationId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private static void FillDimensions(DraftItem draft, decimal width, decimal weight) =>
        draft.UpdateUserFields(
            "STANDARD",
            ItemCategory.Package,
            width,
            height: 20m,
            length: 30m,
            weight,
            diameter: null,
            FragilityType.NonFragile,
            isStackable: true,
            maxStackCount: 1,
            maxWeightOnTop: 0m,
            AllowedRotations.All,
            barcode: null,
            stackGroup: null,
            incompatibleGroups: null,
            specialNotes: null);

    [Fact]
    public void EksikAlanIsaretsizTaslak_BosListeDoner()
    {
        var draft = TestData.CreateDraftItem(CompanyId, IntegrationId);

        draft.GetMissingFields().Should().BeEmpty();
    }

    [Fact]
    public void EksikAlanDoldurulunca_IsaretKalkar()
    {
        var draft = TestData.CreateDraftItem(
            CompanyId,
            IntegrationId,
            missingFields: [DraftItemField.Width, DraftItemField.Weight]);

        FillDimensions(draft, width: 12m, weight: 5m);

        draft.GetMissingFields().Should().BeEmpty();
    }

    [Fact]
    public void EksikAlanlardanYalnizBiriDoldurulunca_DigeriIsaretliKalir()
    {
        var draft = TestData.CreateDraftItem(
            CompanyId,
            IntegrationId,
            missingFields: [DraftItemField.Width, DraftItemField.Weight]);

        FillDimensions(draft, width: 12m, weight: 0m);

        draft.GetMissingFields().Should().Equal(DraftItemField.Weight);
    }

    [Fact]
    public void ErpGuncellemesi_HalenEksikOlanAlaniIsaretler()
    {
        var draft = TestData.CreateDraftItem(
            CompanyId,
            IntegrationId,
            width: 0m,
            missingFields: [DraftItemField.Width]);

        draft.UpdateFromErp(TestData.CreateErpRefresh(missingFields: [DraftItemField.Width]));

        draft.GetMissingFields().Should().Equal(DraftItemField.Width);
    }

    [Fact]
    public void ErpGuncellemesi_TaslaktaDoluOlanAlaniEksikIsaretlemez()
    {
        var draft = TestData.CreateDraftItem(CompanyId, IntegrationId, width: 12m);

        draft.UpdateFromErp(TestData.CreateErpRefresh(missingFields: [DraftItemField.Width]));

        draft.GetMissingFields().Should().BeEmpty();
    }

    [Fact]
    public void ErpGuncellemesi_SifirGelenOlcuyuEzmez()
    {
        var draft = TestData.CreateDraftItem(CompanyId, IntegrationId, width: 12m, weight: 7m);

        draft.UpdateFromErp(TestData.CreateErpRefresh(width: 0m, weight: 0m));

        draft.Width.Should().Be(12m);
        draft.Weight.Should().Be(7m);
    }

    [Fact]
    public void ErpGuncellemesi_DoluGelenOlcuyuYazar()
    {
        var draft = TestData.CreateDraftItem(CompanyId, IntegrationId, width: 12m, weight: 7m);

        draft.UpdateFromErp(TestData.CreateErpRefresh(width: 40m, height: 50m, length: 60m, weight: 9m));

        draft.Width.Should().Be(40m);
        draft.Height.Should().Be(50m);
        draft.Length.Should().Be(60m);
        draft.Weight.Should().Be(9m);
    }

    [Fact]
    public void ErpGuncellemesi_YukGrubuBossaMevcutSecimiKorur()
    {
        var draft = TestData.CreateDraftItem(CompanyId, IntegrationId, stackGroup: "Tekstil");

        draft.UpdateFromErp(TestData.CreateErpRefresh(stackGroup: null));

        draft.StackGroup.Should().Be("Tekstil");
    }
}
