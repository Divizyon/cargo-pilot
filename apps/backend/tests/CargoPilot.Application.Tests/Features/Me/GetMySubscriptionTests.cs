using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Me.GetMySubscription;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.Me;

/// <summary>
/// BIZ-01 yayılımı: Gösterilen abonelik tipi ve kalan kotanın, kota uygulamasıyla
/// aynı kaynaktan (Company.SubscriptionType) türetildiğini doğrular.
/// Aksi halde kullanıcıya "kalan 40" gösterilip 10'da reddedilirdi.
/// </summary>
public sealed class GetMySubscriptionTests
{
    private static readonly Guid _userId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid _companyId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task Pro_Abonelikli_Bireysel_Kullanici_Pro_Limitlerini_Gorur()
    {
        var harness = new Harness(UserType.Individual, SubscriptionType.Pro, userPlanCount: 50);

        var result = await harness.HandleAsync();

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal(SubscriptionType.Pro, result.Data.SubscriptionType);
        Assert.Equal(100, result.Data.MaxLoadingPlanCount);
        Assert.Equal(50, result.Data.RemainingLoadingPlanCount);
        Assert.Equal(500, result.Data.MaxItemCount);
        Assert.Equal(100, result.Data.MaxVehicleCount);
    }

    [Fact]
    public async Task Abonelik_Kaydi_Olmayan_Bireysel_Kullanici_Free_Limitlerini_Gorur()
    {
        var harness = new Harness(UserType.Individual, subscriptionType: null, userPlanCount: 3);

        var result = await harness.HandleAsync();

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal(SubscriptionType.Free, result.Data.SubscriptionType);
        Assert.Equal(10, result.Data.MaxLoadingPlanCount);
        Assert.Equal(7, result.Data.RemainingLoadingPlanCount);
    }

    [Fact]
    public async Task Kurumsal_Kullanici_Sirket_Aboneligini_Ve_Sirket_Sayacini_Gorur()
    {
        var harness = new Harness(
            UserType.CompanyAdmin,
            SubscriptionType.Pro,
            companyPlanCount: 60);

        var result = await harness.HandleAsync();

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal(SubscriptionType.Pro, result.Data.SubscriptionType);
        Assert.Equal(40, result.Data.RemainingLoadingPlanCount);
    }

    private sealed class Harness
    {
        private readonly GetMySubscriptionQueryHandler _handler;

        public Harness(
            UserType userType,
            SubscriptionType? subscriptionType,
            int userPlanCount = 0,
            int companyPlanCount = 0)
        {
            var currentUserService = Substitute.For<ICurrentUserService>();
            currentUserService.UserId.Returns(_userId);
            currentUserService.CompanyId.Returns(_companyId);
            currentUserService.UserType.Returns(userType);

            var companyRepository = Substitute.For<ICompanyRepository>();
            companyRepository.GetByIdAsync(_companyId, Arg.Any<CancellationToken>())
                .Returns(subscriptionType is { } type
                    ? new Company(_companyId, "Test Firma", type)
                    : null);

            var itemRepository = Substitute.For<IItemRepository>();
            var vehicleRepository = Substitute.For<IVehicleRepository>();
            var planRepository = Substitute.For<ILoadingPlanRepository>();
            planRepository.CountByUserAsync(_userId, Arg.Any<CancellationToken>()).Returns(userPlanCount);
            planRepository.CountByCompanyAsync(_companyId, Arg.Any<CancellationToken>()).Returns(companyPlanCount);

            _handler = new GetMySubscriptionQueryHandler(
                currentUserService,
                companyRepository,
                itemRepository,
                vehicleRepository,
                planRepository);
        }

        public Task<Result<MySubscriptionResponse>> HandleAsync() =>
            _handler.Handle(new GetMySubscriptionQuery(), CancellationToken.None);
    }
}
