using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Items.CreateItem;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.Items;

/// <summary>
/// BIZ-01 yayılımı: Ürün kotasının sabit Free yerine gerçek abonelik tipine,
/// kurumsal kullanıcıda ise şirket sayacına göre uygulandığını doğrular.
/// Free 50, Pro 500 üründür (Common/Config/SubscriptionLimits).
/// </summary>
public sealed class CreateItemQuotaTests
{
    private const string LimitExceededCode = "Item.LimitExceeded";
    private const int FreeItemLimit = 50;

    private static readonly Guid _userId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid _companyId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task Pro_Abonelikli_Bireysel_Kullanici_Free_Limitinin_Ustunde_Urun_Ekleyebilir()
    {
        var harness = new Harness(UserType.Individual, SubscriptionType.Pro, userItemCount: 200);

        var result = await harness.HandleAsync();

        Assert.True(result.IsSuccess);
        harness.ItemRepository.Received(1).Add(Arg.Any<Item>());
    }

    [Fact]
    public async Task Bireysel_Kullanici_Free_Kotasi_Dolunca_LimitExceeded_Doner()
    {
        var harness = new Harness(UserType.Individual, SubscriptionType.Free, userItemCount: FreeItemLimit);

        var result = await harness.HandleAsync();

        AssertLimitExceeded(result);
        harness.ItemRepository.DidNotReceiveWithAnyArgs().Add(default!);
    }

    [Fact]
    public async Task Kurumsal_Kullanici_Sirket_Kotasi_Dolunca_LimitExceeded_Doner()
    {
        var harness = new Harness(UserType.CompanyAdmin, SubscriptionType.Free, companyItemCount: FreeItemLimit);

        var result = await harness.HandleAsync();

        AssertLimitExceeded(result);
        harness.ItemRepository.DidNotReceiveWithAnyArgs().Add(default!);
    }

    [Fact]
    public async Task Enterprise_Abonelikli_Kurumsal_Kullanici_Free_Limitinin_Ustunde_Urun_Ekleyebilir()
    {
        var harness = new Harness(UserType.CompanyWorker, SubscriptionType.Enterprise, companyItemCount: 10_000);

        var result = await harness.HandleAsync();

        Assert.True(result.IsSuccess);
    }

    private static void AssertLimitExceeded(Result<Guid> result)
    {
        Assert.False(result.IsSuccess);
        Assert.NotNull(result.Error);
        Assert.Equal(LimitExceededCode, result.Error.Code);
        Assert.Equal(ErrorType.BusinessRule, result.Error.Type);
    }

    private sealed class Harness
    {
        public IItemRepository ItemRepository { get; } = Substitute.For<IItemRepository>();

        private readonly CreateItemCommandHandler _handler;

        public Harness(
            UserType userType,
            SubscriptionType subscriptionType,
            int userItemCount = 0,
            int companyItemCount = 0)
        {
            ItemRepository.CountByUserAsync(_userId, Arg.Any<CancellationToken>())
                .Returns(userItemCount);
            ItemRepository.CountByCompanyAsync(_companyId, Arg.Any<CancellationToken>())
                .Returns(companyItemCount);
            ItemRepository.ExistsBySkuAsync(Arg.Any<string>(), _companyId, Arg.Any<CancellationToken>())
                .Returns(false);

            var currentUserService = Substitute.For<ICurrentUserService>();
            currentUserService.UserId.Returns(_userId);
            currentUserService.CompanyId.Returns(_companyId);
            currentUserService.UserType.Returns(userType);

            var companyRepository = Substitute.For<ICompanyRepository>();
            companyRepository.GetByIdAsync(_companyId, Arg.Any<CancellationToken>())
                .Returns(new Company(_companyId, "Test Firma", subscriptionType));

            _handler = new CreateItemCommandHandler(
                ItemRepository,
                currentUserService,
                Substitute.For<INotificationService>(),
                companyRepository);
        }

        public Task<Result<Guid>> HandleAsync()
        {
            var command = new CreateItemCommand(
                SKU: "SKU-1",
                Barcode: null,
                Name: "Test Ürün",
                ProductType: "Kutu",
                Category: ItemCategory.Box,
                Width: 40,
                Height: 40,
                Length: 60,
                Diameter: null,
                Weight: 10,
                FragilityType: FragilityType.NonFragile,
                IsStackable: true,
                MaxStackCount: 3,
                MaxWeightOnTop: 50,
                AllowedRotations: AllowedRotations.All,
                StackGroup: null,
                IncompatibleGroups: null,
                SpecialNotes: null);

            return _handler.Handle(command, CancellationToken.None);
        }
    }
}
