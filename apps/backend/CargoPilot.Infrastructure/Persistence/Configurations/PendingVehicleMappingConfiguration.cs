using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class PendingVehicleMappingConfiguration : IEntityTypeConfiguration<PendingVehicleMapping>
{
    public void Configure(EntityTypeBuilder<PendingVehicleMapping> builder)
    {
        builder.ToTable("PendingVehicleMappings");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(x => x.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(x => x.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(x => x.ErpId)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.VehicleName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.PlateNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.RawPayload)
            .HasColumnType("nvarchar(max)");

        builder.Property(x => x.CompanyId);
        builder.Property(x => x.IntegrationId);

        builder.HasOne(x => x.Integration)
            .WithMany()
            .HasForeignKey(x => x.IntegrationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.IsDeleted)
            .HasDatabaseName("IX_PendingVehicleMappings_IsDeleted");

        builder.HasIndex(x => new { x.IntegrationId, x.ErpId })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0")
            .HasDatabaseName("IX_PendingVehicleMappings_IntegrationId_ErpId");

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}