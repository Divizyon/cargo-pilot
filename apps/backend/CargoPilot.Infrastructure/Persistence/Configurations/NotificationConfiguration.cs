using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("Notifications");
        builder.HasKey(n => n.Id);

        builder.Property(n => n.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(n => n.CreatedBy);
        builder.Property(n => n.UpdatedAtUtc);
        builder.Property(n => n.UpdatedBy);

        builder.Property(n => n.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(n => n.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(n => n.UserId)
            .IsRequired();

        builder.Property(n => n.CompanyId);

        builder.Property(n => n.Type)
            .IsRequired()
            .HasMaxLength(64)
            .HasConversion<string>();

        builder.Property(n => n.Severity)
            .IsRequired()
            .HasMaxLength(32)
            .HasConversion<string>();

        builder.Property(n => n.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(n => n.Description)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(n => n.ActionUrl)
            .HasMaxLength(500);

        builder.Property(n => n.IsRead)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(n => n.ReadAt);

        builder.HasIndex(n => new { n.UserId, n.IsDeleted });
        builder.HasIndex(n => new { n.CompanyId, n.Type, n.CreatedAtUtc });

        builder.HasQueryFilter(n => !n.IsDeleted);
    }
}
