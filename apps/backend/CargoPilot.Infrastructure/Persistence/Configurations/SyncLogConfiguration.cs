using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class SyncLogConfiguration : IEntityTypeConfiguration<SyncLog> {
    public void Configure(EntityTypeBuilder<SyncLog> builder) {
        builder.ToTable("SyncLogs");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(s => s.CreatedBy);
        builder.Property(s => s.UpdatedAtUtc);
        builder.Property(s => s.UpdatedBy);

        builder.Property(s => s.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(s => s.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(s => s.IntegrationId)
            .IsRequired();

        builder.Property(s => s.StartedAt)
            .IsRequired();

        builder.Property(s => s.CompletedAt);

        builder.Property(s => s.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(s => s.SyncedRecordCount)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(s => s.ErrorMessage)
            .HasMaxLength(2000);

        builder.HasOne(s => s.Integration)
            .WithMany(i => i.SyncLogs)
            .HasForeignKey(s => s.IntegrationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(s => s.IntegrationId)
            .HasDatabaseName("IX_SyncLogs_IntegrationId");

        builder.HasQueryFilter(s => !s.IsDeleted);
    }
}
