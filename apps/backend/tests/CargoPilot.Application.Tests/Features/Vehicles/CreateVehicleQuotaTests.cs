using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Application.Features.Vehicles.CreateVehicle;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.Vehicles;

/// <summary>
/// BIZ-01 yayılımı: Araç kotasının sabit Free yerine gerçek abonelik tipine,
/// kurumsal kullanıcıda ise şirket sayacına göre uygulandığını doğrular.
/// Free 10, Pro 100 araçtır (Common/Config/SubscriptionLimits).
/// </summary>
public sealed class CreateVehicleQuotaTests
{
    private const string LimitExceededCode = "Vehicle.LimitExceeded";
    private const int FreeVehicleLimit = 10;

    private static readonly Guid _userId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid _companyId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task Pro_Abonelikli_Bireysel_Kullanici_Free_Limitinin_Ustunde_Arac_Ekleyebilir()
    {
        var harness = new Harness(UserType.Individual, SubscriptionType.Pro, userVehicleCount: 50);

        var result = await harness.HandleAsync();

        Assert.True(result.IsSuccess);
        harness.VehicleRepository.Received(1).Add(Arg.Any<Vehicle>());
    }

    [Fact]
    public async Task Bireysel_Kullanici_Free_Kotasi_Dolunca_LimitExceeded_Doner()
    {
        var harness = new Harness(UserType.Individual, SubscriptionType.Free, userVehicleCount: FreeVehicleLimit);

        var result = await harness.HandleAsync();

        AssertLimitExceeded(result);
        harness.VehicleRepository.DidNotReceiveWithAnyArgs().Add(default!);
    }

    [Fact]
    public async Task Kurumsal_Kullanici_Sirket_Kotasi_Dolunca_LimitExceeded_Doner()
    {
        var harness = new Harness(UserType.CompanyAdmin, SubscriptionType.Free, companyVehicleCount: FreeVehicleLimit);

        var result = await harness.HandleAsync();

        AssertLimitExceeded(result);
        harness.VehicleRepository.DidNotReceiveWithAnyArgs().Add(default!);
    }

    [Fact]
    public async Task Kurumsal_Kullanici_Kendi_Sayaci_Dolu_Olsa_Da_Sirket_Kotasi_Uygulanir()
    {
        var harness = new Harness(
            UserType.CompanyAdmin,
            SubscriptionType.Free,
            userVehicleCount: FreeVehicleLimit,
            companyVehicleCount: 2);

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
        public IVehicleRepository VehicleRepository { get; } = Substitute.For<IVehicleRepository>();

        private readonly CreateVehicleCommandHandler _handler;

        public Harness(
            UserType userType,
            SubscriptionType subscriptionType,
            int userVehicleCount = 0,
            int companyVehicleCount = 0)
        {
            VehicleRepository.CountByUserAsync(_userId, Arg.Any<CancellationToken>())
                .Returns(userVehicleCount);
            VehicleRepository.CountByCompanyAsync(_companyId, Arg.Any<CancellationToken>())
                .Returns(companyVehicleCount);

            var currentUserService = Substitute.For<ICurrentUserService>();
            currentUserService.UserId.Returns(_userId);
            currentUserService.CompanyId.Returns(_companyId);
            currentUserService.UserType.Returns(userType);

            var companyRepository = Substitute.For<ICompanyRepository>();
            companyRepository.GetByIdAsync(_companyId, Arg.Any<CancellationToken>())
                .Returns(new Company(_companyId, "Test Firma", subscriptionType));

            _handler = new CreateVehicleCommandHandler(
                VehicleRepository,
                currentUserService,
                Substitute.For<INotificationService>(),
                companyRepository);
        }

        public Task<Result<Guid>> HandleAsync()
        {
            var command = new CreateVehicleCommand(
                VehicleName: "Test Araç",
                Description: null,
                VehicleType: VehicleType.Trailer,
                PlateNumber: null,
                InternalWidth: 240,
                InternalHeight: 260,
                InternalLength: 1360,
                MaxWeightCapacity: 24000,
                LayerCount: 1,
                LoadingType: LoadingType.Rear,
                KingPinDistanceMm: null,
                KingPinTareWeightKg: null,
                KingPinMaxLoadKg: null,
                MainAxleDistanceMm: null,
                MainAxleTareWeightKg: null,
                MainAxleMaxLoadKg: null,
                AdditionalAxleDistanceMm: null,
                AdditionalAxleTareWeightKg: null,
                AdditionalAxleMaxLoadKg: null);

            return _handler.Handle(command, CancellationToken.None);
        }
    }
}
