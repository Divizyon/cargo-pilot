using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class IntegrationConfiguration : IEntityTypeConfiguration<Integration> {
    public void Configure(EntityTypeBuilder<Integration> builder) {
        builder.ToTable("Integrations");
        builder.HasKey(i => i.Id);

        builder.Property(i => i.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(i => i.CreatedBy);
        builder.Property(i => i.UpdatedAtUtc);
        builder.Property(i => i.UpdatedBy);

        builder.Property(i => i.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(i => i.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(i => i.CompanyId)
            .IsRequired();

        builder.Property(i => i.SystemName)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(i => i.ApiEndpoint)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(i => i.MappingTable)
            .HasColumnType("nvarchar(max)");

        builder.Property(i => i.SyncInterval);

        builder.Property(i => i.LastSyncDate);

        builder.Property(i => i.SyncFrequency);

        builder.Property(i => i.NextScheduledSyncAt);

        builder.Property(i => i.SyncStatus)
            .IsRequired()
            .HasDefaultValue(ErpSyncStatus.Idle);

        builder.Property(i => i.SyncStartedAtUtc);

        builder.HasOne(i => i.Company)
            .WithMany(c => c.Integrations)
            .HasForeignKey(i => i.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(i => i.CompanyId)
            .HasDatabaseName("IX_Integrations_CompanyId");

        builder.HasIndex(i => i.IsDeleted)
            .HasDatabaseName("IX_Integrations_IsDeleted");

        builder.HasQueryFilter(i => !i.IsDeleted);
    }
}
