using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class VehicleConfiguration : IEntityTypeConfiguration<Vehicle> {
    public void Configure(EntityTypeBuilder<Vehicle> builder) {
        builder.ToTable(
            "Vehicles",
            tableBuilder => {
                tableBuilder.HasCheckConstraint("CK_Vehicles_InternalWidth_Positive", "[InternalWidth] > 0");
                tableBuilder.HasCheckConstraint("CK_Vehicles_InternalHeight_Positive", "[InternalHeight] > 0");
                tableBuilder.HasCheckConstraint("CK_Vehicles_InternalLength_Positive", "[InternalLength] > 0");
                tableBuilder.HasCheckConstraint(
                    "CK_Vehicles_MaxWeightCapacity_Positive",
                    "[MaxWeightCapacity] > 0");
                tableBuilder.HasCheckConstraint("CK_Vehicles_LayerCount_Min1", "[LayerCount] >= 1");
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

        builder.Property(vehicle => vehicle.VehicleName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(vehicle => vehicle.VehicleType)
            .IsRequired();

        builder.Property(vehicle => vehicle.PlateNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(vehicle => vehicle.InternalWidth)
            .IsRequired()
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.InternalHeight)
            .IsRequired()
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.InternalLength)
            .IsRequired()
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.MaxWeightCapacity)
            .IsRequired()
            .HasPrecision(18, 4);

        builder.Property(vehicle => vehicle.LayerCount)
            .IsRequired();

        builder.Property(vehicle => vehicle.LoadingType)
            .IsRequired();

        builder.Property(vehicle => vehicle.CompanyId);

        builder.Property(vehicle => vehicle.Volume)
            .HasPrecision(18, 4)
            .HasComputedColumnSql(
                "(CAST([InternalWidth] AS decimal(18,4)) * CAST([InternalHeight] AS decimal(18,4)) * CAST([InternalLength] AS decimal(18,4))) / 1000000000.0",
                stored: true);

        builder.HasOne(vehicle => vehicle.Company)
            .WithMany(company => company.Vehicles)
            .HasForeignKey(vehicle => vehicle.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(vehicle => vehicle.IsDeleted)
            .HasDatabaseName("IX_Vehicles_IsDeleted");

        builder.HasIndex(vehicle => vehicle.CompanyId)
            .HasDatabaseName("IX_Vehicles_CompanyId");

        builder.HasIndex(vehicle => new { vehicle.CompanyId, vehicle.PlateNumber })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0")
            .HasDatabaseName("IX_Vehicles_CompanyId_PlateNumber");

        builder.HasQueryFilter(vehicle => !vehicle.IsDeleted);
    }
}
