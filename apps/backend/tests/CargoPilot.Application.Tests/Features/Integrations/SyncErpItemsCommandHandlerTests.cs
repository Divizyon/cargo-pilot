using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Features.Integrations.SyncErpItems;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.Integrations;

public sealed class SyncErpItemsCommandHandlerTests
{
    private static readonly Guid CompanyId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid IntegrationId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    private readonly IIntegrationRepository _integrationRepository = Substitute.For<IIntegrationRepository>();
    private readonly IErpSettingsRepository _erpSettingsRepository = Substitute.For<IErpSettingsRepository>();
    private readonly IErpPasswordProtector _passwordProtector = Substitute.For<IErpPasswordProtector>();
    private readonly IDraftItemRepository _draftItemRepository = Substitute.For<IDraftItemRepository>();
    private readonly IErpProductFetcher _erpProductFetcher = Substitute.For<IErpProductFetcher>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();
    private readonly INotificationService _notificationService = Substitute.For<INotificationService>();

    private static readonly SyncErpItemsCommand Command = new(IntegrationId, CategoryFilter: null, WarehouseFilter: null);

    private SyncErpItemsCommandHandler CreateSut() =>
        new(
            _integrationRepository,
            _erpSettingsRepository,
            _passwordProtector,
            _draftItemRepository,
            _erpProductFetcher,
            _currentUserService,
            _notificationService,
            Substitute.For<IValidator<SyncErpItemsCommand>>(),
            NullLogger<SyncErpItemsCommandHandler>.Instance);

    private void ArrangeHappyPath(params ErpProductDto[] products)
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _integrationRepository.GetByIdAsync(IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(TestData.CreateIntegration(IntegrationId, CompanyId));
        _erpSettingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns(TestData.CreateErpSettings(CompanyId));
        _passwordProtector.Unprotect(Arg.Any<string>()).Returns("duz-sifre");
        _erpProductFetcher.FetchAsync(
                Arg.Any<string>(),
                Arg.Any<string?>(),
                Arg.Any<string?>(),
                Arg.Any<string?>(),
                Arg.Any<CancellationToken>())
            .Returns(products);
    }

    [Fact]
    public async Task Handle_YeniUrun_PendingTaslakOlarakEklenir()
    {
        ArrangeHappyPath(TestData.CreateErpProduct());
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);

        DraftItem? eklenen = null;
        _draftItemRepository.When(r => r.Add(Arg.Any<DraftItem>())).Do(c => eklenen = c.Arg<DraftItem>());

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Added.Should().Be(1);
        result.Data.Updated.Should().Be(0);
        eklenen.Should().NotBeNull();
        eklenen!.Status.Should().Be(DraftItemStatus.Pending);
        eklenen.ErpId.Should().Be("ERP-1");
        _draftItemRepository.DidNotReceiveWithAnyArgs().Update(default!);
    }

    [Fact]
    public async Task Handle_OnaylanmisTaslak_UpdatePendingeGecer()
    {
        ArrangeHappyPath(TestData.CreateErpProduct(sku: "SKU-YENI", name: "Yeni Ad"));
        var mevcut = TestData.CreateDraftItem(CompanyId, IntegrationId);
        mevcut.Approve();
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(mevcut);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Updated.Should().Be(1);
        result.Data.Added.Should().Be(0);
        mevcut.Status.Should().Be(DraftItemStatus.UpdatePending);
        mevcut.SKU.Should().Be("SKU-YENI");
        mevcut.Name.Should().Be("Yeni Ad");
        _draftItemRepository.Received(1).Update(mevcut);
    }

    /// <remarks>
    /// Davranis-sabitleme: bugun reddedilen taslak sonraki sync'te Pending'e donuyor.
    /// ERP-16 (kalici ret karari) bu davranisi degistirdiginde test guncellenmeli.
    /// </remarks>
    [Fact]
    public async Task Handle_ReddedilmisTaslak_SuAnPendingeDoner()
    {
        ArrangeHappyPath(TestData.CreateErpProduct(sku: "SKU-YENI", name: "Yeni Ad"));
        var mevcut = TestData.CreateDraftItem(CompanyId, IntegrationId);
        mevcut.Reject();
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(mevcut);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Updated.Should().Be(1);
        mevcut.Status.Should().Be(DraftItemStatus.Pending);
        mevcut.Name.Should().Be("Yeni Ad");
    }

    [Fact]
    public async Task Handle_BekleyenTaslak_PendingKalirVeVerisiGuncellenir()
    {
        ArrangeHappyPath(TestData.CreateErpProduct(sku: "SKU-YENI", name: "Yeni Ad"));
        var mevcut = TestData.CreateDraftItem(CompanyId, IntegrationId);
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(mevcut);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Updated.Should().Be(1);
        mevcut.Status.Should().Be(DraftItemStatus.Pending);
        mevcut.SKU.Should().Be("SKU-YENI");
    }

    [Fact]
    public async Task Handle_EntegrasyonBulunamazsa_NotFoundDoner()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _integrationRepository.GetByIdAsync(IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((Integration?)null);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Integration.NotFound");
        _integrationRepository.DidNotReceiveWithAnyArgs().AddSyncLog(default!);
    }

    [Fact]
    public async Task Handle_ErpAyarlariYoksa_NotConfiguredDoner()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _integrationRepository.GetByIdAsync(IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(TestData.CreateIntegration(IntegrationId, CompanyId));
        _erpSettingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns((ErpSettings?)null);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("ErpSettings.NotConfigured");
    }

    [Fact]
    public async Task Handle_FetcherHataVerirse_SyncLogFailVeBildirimOlusur()
    {
        ArrangeHappyPath();
        _erpProductFetcher.FetchAsync(
                Arg.Any<string>(),
                Arg.Any<string?>(),
                Arg.Any<string?>(),
                Arg.Any<string?>(),
                Arg.Any<CancellationToken>())
            .Returns<IReadOnlyList<ErpProductDto>>(_ => throw new InvalidOperationException("baglanti koptu"));

        SyncLog? kaydedilenLog = null;
        _integrationRepository.When(r => r.AddSyncLog(Arg.Any<SyncLog>())).Do(c => kaydedilenLog = c.Arg<SyncLog>());

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Sync.Failed");
        kaydedilenLog.Should().NotBeNull();
        kaydedilenLog!.Status.Should().Be(SyncLogStatus.Failed);
        kaydedilenLog.ErrorMessage.Should().Be("baglanti koptu");
        await _notificationService.Received(1).CreateAsync(
            Arg.Any<Guid>(),
            CompanyId,
            NotificationType.ErpSyncError,
            Arg.Any<string>(),
            Arg.Any<string>(),
            Arg.Any<string?>(),
            IntegrationId,
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_EksikOlculuSatir_EksikAlanIsaretiyleTaslagaYazilir()
    {
        ArrangeHappyPath(TestData.CreateErpProduct(
            width: 0m,
            weight: 0m,
            missingFields: [DraftItemField.Width, DraftItemField.Weight]));
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);

        DraftItem? eklenen = null;
        _draftItemRepository.When(r => r.Add(Arg.Any<DraftItem>())).Do(c => eklenen = c.Arg<DraftItem>());

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Added.Should().Be(1);
        result.Data.Skipped.Should().Be(0);
        result.Data.MissingFieldCount.Should().Be(1);
        eklenen!.GetMissingFields().Should().Equal(DraftItemField.Width, DraftItemField.Weight);
    }

    [Fact]
    public async Task Handle_TekSatirHataVerirse_DigerSatirlarKaydedilirVeKismiBasariYazilir()
    {
        ArrangeHappyPath(
            TestData.CreateErpProduct(),
            TestData.CreateErpProduct("ERP-2", "SKU-2", "Ikinci Urun"),
            TestData.CreateErpProduct("ERP-3", "SKU-3", "Ucuncu Urun"));

        _draftItemRepository.GetByErpIdAsync(Arg.Any<string>(), IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);
        _draftItemRepository.GetByErpIdAsync("ERP-2", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns<DraftItem?>(_ => throw new InvalidOperationException("satir bozuk"));

        SyncLog? kaydedilenLog = null;
        _integrationRepository.When(r => r.AddSyncLog(Arg.Any<SyncLog>())).Do(c => kaydedilenLog = c.Arg<SyncLog>());

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Added.Should().Be(2);
        result.Data.Skipped.Should().Be(1);
        result.Data.ErrorCount.Should().Be(1);
        result.Data.RowErrors.Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new SyncRowError("ERP-2", "SKU-2", "satir bozuk"));

        _draftItemRepository.Received(2).Add(Arg.Any<DraftItem>());
        kaydedilenLog!.Status.Should().Be(SyncLogStatus.PartialFailure);
        kaydedilenLog.SyncedRecordCount.Should().Be(2);
        kaydedilenLog.RowErrorsJson.Should().Contain("ERP-2").And.Contain("satir bozuk");
        await _draftItemRepository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_BasariliSync_SyncLogTamamlanirVeKayitEdilir()
    {
        ArrangeHappyPath(TestData.CreateErpProduct(), TestData.CreateErpProduct("ERP-2", "SKU-2", "Ikinci Urun"));
        _draftItemRepository.GetByErpIdAsync(Arg.Any<string>(), IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);

        SyncLog? kaydedilenLog = null;
        _integrationRepository.When(r => r.AddSyncLog(Arg.Any<SyncLog>())).Do(c => kaydedilenLog = c.Arg<SyncLog>());

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Added.Should().Be(2);
        kaydedilenLog!.Status.Should().Be(SyncLogStatus.Success);
        kaydedilenLog.SyncedRecordCount.Should().Be(2);
        kaydedilenLog.RowErrorsJson.Should().BeNull();
        result.Data.Skipped.Should().Be(0);
        result.Data.RowErrors.Should().BeEmpty();
        result.Data.SyncLogId.Should().Be(kaydedilenLog.Id);
        await _draftItemRepository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
