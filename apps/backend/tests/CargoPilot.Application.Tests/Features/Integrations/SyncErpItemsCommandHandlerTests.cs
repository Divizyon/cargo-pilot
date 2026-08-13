using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
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
            [_erpProductFetcher],
            _currentUserService,
            _notificationService,
            Substitute.For<IValidator<SyncErpItemsCommand>>(),
            NullLogger<SyncErpItemsCommandHandler>.Instance);

    private Integration _integration = TestData.CreateIntegration(IntegrationId, CompanyId);

    private void ArrangeHappyPath(params ErpProductDto[] products) =>
        ArrangeHappyPath(TestData.CreateFetchResult(products));

    private void ArrangeHappyPath(ErpFetchResult fetchResult)
    {
        _erpProductFetcher.ProviderType.Returns(ErpProviderType.Netsis);
        _currentUserService.CompanyId.Returns(CompanyId);
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _integration = TestData.CreateIntegration(IntegrationId, CompanyId);
        _integrationRepository.HasAnyRunningSyncAsync(CompanyId, Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(false);
        _integrationRepository.GetByIdAsync(IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(_integration);
        _erpSettingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns(TestData.CreateErpSettings(CompanyId));
        _passwordProtector.Unprotect(Arg.Any<string>()).Returns("duz-sifre");
        _erpProductFetcher.FetchAsync(
                Arg.Any<string>(),
                Arg.Any<ErpCredentials>(),
                Arg.Any<string?>(),
                Arg.Any<string?>(),
                Arg.Any<CancellationToken>())
            .Returns(fetchResult);
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
    public async Task Handle_YeniUrun_IstifVarsayilanlariTutarliYazilir()
    {
        ArrangeHappyPath(TestData.CreateErpProduct(weight: 8m));
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);

        DraftItem? eklenen = null;
        _draftItemRepository.When(r => r.Add(Arg.Any<DraftItem>())).Do(c => eklenen = c.Arg<DraftItem>());

        await CreateSut().Handle(Command, CancellationToken.None);

        eklenen!.IsStackable.Should().BeTrue();
        eklenen.MaxStackCount.Should().Be(1);
        eklenen.MaxWeightOnTop.Should().BeGreaterThan(0m);
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

    /// <remarks>Kalici ret: sync taslagin verisini tazeler ama durumunu Pending'e cevirmez.</remarks>
    [Fact]
    public async Task Handle_ErpVerisiDegismemis_OnaylanmisTaslakUpdatePendingeGecmez()
    {
        var product = TestData.CreateErpProduct();
        ArrangeHappyPath(product);
        var mevcut = TestData.CreateDraftItem(
            CompanyId, IntegrationId, erpRawDataJson: product.RawDataJson);
        mevcut.Approve();
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(mevcut);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Unchanged.Should().Be(1);
        result.Data.Updated.Should().Be(0);
        result.Data.Added.Should().Be(0);
        mevcut.Status.Should().Be(DraftItemStatus.Approved);
        _draftItemRepository.DidNotReceiveWithAnyArgs().Update(default!);
    }

    [Fact]
    public async Task Handle_ErpVerisiDegismemis_MutabakatFarkiOlusmaz()
    {
        var product = TestData.CreateErpProduct();
        ArrangeHappyPath(product);
        var mevcut = TestData.CreateDraftItem(
            CompanyId, IntegrationId, erpRawDataJson: product.RawDataJson);
        mevcut.Approve();
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(mevcut);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.Data!.Unaccounted.Should().Be(0);
        result.Data.SourceTotal.Should().Be(1);
    }

    [Fact]
    public async Task Handle_ErpVerisiDegismis_OnaylanmisTaslakUpdatePendingeGecer()
    {
        ArrangeHappyPath(TestData.CreateErpProduct(name: "Degisen Ad"));
        var mevcut = TestData.CreateDraftItem(
            CompanyId, IntegrationId, erpRawDataJson: TestData.ErpSnapshot(name: "Eski Ad"));
        mevcut.Approve();
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(mevcut);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.Data!.Updated.Should().Be(1);
        result.Data.Unchanged.Should().Be(0);
        mevcut.Status.Should().Be(DraftItemStatus.UpdatePending);
    }

    [Fact]
    public async Task Handle_ReddedilmisTaslak_RejectedKalirVerisiGuncellenir()
    {
        ArrangeHappyPath(TestData.CreateErpProduct(sku: "SKU-YENI", name: "Yeni Ad"));
        var mevcut = TestData.CreateDraftItem(CompanyId, IntegrationId);
        mevcut.Reject();
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(mevcut);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Updated.Should().Be(1);
        mevcut.Status.Should().Be(DraftItemStatus.Rejected);
        mevcut.Name.Should().Be("Yeni Ad");
    }

    [Fact]
    public async Task Handle_GuncellemesiReddedilmisTaslak_UpdatePendingeDonmez()
    {
        ArrangeHappyPath(TestData.CreateErpProduct(sku: "SKU-YENI", name: "Yeni Ad"));
        var mevcut = TestData.CreateDraftItem(CompanyId, IntegrationId);
        mevcut.DismissUpdate();
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns(mevcut);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        mevcut.Status.Should().Be(DraftItemStatus.UpdateDismissed);
        mevcut.SKU.Should().Be("SKU-YENI");
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
    public async Task Handle_SirketBaglamiYokken_AuthNoCompanyDoner()
    {
        _currentUserService.CompanyId.Returns((Guid?)null);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Auth.NoCompany");
        result.Error.Type.Should().Be(ErrorType.Unauthorized);
        await _integrationRepository.DidNotReceiveWithAnyArgs().GetByIdAsync(Guid.Empty, Guid.Empty);
    }

    [Fact]
    public async Task Handle_SirkettteCalisanSyncVarken_ConflictDoner()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        _integrationRepository.HasAnyRunningSyncAsync(CompanyId, Arg.Any<DateTime>(), Arg.Any<CancellationToken>())
            .Returns(true);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Sync.AlreadyRunning");
        result.Error.Type.Should().Be(ErrorType.Conflict);
        _integrationRepository.DidNotReceiveWithAnyArgs().AddSyncLog(default!);
    }

    [Fact]
    public async Task Handle_SyncBaslarken_RunningKilidiOnceKaydedilirSonundaBirakilir()
    {
        ArrangeHappyPath(TestData.CreateErpProduct());
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);

        ErpSyncStatus? fetchAnindakiDurum = null;
        _erpProductFetcher.FetchAsync(
                Arg.Any<string>(),
                Arg.Any<ErpCredentials>(),
                Arg.Any<string?>(),
                Arg.Any<string?>(),
                Arg.Any<CancellationToken>())
            .Returns(_ =>
            {
                fetchAnindakiDurum = _integration.SyncStatus;
                return TestData.CreateFetchResult(TestData.CreateErpProduct());
            });

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        fetchAnindakiDurum.Should().Be(ErpSyncStatus.Running);
        await _integrationRepository.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
        _integration.SyncStatus.Should().Be(ErpSyncStatus.Idle);
        _integration.SyncStartedAtUtc.Should().BeNull();
        _integration.LastSyncDate.Should().NotBeNull();
    }

    [Fact]
    public async Task Handle_AyniErpIdIkiKezGelirse_IkincisiDuplicateErpIdOlarakSayilir()
    {
        ArrangeHappyPath(
            TestData.CreateErpProduct(),
            TestData.CreateErpProduct());
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.Added.Should().Be(1);
        result.Data.Skipped.Should().Be(0);
        result.Data.RowErrors.Should().BeEmpty();
        result.Data.DroppedByReason.Should()
            .ContainSingle()
            .Which.Should().BeEquivalentTo(
                new KeyValuePair<string, int>(nameof(ErpDropReason.DuplicateErpId), 1));
        result.Data.Unaccounted.Should().Be(0);
        _draftItemRepository.Received(1).Add(Arg.Any<DraftItem>());
    }

    /// <remarks>
    /// ERP-24 mutabakat invariantı: 10 kaynak satir, 3'u kaynakta elenir, 7 cekilir,
    /// 1 satir handler'da hata verir → 6 yazilir, fark sifirdir.
    /// </remarks>
    [Fact]
    public async Task Handle_KaynaktaElenenVeHataliSatirlar_MutabakatFarkiSifirKalir()
    {
        var products = Enumerable.Range(1, 7)
            .Select(i => TestData.CreateErpProduct($"ERP-{i}", $"SKU-{i}", $"Urun {i}"))
            .ToArray();

        ArrangeHappyPath(TestData.CreateFetchResult(
            sourceTotal: 10,
            droppedAtSource: new Dictionary<ErpDropReason, int>
            {
                [ErpDropReason.SalesLocked] = 2,
                [ErpDropReason.WarehouseFiltered] = 1,
            },
            products));

        _draftItemRepository.GetByErpIdAsync(Arg.Any<string>(), IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);
        _draftItemRepository.GetByErpIdAsync("ERP-4", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns<DraftItem?>(_ => throw new InvalidOperationException("satir bozuk"));

        SyncLog? kaydedilenLog = null;
        _integrationRepository.When(r => r.AddSyncLog(Arg.Any<SyncLog>())).Do(c => kaydedilenLog = c.Arg<SyncLog>());

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Data!.SourceTotal.Should().Be(10);
        result.Data.Added.Should().Be(6);
        result.Data.Updated.Should().Be(0);
        result.Data.Skipped.Should().Be(1);
        result.Data.DroppedByReason.Values.Sum().Should().Be(3);
        result.Data.Unaccounted.Should().Be(0);

        kaydedilenLog!.SourceTotal.Should().Be(10);
        kaydedilenLog.FetchedCount.Should().Be(7);
        kaydedilenLog.UnaccountedCount.Should().Be(0);
        kaydedilenLog.DroppedByReasonJson.Should()
            .Contain(nameof(ErpDropReason.SalesLocked))
            .And.Contain(nameof(ErpDropReason.WarehouseFiltered));
    }

    [Fact]
    public async Task Handle_KaynakToplamiSayilamayanSatirBirakirsa_FarkUnaccountedOlarakYazilir()
    {
        ArrangeHappyPath(TestData.CreateFetchResult(
            sourceTotal: 5,
            droppedAtSource: new Dictionary<ErpDropReason, int>(),
            TestData.CreateErpProduct()));
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);

        SyncLog? kaydedilenLog = null;
        _integrationRepository.When(r => r.AddSyncLog(Arg.Any<SyncLog>())).Do(c => kaydedilenLog = c.Arg<SyncLog>());

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.Data!.Unaccounted.Should().Be(4);
        kaydedilenLog!.UnaccountedCount.Should().Be(4);
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

    /// <remarks>Logo icin fetcher kayitli degil; yanlis sema sorgulanmasi yerine acik hata doner.</remarks>
    [Fact]
    public async Task Handle_LogoSaglayicisi_DesteklenmiyorHatasiDonerVeSyncBaslamaz()
    {
        ArrangeHappyPath(TestData.CreateErpProduct());
        _erpSettingsRepository.GetByCompanyIdAsync(CompanyId, Arg.Any<CancellationToken>())
            .Returns(TestData.CreateErpSettings(CompanyId, ErpProviderType.Logo));

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Sync.ProviderNotSupported");
        result.Error.Type.Should().Be(ErrorType.Validation);
        result.Error.Description.Should().Contain("Logo");
        _integrationRepository.DidNotReceiveWithAnyArgs().AddSyncLog(default!);
        _integration.SyncStatus.Should().Be(ErpSyncStatus.Idle);
        await _erpProductFetcher.DidNotReceiveWithAnyArgs().FetchAsync(default!, default!, default, default);
    }

    [Fact]
    public async Task Handle_NetsisSaglayicisi_NetsisFetcheriSecilir()
    {
        var logoFetcher = Substitute.For<IErpProductFetcher>();
        logoFetcher.ProviderType.Returns(ErpProviderType.Logo);
        ArrangeHappyPath(TestData.CreateErpProduct());
        _draftItemRepository.GetByErpIdAsync("ERP-1", IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);

        var sut = new SyncErpItemsCommandHandler(
            _integrationRepository,
            _erpSettingsRepository,
            _passwordProtector,
            _draftItemRepository,
            [logoFetcher, _erpProductFetcher],
            _currentUserService,
            _notificationService,
            Substitute.For<IValidator<SyncErpItemsCommand>>(),
            NullLogger<SyncErpItemsCommandHandler>.Instance);

        var result = await sut.Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        await _erpProductFetcher.ReceivedWithAnyArgs(1).FetchAsync(default!, default!, default, default);
        await logoFetcher.DidNotReceiveWithAnyArgs().FetchAsync(default!, default!, default, default);
    }

    [Fact]
    public async Task Handle_ErpYapilandirmasiEksikse_AciklayiciValidationHatasiDoner()
    {
        ArrangeHappyPath();
        _erpProductFetcher.FetchAsync(
                Arg.Any<string>(),
                Arg.Any<ErpCredentials>(),
                Arg.Any<string?>(),
                Arg.Any<string?>(),
                Arg.Any<CancellationToken>())
            .Returns<ErpFetchResult>(_ =>
                throw new ErpConfigurationException("ERP veritabanı adı tanımlı değil."));

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Sync.ErpConfigurationInvalid");
        result.Error.Type.Should().Be(ErrorType.Validation);
        result.Error.Description.Should().Be("ERP veritabanı adı tanımlı değil.");
        _integration.SyncStatus.Should().Be(ErpSyncStatus.Failed);
    }

    [Fact]
    public async Task Handle_FetcherHataVerirse_SyncLogFailVeBildirimOlusur()
    {
        ArrangeHappyPath();
        _erpProductFetcher.FetchAsync(
                Arg.Any<string>(),
                Arg.Any<ErpCredentials>(),
                Arg.Any<string?>(),
                Arg.Any<string?>(),
                Arg.Any<CancellationToken>())
            .Returns<ErpFetchResult>(_ => throw new InvalidOperationException("baglanti koptu"));

        SyncLog? kaydedilenLog = null;
        _integrationRepository.When(r => r.AddSyncLog(Arg.Any<SyncLog>())).Do(c => kaydedilenLog = c.Arg<SyncLog>());

        var result = await CreateSut().Handle(Command, CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Sync.Failed");
        kaydedilenLog.Should().NotBeNull();
        kaydedilenLog!.Status.Should().Be(SyncLogStatus.Failed);
        kaydedilenLog.ErrorMessage.Should().Be("baglanti koptu");
        _integration.SyncStatus.Should().Be(ErpSyncStatus.Failed);
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

    /// <remarks>Vade ilerlemezse zamanlayici ayni entegrasyonu her taramada yeniden tetiklerdi.</remarks>
    [Fact]
    public async Task Handle_BasariliSync_SonrakiVadeFrekansaGoreIlerler()
    {
        ArrangeHappyPath(TestData.CreateErpProduct());
        _integration.UpdateSyncSettings(SyncFrequency.Every4Hours, DateTime.UtcNow.AddMinutes(-5));
        _draftItemRepository.GetByErpIdAsync(Arg.Any<string>(), IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);

        await CreateSut().Handle(Command, CancellationToken.None);

        _integration.NextScheduledSyncAt.Should().BeAfter(DateTime.UtcNow.AddHours(3));
    }

    [Fact]
    public async Task Handle_SyncHataVerirse_SonrakiVadeYineIlerler()
    {
        ArrangeHappyPath();
        _integration.UpdateSyncSettings(SyncFrequency.Every4Hours, DateTime.UtcNow.AddMinutes(-5));
        _erpProductFetcher.FetchAsync(
                Arg.Any<string>(),
                Arg.Any<ErpCredentials>(),
                Arg.Any<string?>(),
                Arg.Any<string?>(),
                Arg.Any<CancellationToken>())
            .Returns<ErpFetchResult>(_ => throw new InvalidOperationException("baglanti koptu"));

        await CreateSut().Handle(Command, CancellationToken.None);

        _integration.SyncStatus.Should().Be(ErpSyncStatus.Failed);
        _integration.NextScheduledSyncAt.Should().BeAfter(DateTime.UtcNow.AddHours(3));
    }

    /// <remarks>Otomatik sync kapaliyken (frekans yok) vade uretilmez.</remarks>
    [Fact]
    public async Task Handle_FrekansSecilmemisse_SonrakiVadeBosKalir()
    {
        ArrangeHappyPath(TestData.CreateErpProduct());
        _draftItemRepository.GetByErpIdAsync(Arg.Any<string>(), IntegrationId, CompanyId, Arg.Any<CancellationToken>())
            .Returns((DraftItem?)null);

        await CreateSut().Handle(Command, CancellationToken.None);

        _integration.NextScheduledSyncAt.Should().BeNull();
    }
}
