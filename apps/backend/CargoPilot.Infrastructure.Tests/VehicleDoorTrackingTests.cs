using CargoPilot.Application.Abstractions;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using CargoPilot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace CargoPilot.Infrastructure.Tests;

/// <summary>
/// Mevcut bir aracin kapilari degistirildiginde yeni kapilarin INSERT edilmesini
/// kilitler.
///
/// EF, Guid anahtarli varliklari varsayilan olarak store-generated sayar ve
/// anahtari dolu gelen kaydi "veritabaninda zaten var" diye yorumlar. Izlenen bir
/// Vehicle'in Doors koleksiyonuna eklenen kapi bu yuzden Added yerine Modified
/// olarak izleniyor, EF de INSERT yerine UPDATE uretiyordu. Olmayan satiri
/// guncelledigi icin 0 satir etkileniyor ve arac guncelleme
/// DbUpdateConcurrencyException ile 500 donuyordu.
///
/// Arac olusturulurken sorun gorunmuyordu: orada Vehicle'in kendisi de Added
/// oldugu icin tum graf Added'a dusuyor. Bu test tam olarak farkin olustugu yolu
/// kurar — once izlenen (var olan) bir arac, sonra kapi degisimi.
///
/// Veritabani gerekmez: degisiklik izleyicisi tamamen bellekte calisir.
/// </summary>
public sealed class VehicleDoorTrackingTests
{
    private sealed class FakeUser : ICurrentUserService
    {
        public Guid? UserId => Guid.Parse("11111111-1111-4111-8111-111111111111");
        public Guid? CompanyId => Guid.Parse("22222222-2222-4222-8222-222222222222");
        public UserType? UserType => Domain.Enums.UserType.CompanyAdmin;
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            // Baglanti hic acilmaz; yalnizca model ve degisiklik izleyicisi kullanilir.
            .UseSqlServer("Server=yok;Database=yok;Trusted_Connection=True;")
            .Options;

        return new AppDbContext(options, new FakeUser());
    }

    private static Vehicle ExistingVehicle()
        => new(
            id: Guid.Parse("33333333-3333-4333-8333-333333333333"),
            vehicleName: "Ana Dorse",
            vehicleType: VehicleType.Trailer,
            plateNumber: "34ABC123",
            internalWidth: 240m,
            internalHeight: 260m,
            internalLength: 1360m,
            maxWeightCapacity: 26_000m,
            layerCount: 3,
            loadingType: LoadingType.Rear,
            companyId: Guid.Parse("22222222-2222-4222-8222-222222222222"));

    [Fact]
    public void MevcutAracaEklenenKapi_AddedOlarakIzlenir()
    {
        using var context = CreateContext();

        var vehicle = ExistingVehicle();
        vehicle.ReplaceDoors([(DoorType.Small, DoorFace.LengthZ)]);

        // Veritabanindan yuklenmis arac: kendisi ve mevcut kapisi Unchanged.
        context.Attach(vehicle);
        Assert.All(context.ChangeTracker.Entries(), e => Assert.Equal(EntityState.Unchanged, e.State));

        vehicle.ReplaceDoors([
            (DoorType.Small, DoorFace.LengthZ),
            (DoorType.Big, DoorFace.ZeroX),
        ]);
        context.ChangeTracker.DetectChanges();

        var doorStates = context.ChangeTracker.Entries<VehicleDoor>()
            .GroupBy(e => e.State)
            .ToDictionary(g => g.Key, g => g.Count());

        // Iki yeni kapi INSERT edilmeli, eski kapi silinmeli.
        Assert.Equal(2, doorStates.GetValueOrDefault(EntityState.Added));
        Assert.Equal(1, doorStates.GetValueOrDefault(EntityState.Deleted));
        Assert.Equal(0, doorStates.GetValueOrDefault(EntityState.Modified));
    }

    [Fact]
    public void KapiAnahtari_IstemciTarafindaUretilir()
    {
        using var context = CreateContext();

        var idProperty = context.Model
            .FindEntityType(typeof(VehicleDoor))!
            .FindProperty(nameof(VehicleDoor.Id))!;

        // Store-generated kalsaydi EF dolu anahtari "zaten var" sayar ve
        // yeni kapi icin UPDATE uretirdi.
        Assert.Equal(ValueGenerated.Never, idProperty.ValueGenerated);
    }

    [Fact]
    public void YeniAracinKapilari_ZatenAddedOlurdu()
    {
        using var context = CreateContext();

        var vehicle = ExistingVehicle();
        vehicle.ReplaceDoors([(DoorType.Small, DoorFace.LengthZ)]);

        // Arac olusturma yolu: tum graf Added. Hatanin neden burada
        // gorunmedigini kilitler.
        context.Add(vehicle);

        Assert.All(
            context.ChangeTracker.Entries<VehicleDoor>(),
            e => Assert.Equal(EntityState.Added, e.State));
    }
}
