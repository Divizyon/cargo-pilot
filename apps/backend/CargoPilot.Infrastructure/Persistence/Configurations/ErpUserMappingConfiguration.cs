using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class ErpUserMappingConfiguration : IEntityTypeConfiguration<ErpUserMapping> {
    public void Configure(EntityTypeBuilder<ErpUserMapping> builder) {
        builder.ToTable("ErpUserMappings");
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

        builder.Property(m => m.CargoPilotUserId)
            .IsRequired();

        builder.Property(m => m.ErpUserId)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(m => m.ErpUserEmail)
            .HasMaxLength(255);

        builder.Property(m => m.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50)
            .HasDefaultValue(Domain.Enums.ErpMappingStatus.Active);

        builder.Property(m => m.InvalidatedAt);

        builder.Property(m => m.InvalidationReason)
            .HasMaxLength(500);

        builder.HasOne(m => m.Integration)
            .WithMany(i => i.ErpUserMappings)
            .HasForeignKey(m => m.IntegrationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.CargoPilotUser)
            .WithMany()
            .HasForeignKey(m => m.CargoPilotUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(m => new { m.IntegrationId, m.CargoPilotUserId })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0")
            .HasDatabaseName("IX_ErpUserMappings_IntegrationId_CargoPilotUserId");

        builder.HasIndex(m => m.Status)
            .HasDatabaseName("IX_ErpUserMappings_Status");

        builder.HasQueryFilter(m => !m.IsDeleted);
    }
}
