using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class PendingItemMappingConfiguration : IEntityTypeConfiguration<PendingItemMapping> {
    public void Configure(EntityTypeBuilder<PendingItemMapping> builder) {
        builder.ToTable("PendingItemMappings");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(m => m.CreatedBy);
        builder.Property(m => m.UpdatedAtUtc);
        builder.Property(m => m.UpdatedBy);

        builder.Property(m => m.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(m => m.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(m => m.IntegrationId)
            .IsRequired();

        builder.Property(m => m.ErpId)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(m => m.ErpSku)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(m => m.ErpProductName)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(m => m.ErpRawDataJson)
            .IsRequired()
            .HasColumnType("nvarchar(max)");

        builder.Property(m => m.CargoPilotItemId);

        builder.Property(m => m.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.HasOne(m => m.Integration)
            .WithMany()
            .HasForeignKey(m => m.IntegrationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.CargoPilotItem)
            .WithMany()
            .HasForeignKey(m => m.CargoPilotItemId)
            .OnDelete(DeleteBehavior.SetNull)
            .IsRequired(false);

        builder.HasIndex(m => new { m.IntegrationId, m.ErpId })
            .HasDatabaseName("IX_PendingItemMappings_IntegrationId_ErpId");

        builder.HasIndex(m => m.IntegrationId)
            .HasDatabaseName("IX_PendingItemMappings_IntegrationId");

        builder.HasQueryFilter(m => !m.IsDeleted);
    }
}
