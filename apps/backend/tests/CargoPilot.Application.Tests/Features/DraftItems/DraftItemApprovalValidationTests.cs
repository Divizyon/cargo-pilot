using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Items;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.DraftItems.ApproveDraftItem;
using CargoPilot.Application.Features.DraftItems.ApproveDraftItems;
using CargoPilot.Application.Features.Items.CreateItem;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.DraftItems;

/// <summary>Taslak onayinin Excel toplu import ile ayni kural setinden gectiginin kaniti.</summary>
public sealed class DraftItemApprovalValidationTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid IntegrationId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly IDraftItemRepository _draftItemRepository = Substitute.For<IDraftItemRepository>();
    private readonly IItemRepository _itemRepository = Substitute.For<IItemRepository>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();
    private readonly DraftItemApprovalValidator _specValidator = new();

    public DraftItemApprovalValidationTests() => _currentUserService.CompanyId.Returns(CompanyId);

    private ApproveDraftItemCommandHandler CreateSingleSut() =>
        new(_draftItemRepository, _itemRepository, _currentUserService, _specValidator);

    private ApproveDraftItemsCommandHandler CreateBulkSut() =>
        new(_draftItemRepository, _itemRepository, _currentUserService, _specValidator);

    [Fact]
    public async Task TekilOnay_AgirligiSifirTaslak_IsKuraliHatasiVeAlanListesiDoner()
    {
        var draft = TestData.CreateDraftItem(CompanyId, IntegrationId, weight: 0m, maxWeightOnTop: 1m);
        _draftItemRepository.GetByIdAsync(draft.Id, CompanyId, Arg.Any<CancellationToken>()).Returns(draft);

        var result = await CreateSingleSut().Handle(new ApproveDraftItemCommand(draft.Id), CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Type.Should().Be(ErrorType.BusinessRule);
        result.Error.Code.Should().Be("DraftItem.ValidationFailed");
        result.Error.ValidationErrors.Should().ContainSingle().Which.Field.Should().Be(nameof(ItemSpec.Weight));
        draft.Status.Should().Be(DraftItemStatus.Pending);
        _itemRepository.DidNotReceiveWithAnyArgs().Add(default!);
        await _draftItemRepository.DidNotReceiveWithAnyArgs().SaveChangesAsync(default);
    }

    [Fact]
    public async Task TekilOnay_GecerliTaslak_UrunOlusturVeErpKaynagiIsaretlenir()
    {
        var draft = TestData.CreateDraftItem(CompanyId, IntegrationId);
        _draftItemRepository.GetByIdAsync(draft.Id, CompanyId, Arg.Any<CancellationToken>()).Returns(draft);
        _itemRepository.ExistsBySkuAsync(draft.SKU, CompanyId, Arg.Any<CancellationToken>()).Returns(false);

        Item? eklenen = null;
        _itemRepository.When(r => r.Add(Arg.Any<Item>())).Do(c => eklenen = c.Arg<Item>());

        var result = await CreateSingleSut().Handle(new ApproveDraftItemCommand(draft.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        draft.Status.Should().Be(DraftItemStatus.Approved);
        eklenen.Should().NotBeNull();
        eklenen!.ErpId.Should().Be(draft.ErpId);
        eklenen.IntegrationId.Should().Be(IntegrationId);
        eklenen.Weight.Should().Be(draft.Weight);
    }

    [Fact]
    public async Task TopluOnay_GecersizTaslak_NedeniyleAtlanirDigerleriOnaylanir()
    {
        var gecerli = TestData.CreateDraftItem(CompanyId, IntegrationId, erpId: "ERP-1", sku: "SKU-1");
        var gecersiz = TestData.CreateDraftItem(CompanyId, IntegrationId, erpId: "ERP-2", sku: "SKU-2", weight: 0m);
        _draftItemRepository.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), CompanyId, Arg.Any<CancellationToken>())
            .Returns([gecerli, gecersiz]);
        _itemRepository.ExistsBySkuAsync(Arg.Any<string>(), CompanyId, Arg.Any<CancellationToken>()).Returns(false);

        var result = await CreateBulkSut().Handle(
            new ApproveDraftItemsCommand([gecerli.Id, gecersiz.Id]), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Approved.Should().Be(1);
        result.Data.Skipped.Should().Be(1);
        var atlanan = result.Data.SkippedItems.Should().ContainSingle().Subject;
        atlanan.Id.Should().Be(gecersiz.Id);
        atlanan.Sku.Should().Be("SKU-2");
        atlanan.Reason.Should().Contain("Agirlik");
        gecerli.Status.Should().Be(DraftItemStatus.Approved);
        gecersiz.Status.Should().Be(DraftItemStatus.Pending);
    }

    [Fact]
    public async Task TopluOnay_KullanilanSku_NedeniyleAtlanir()
    {
        var draft = TestData.CreateDraftItem(CompanyId, IntegrationId);
        _draftItemRepository.GetByIdsAsync(Arg.Any<IReadOnlyList<Guid>>(), CompanyId, Arg.Any<CancellationToken>())
            .Returns([draft]);
        _itemRepository.ExistsBySkuAsync(draft.SKU, CompanyId, Arg.Any<CancellationToken>()).Returns(true);

        var result = await CreateBulkSut().Handle(
            new ApproveDraftItemsCommand([draft.Id]), CancellationToken.None);

        result.Data!.Approved.Should().Be(0);
        result.Data.SkippedItems.Should().ContainSingle()
            .Which.Reason.Should().Contain("SKU");
    }

    /// <summary>Kural seti tek kaynaktan geliyor; iki yol ayni girdide ayni hata kodlarini uretir.</summary>
    [Fact]
    public void ExcelImportVeTaslakOnayi_AyniKuralSetiniPaylasir()
    {
        var spec = new ItemSpec(
            ProductType: " ",
            Category: ItemCategory.Package,
            Width: 0m,
            Height: 20m,
            Length: 30m,
            Diameter: null,
            Weight: 0m,
            FragilityType: FragilityType.NonFragile,
            IsStackable: true,
            MaxStackCount: 0,
            MaxWeightOnTop: 0m,
            AllowedRotations: AllowedRotations.All,
            Barcode: null,
            ImageUrl: null,
            StackGroup: null,
            IncompatibleGroups: null,
            SpecialNotes: null,
            ConstraintIds: null);

        var command = new CreateItemCommand(
            SKU: "SKU-1",
            Barcode: spec.Barcode,
            Name: "Urun",
            ProductType: spec.ProductType,
            Category: spec.Category,
            Width: spec.Width,
            Height: spec.Height,
            Length: spec.Length,
            Diameter: spec.Diameter,
            Weight: spec.Weight,
            FragilityType: spec.FragilityType,
            IsStackable: spec.IsStackable,
            MaxStackCount: spec.MaxStackCount,
            MaxWeightOnTop: spec.MaxWeightOnTop,
            AllowedRotations: spec.AllowedRotations,
            ImageUrl: spec.ImageUrl,
            StackGroup: spec.StackGroup,
            IncompatibleGroups: spec.IncompatibleGroups,
            SpecialNotes: spec.SpecialNotes,
            ConstraintIds: spec.ConstraintIds);

        var draftCodes = _specValidator.Validate(spec).Errors.Select(e => e.ErrorCode);
        var importCodes = new CreateItemCommandValidator().Validate(command).Errors.Select(e => e.ErrorCode);

        draftCodes.Should().NotBeEmpty();
        draftCodes.Should().BeEquivalentTo(importCodes);
    }
}
