using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class VehicleConfiguration : IEntityTypeConfiguration<Vehicle> {
    public void Configure(EntityTypeBuilder<Vehicle> builder) {
        builder.ToTable(
            "Vehicles",
            tableBuilder => {
                tableBuilder.HasCheckConstraint("CK_Vehicles_InternalWidth_Positive", "[IsDraft] = 1 OR ([InternalWidth] IS NOT NULL AND [InternalWidth] > 0)");
                tableBuilder.HasCheckConstraint("CK_Vehicles_InternalHeight_Positive", "[IsDraft] = 1 OR ([InternalHeight] IS NOT NULL AND [InternalHeight] > 0)");
                tableBuilder.HasCheckConstraint("CK_Vehicles_InternalLength_Positive", "[IsDraft] = 1 OR ([InternalLength] IS NOT NULL AND [InternalLength] > 0)");
                tableBuilder.HasCheckConstraint(
                    "CK_Vehicles_MaxWeightCapacity_Positive",
                    "[IsDraft] = 1 OR ([MaxWeightCapacity] IS NOT NULL AND [MaxWeightCapacity] > 0)");
                tableBuilder.HasCheckConstraint("CK_Vehicles_LayerCount_Min1", "[IsDraft] = 1 OR [LayerCount] >= 1");
                tableBuilder.HasCheckConstraint(
                    "CK_Vehicles_KingPinDistanceMm_Positive_WhenSet",
                    "[KingPinDistanceMm] IS NULL OR [KingPinDistanceMm] > 0");
                tableBuilder.HasCheckConstraint(
                    "CK_Vehicles_KingPinTareWeightKg_Positive_WhenSet",
                    "[KingPinTareWeightKg] IS NULL OR [KingPinTareWeightKg] > 0");
                tableBuilder.HasCheckConstraint(
                    "CK_Vehicles_KingPinMaxLoadKg_Positive_WhenSet",
                    "[KingPinMaxLoadKg] IS NULL OR [KingPinMaxLoadKg] > 0");
                tableBuilder.HasCheckConstraint(
                    "CK_Vehicles_MainAxleDistanceMm_Positive_WhenSet",
                    "[MainAxleDistanceMm] IS NULL OR [MainAxleDistanceMm] > 0");
                tableBuilder.HasCheckConstraint(
                    "CK_Vehicles_MainAxleTareWeightKg_Positive_WhenSet",
                    "[MainAxleTareWeightKg] IS NULL OR [MainAxleTareWeightKg] > 0");
                tableBuilder.HasCheckConstraint(
                    "CK_Vehicles_MainAxleMaxLoadKg_Positive_WhenSet",
                    "[MainAxleMaxLoadKg] IS NULL OR [MainAxleMaxLoadKg] > 0");
                tableBuilder.HasCheckConstraint(
                    "CK_Vehicles_AdditionalAxleDistanceMm_Positive_WhenSet",
                    "[AdditionalAxleDistanceMm] IS NULL OR [AdditionalAxleDistanceMm] > 0");
                tableBuilder.HasCheckConstraint(
                    "CK_Vehicles_AdditionalAxleTareWeightKg_Positive_WhenSet",
                    "[AdditionalAxleTareWeightKg] IS NULL OR [AdditionalAxleTareWeightKg] > 0");
                tableBuilder.HasCheckConstraint(
                    "CK_Vehicles_AdditionalAxleMaxLoadKg_Positive_WhenSet",
                    "[AdditionalAxleMaxLoadKg] IS NULL OR [AdditionalAxleMaxLoadKg] > 0");
            });
        builder.HasKey(vehicle => vehicle.Id);

        builder.Property(vehicle => vehicle.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(vehicle => vehicle.CreatedBy);
        builder.Property(vehicle => vehicle.UpdatedAtUtc);
        builder.Property(vehicle => vehicle.UpdatedBy);
        builder.Property(vehicle => vehicle.DeletedAtUtc);

        builder.Property(vehicle => vehicle.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(vehicle => vehicle.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(vehicle => vehicle.IsDraft)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(vehicle => vehicle.VehicleName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(vehicle => vehicle.Description)
            .HasMaxLength(500);

        builder.Property(vehicle => vehicle.VehicleType)
            .IsRequired();

        builder.Property(vehicle => vehicle.PlateNumber)
            .HasMaxLength(50)
            .IsRequired(false);

        builder.Property(vehicle => vehicle.InternalWidth)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.InternalHeight)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.InternalLength)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.MaxWeightCapacity)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.KingPinDistanceMm)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.KingPinTareWeightKg)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.KingPinMaxLoadKg)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.MainAxleDistanceMm)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.MainAxleTareWeightKg)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.MainAxleMaxLoadKg)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.AdditionalAxleDistanceMm)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.AdditionalAxleTareWeightKg)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.AdditionalAxleMaxLoadKg)
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.Description)
            .HasMaxLength(500);

        builder.Property(vehicle => vehicle.LayerCount)
            .IsRequired();

        builder.Property(vehicle => vehicle.LoadingType)
            .IsRequired();

        builder.Property(vehicle => vehicle.CompanyId);

        builder.Property(vehicle => vehicle.ErpId)
            .HasMaxLength(200);

        builder.Property(vehicle => vehicle.IntegrationId);

        builder.Property(vehicle => vehicle.Volume)
            .HasPrecision(18, 4)
            .HasComputedColumnSql(
                "(CAST([InternalWidth] AS decimal(18,4)) * CAST([InternalHeight] AS decimal(18,4)) * CAST([InternalLength] AS decimal(18,4))) / 1000000000.0",
                stored: true);

        builder.HasOne(vehicle => vehicle.Company)
            .WithMany(company => company.Vehicles)
            .HasForeignKey(vehicle => vehicle.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(vehicle => vehicle.Integration)
            .WithMany()
            .HasForeignKey(vehicle => vehicle.IntegrationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(vehicle => vehicle.IsDeleted)
            .HasDatabaseName("IX_Vehicles_IsDeleted");

        builder.HasIndex(vehicle => vehicle.CompanyId)
            .HasDatabaseName("IX_Vehicles_CompanyId");

        builder.HasIndex(vehicle => new { vehicle.CompanyId, vehicle.PlateNumber })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0 AND [PlateNumber] IS NOT NULL")
            .HasDatabaseName("IX_Vehicles_CompanyId_PlateNumber");

        builder.HasQueryFilter(vehicle => !vehicle.IsDeleted);
    }
}
