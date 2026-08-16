using CargoPilot.Application.Abstractions;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Optimization;
using CargoPilot.Application.Features.Vehicles.DuplicateVehicle;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using FluentAssertions;
using NSubstitute;

namespace CargoPilot.Application.Tests.Features.Vehicles;

/// <summary>
/// Denetim S-03: kopyalama kapi listesini tasimiyordu. Kopya kapisiz kalinca
/// <see cref="LoadingCorner.FillFromMaxX"/> bos listede false donuyor ve yan
/// kapisi x = 0 olan aracin kopyasinda yukleme kapinin tam onunden basliyordu
/// (docs/COORDINATE_STANDARD.md §7).
///
/// Ayrisma gorunmezdi: frontend bos listede tekil LoadingType'tan turetip
/// kapiyi dogru cizerken motor baska bir koseden yukluyordu.
/// </summary>
public sealed class DuplicateVehicleDoorsTests
{
    private static readonly Guid CompanyId = Guid.Parse("22222222-2222-4222-8222-222222222222");
    private static readonly Guid SourceId = Guid.Parse("33333333-3333-4333-8333-333333333333");

    private readonly IVehicleRepository _vehicleRepository = Substitute.For<IVehicleRepository>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();

    private DuplicateVehicleCommandHandler CreateSut()
    {
        _currentUserService.CompanyId.Returns(CompanyId);
        return new DuplicateVehicleCommandHandler(_vehicleRepository, _currentUserService);
    }

    private static Vehicle SourceVehicle(LoadingType loadingType = LoadingType.SideLeft)
        => new(
            id: SourceId,
            vehicleName: "Kaynak Dorse",
            vehicleType: VehicleType.Trailer,
            plateNumber: "34ABC123",
            internalWidth: 240m,
            internalHeight: 260m,
            internalLength: 1360m,
            maxWeightCapacity: 26_000m,
            layerCount: 3,
            loadingType: loadingType,
            companyId: CompanyId);

    private async Task<Vehicle> DuplicateAsync(Vehicle source)
    {
        _vehicleRepository.GetByIdAsync(SourceId, CompanyId, Arg.Any<CancellationToken>()).Returns(source);
        _vehicleRepository
            .ExistsByPlateNumberAsync(Arg.Any<string>(), CompanyId, Arg.Any<CancellationToken>())
            .Returns(false);

        Vehicle? added = null;
        _vehicleRepository.When(r => r.Add(Arg.Any<Vehicle>())).Do(call => added = call.Arg<Vehicle>());

        var result = await CreateSut().Handle(
            new DuplicateVehicleCommand(SourceId, "Kopya Dorse", "34XYZ789"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        added.Should().NotBeNull();
        return added!;
    }

    [Fact]
    public async Task Kaynak_KapiListesi_Kopyaya_Tasinir()
    {
        var source = SourceVehicle();
        source.ReplaceDoors([
            (DoorType.Small, DoorFace.LengthZ),
            (DoorType.Big, DoorFace.ZeroX),
        ]);

        var duplicate = await DuplicateAsync(source);

        duplicate.Doors.Should().HaveCount(2);
        duplicate.Doors.Should().Contain(d => d.Type == DoorType.Small && d.Face == DoorFace.LengthZ);
        duplicate.Doors.Should().Contain(d => d.Type == DoorType.Big && d.Face == DoorFace.ZeroX);
    }

    /// <remarks>
    /// Asil regresyon: kopyanin yukleme baslangic kosesi kaynakla ayni olmali.
    /// Kapilar kopyalanmadiginda bu deger sessizce false'a dusuyordu.
    /// </remarks>
    [Fact]
    public async Task Kopyanin_YuklemeBaslangicKosesi_Kaynakla_Ayni()
    {
        var source = SourceVehicle();
        source.ReplaceDoors([(DoorType.Big, DoorFace.ZeroX)]);

        var duplicate = await DuplicateAsync(source);

        LoadingCorner.FillFromMaxX(duplicate.Doors)
            .Should().Be(LoadingCorner.FillFromMaxX(source.Doors))
            .And.BeTrue();
    }

    /// <remarks>
    /// Kapilari henuz doldurulmamis eski kayitlar icin tekil LoadingType'tan
    /// turetilir — CreateVehicle ile ayni gecis yolu.
    /// </remarks>
    [Fact]
    public async Task Kaynakta_Kapi_Yoksa_LoadingTypeDan_Turetilir()
    {
        var duplicate = await DuplicateAsync(SourceVehicle(LoadingType.SideLeft));

        duplicate.Doors.Should().ContainSingle();
        duplicate.Doors.Single().Type.Should().Be(DoorType.Big);
        duplicate.Doors.Single().Face.Should().Be(DoorFace.ZeroX);
    }

    [Fact]
    public async Task Kopyalanan_Kapilar_Kopyanin_Kimligine_Baglanir()
    {
        var source = SourceVehicle();
        source.ReplaceDoors([(DoorType.Small, DoorFace.LengthZ)]);

        var duplicate = await DuplicateAsync(source);

        duplicate.Doors.Should().OnlyContain(d => d.VehicleId == duplicate.Id);
        duplicate.Id.Should().NotBe(SourceId);
    }

    /// <remarks>
    /// Plakasiz arac (konteyner) kopyalanabilmeli. Kopyalama diyalogu "Plaka
    /// opsiyoneldir" diyip bos gonderiyordu ama istek DTO'su [Required] tasidigi
    /// icin model baglamada 400'e dusuyordu; plakasiz arac hic kopyalanamiyordu.
    /// Denetim kapsaminin disinda, kullanici testinde cikti.
    /// </remarks>
    [Fact]
    public async Task Plakasiz_Arac_Kopyalanabilir()
    {
        var source = SourceVehicle();
        source.ReplaceDoors([(DoorType.Small, DoorFace.LengthZ)]);

        _vehicleRepository.GetByIdAsync(SourceId, CompanyId, Arg.Any<CancellationToken>()).Returns(source);

        Vehicle? added = null;
        _vehicleRepository.When(r => r.Add(Arg.Any<Vehicle>())).Do(call => added = call.Arg<Vehicle>());

        var result = await CreateSut().Handle(
            new DuplicateVehicleCommand(SourceId, "Kopya Konteyner", PlateNumber: null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        added!.PlateNumber.Should().BeNull();
    }

    /// <remarks>
    /// Bos plaka NULL olarak saklanir; bos dize kaydedilseydi plakasiz iki arac
    /// birbirinin "ayni plakalisi" sayilirdi.
    /// </remarks>
    [Fact]
    public async Task Bos_Plaka_Null_Olarak_Saklanir()
    {
        var source = SourceVehicle();
        _vehicleRepository.GetByIdAsync(SourceId, CompanyId, Arg.Any<CancellationToken>()).Returns(source);

        Vehicle? added = null;
        _vehicleRepository.When(r => r.Add(Arg.Any<Vehicle>())).Do(call => added = call.Arg<Vehicle>());

        var result = await CreateSut().Handle(
            new DuplicateVehicleCommand(SourceId, "Kopya", "   "),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        added!.PlateNumber.Should().BeNull();
    }

    /// <remarks>
    /// Plaka verilmediginde benzersizlik hic sorulmamali; aksi halde plakasiz
    /// araclar birbiriyle catisiyor gorunurdu.
    /// </remarks>
    [Fact]
    public async Task Plaka_Yokken_Benzersizlik_Sorgulanmaz()
    {
        var source = SourceVehicle();
        _vehicleRepository.GetByIdAsync(SourceId, CompanyId, Arg.Any<CancellationToken>()).Returns(source);

        await CreateSut().Handle(
            new DuplicateVehicleCommand(SourceId, "Kopya", null),
            CancellationToken.None);

        await _vehicleRepository.DidNotReceive().ExistsByPlateNumberAsync(
            Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Gercek_Plaka_Verildiginde_Benzersizlik_Korunur()
    {
        var source = SourceVehicle();
        _vehicleRepository.GetByIdAsync(SourceId, CompanyId, Arg.Any<CancellationToken>()).Returns(source);
        _vehicleRepository
            .ExistsByPlateNumberAsync("34XYZ789", CompanyId, Arg.Any<CancellationToken>())
            .Returns(true);

        var result = await CreateSut().Handle(
            new DuplicateVehicleCommand(SourceId, "Kopya", "34XYZ789"),
            CancellationToken.None);

        result.IsSuccess.Should().BeFalse();
        result.Error!.Code.Should().Be("Vehicle.PlateNumberAlreadyExists");
    }
}
