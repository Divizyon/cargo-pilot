using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Plans.CreatePlan;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.Plans;

/// <summary>
/// BIZ-01: Plan kotasının doğru kullanıcı kümesine ve doğru abonelik tipine
/// göre uygulandığını doğrular.
/// Free limiti 10, Pro limiti 100 plandır (Common/Config/SubscriptionLimits).
/// </summary>
public sealed class CreatePlanQuotaTests
{
    private const string LimitExceededCode = "Plan.LimitExceeded";
    private const int FreePlanLimit = 10;

    private static readonly Guid _userId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid _companyId = Guid.Parse("22222222-2222-2222-2222-222222222222");
    private static readonly Guid _vehicleId = Guid.Parse("33333333-3333-3333-3333-333333333333");
    private static readonly Guid _itemId = Guid.Parse("44444444-4444-4444-4444-444444444444");

    [Fact]
    public async Task Bireysel_Kullanici_Limit_Altinda_Plan_Olusturabilir()
    {
        var harness = new Harness(UserType.Individual, SubscriptionType.Free, userPlanCount: 3);

        var result = await harness.HandleAsync();

        Assert.True(result.IsSuccess);
        Assert.NotEqual(Guid.Empty, result.Data);
        await harness.PlanRepository.Received(1).SaveWithResultAsync(
            Arg.Any<LoadingPlan>(),
            Arg.Any<IReadOnlyList<LoadingPlanInputItem>>(),
            Arg.Any<OptimizationResult>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Bireysel_Kullanici_Kota_Dolunca_LimitExceeded_Doner()
    {
        var harness = new Harness(UserType.Individual, SubscriptionType.Free, userPlanCount: FreePlanLimit);

        var result = await harness.HandleAsync();

        Assert.False(result.IsSuccess);
        Assert.NotNull(result.Error);
        Assert.Equal(LimitExceededCode, result.Error.Code);
        Assert.Equal(ErrorType.BusinessRule, result.Error.Type);
        await harness.PlanRepository.DidNotReceiveWithAnyArgs().SaveWithResultAsync(
            default!, default!, default!, default);
    }

    [Fact]
    public async Task Pro_Abonelikli_Bireysel_Kullanici_Free_Limitinin_Ustunde_Plan_Olusturabilir()
    {
        var harness = new Harness(UserType.Individual, SubscriptionType.Pro, userPlanCount: 50);

        var result = await harness.HandleAsync();

        Assert.True(result.IsSuccess);
        await harness.PlanRepository.Received(1).SaveWithResultAsync(
            Arg.Any<LoadingPlan>(),
            Arg.Any<IReadOnlyList<LoadingPlanInputItem>>(),
            Arg.Any<OptimizationResult>(),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Kurumsal_Kullanici_Sirket_Kotasi_Dolunca_LimitExceeded_Doner()
    {
        var harness = new Harness(UserType.CompanyAdmin, SubscriptionType.Free, companyPlanCount: FreePlanLimit);

        var result = await harness.HandleAsync();

        Assert.False(result.IsSuccess);
        Assert.NotNull(result.Error);
        Assert.Equal(LimitExceededCode, result.Error.Code);
        Assert.Equal(ErrorType.BusinessRule, result.Error.Type);
        await harness.PlanRepository.DidNotReceiveWithAnyArgs().SaveWithResultAsync(
            default!, default!, default!, default);
    }

    private sealed class Harness
    {
        public ILoadingPlanRepository PlanRepository { get; } = Substitute.For<ILoadingPlanRepository>();

        private readonly CreatePlanCommandHandler _handler;

        public Harness(
            UserType userType,
            SubscriptionType subscriptionType,
            int userPlanCount = 0,
            int companyPlanCount = 0)
        {
            PlanRepository.CountByUserAsync(_userId, Arg.Any<CancellationToken>())
                .Returns(userPlanCount);
            PlanRepository.CountByCompanyAsync(_companyId, Arg.Any<CancellationToken>())
                .Returns(companyPlanCount);

            var vehicleRepository = Substitute.For<IVehicleRepository>();
            vehicleRepository.GetByIdAsync(_vehicleId, _companyId, Arg.Any<CancellationToken>())
                .Returns(CreateVehicle());

            var itemRepository = Substitute.For<IItemRepository>();
            itemRepository.GetByIdsAsync(Arg.Any<IEnumerable<Guid>>(), _companyId, Arg.Any<CancellationToken>())
                .Returns<IReadOnlyList<Item>>(_ => [CreateItem()]);

            var groupRepository = Substitute.For<ILoadingPlanItemGroupRepository>();

            var optimizationEngine = Substitute.For<IOptimizationEngine>();
            optimizationEngine.Run(Arg.Any<OptimizationInput>(), Arg.Any<CancellationToken>())
                .Returns(EmptyResult());

            var currentUserService = Substitute.For<ICurrentUserService>();
            currentUserService.UserId.Returns(_userId);
            currentUserService.CompanyId.Returns(_companyId);
            currentUserService.UserType.Returns(userType);

            var companyRepository = Substitute.For<ICompanyRepository>();
            companyRepository.GetByIdAsync(_companyId, Arg.Any<CancellationToken>())
                .Returns(new Company(_companyId, "Test Firma", subscriptionType));

            _handler = new CreatePlanCommandHandler(
                PlanRepository,
                vehicleRepository,
                itemRepository,
                groupRepository,
                optimizationEngine,
                currentUserService,
                Substitute.For<INotificationService>(),
                companyRepository);
        }

        public Task<Result<Guid>> HandleAsync()
        {
            var command = new CreatePlanCommand(
                PlanName: "Test Plan",
                VehicleId: _vehicleId,
                Items: [new CreatePlanItemRequest(_itemId, 1)]);

            return _handler.Handle(command, CancellationToken.None);
        }

        private static Vehicle CreateVehicle() => new(
            id: _vehicleId,
            vehicleName: "Test Araç",
            vehicleType: VehicleType.Trailer,
            plateNumber: "34TEST01",
            internalWidth: 240,
            internalHeight: 260,
            internalLength: 1360,
            maxWeightCapacity: 24000,
            layerCount: 1,
            loadingType: LoadingType.Rear,
            companyId: _companyId);

        private static Item CreateItem() => new(
            id: _itemId,
            sku: "SKU-1",
            name: "Test Ürün",
            productType: "Kutu",
            category: ItemCategory.Box,
            width: 40,
            height: 40,
            length: 60,
            weight: 10,
            fragilityType: FragilityType.NonFragile,
            isStackable: true,
            maxStackCount: 3,
            maxWeightOnTop: 50,
            allowedRotations: AllowedRotations.All,
            companyId: _companyId);

        private static OptimizationResult EmptyResult() => new(
            Placements: [],
            UnplacedItems: [],
            TotalWeight: 0,
            FillRate: 0,
            CenterOfGravityX: null,
            CenterOfGravityY: null,
            CenterOfGravityZ: null,
            WeightBalanceOffsetX: null,
            WeightBalanceOffsetZ: null);
    }
}
