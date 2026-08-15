using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class VehicleDoorConfiguration : IEntityTypeConfiguration<VehicleDoor> {
    public void Configure(EntityTypeBuilder<VehicleDoor> builder) {
        builder.ToTable(
            "VehicleDoors",
            tableBuilder =>
                // Her kapi tipi yalnizca kendi yuzunde bulunabilir. Small door
                // referans kapi yuzunde, top door tavanda; big door iki uzun
                // yuzden birinde (docs/COORDINATE_STANDARD.md §4).
                tableBuilder.HasCheckConstraint(
                    "CK_VehicleDoors_TipYuzEslesmesi",
                    "([Type] = 'Small' AND [Face] = 'LengthZ') OR " +
                    "([Type] = 'Big' AND [Face] IN ('ZeroX', 'WidthX')) OR " +
                    "([Type] = 'Top' AND [Face] = 'HeightY')"));

        builder.HasKey(door => door.Id);

        builder.Property(door => door.VehicleId)
            .IsRequired();

        // Enum'lar metin saklanir: sayisal deger kaydiginda veri sessizce baska bir
        // yuze kayardi, metin okunabilir ve kaymaya kapali.
        builder.Property(door => door.Type)
            .HasConversion<string>()
            .HasMaxLength(16)
            .IsRequired();

        builder.Property(door => door.Face)
            .HasConversion<string>()
            .HasMaxLength(16)
            .IsRequired();

        builder.HasOne(door => door.Vehicle)
            .WithMany(vehicle => vehicle.Doors)
            .HasForeignKey(door => door.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);

        // Her tipten en fazla bir kapi: bir small, bir big, bir top.
        //
        // Bu, yukleme kuralinin on kosulu (docs/COORDINATE_STANDARD.md §7). Iki
        // big door olsaydi x ekseninde, iki small door olsaydi z ekseninde
        // serbest kose kalmaz ve yuklemenin baslayacagi bir nokta bulunamazdi.
        // Tip-yuz eslesmesiyle birlikte (0,0,0) veya (width,0,0) koselerinden
        // en az birinin kapiya degmemesi garanti edilir.
        builder.HasIndex(door => new { door.VehicleId, door.Type })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0")
            .HasDatabaseName("IX_VehicleDoors_TekKapiTipi");

        builder.HasQueryFilter(door => !door.IsDeleted);
    }
}
