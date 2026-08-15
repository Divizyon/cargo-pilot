using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class VehicleDoorConfiguration : IEntityTypeConfiguration<VehicleDoor> {
    public void Configure(EntityTypeBuilder<VehicleDoor> builder) {
        builder.ToTable(
            "VehicleDoors",
            tableBuilder => {
                // Aciklik payi yalnizca big door'da anlamli; digerlerinde sifir olmali.
                // Domain kurali burada da tutulur ki dogrudan SQL ile bozulamasin.
                tableBuilder.HasCheckConstraint(
                    "CK_VehicleDoors_Clearance_OnlyBigDoor",
                    "[ClearanceCm] = 0 OR [Type] = 'Big'");
                tableBuilder.HasCheckConstraint(
                    "CK_VehicleDoors_Clearance_NonNegative",
                    "[ClearanceCm] >= 0");
            });

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

        builder.Property(door => door.ClearanceCm)
            .HasPrecision(18, 4)
            .IsRequired();

        builder.HasOne(door => door.Vehicle)
            .WithMany(vehicle => vehicle.Doors)
            .HasForeignKey(door => door.VehicleId)
            .OnDelete(DeleteBehavior.Cascade);

        // Ayni yuzde ayni tipten iki kapi olamaz.
        builder.HasIndex(door => new { door.VehicleId, door.Type, door.Face })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");

        builder.HasQueryFilter(door => !door.IsDeleted);
    }
}
