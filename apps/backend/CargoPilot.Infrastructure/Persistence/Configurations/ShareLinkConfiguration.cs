using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class ShareLinkConfiguration : IEntityTypeConfiguration<ShareLink>
{
    public void Configure(EntityTypeBuilder<ShareLink> builder)
    {
        builder.ToTable("ShareLinks");
        builder.HasKey(sl => sl.Id);

        builder.Property(sl => sl.PlanId).IsRequired();
        builder.Property(sl => sl.CreatedByUserId).IsRequired();

        builder.Property(sl => sl.Token)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(sl => sl.Validity)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(sl => sl.ExpiresAt);

        builder.Property(sl => sl.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(sl => sl.ViewCount)
            .IsRequired()
            .HasDefaultValue(0);

        builder.HasIndex(sl => sl.Token)
            .IsUnique()
            .HasDatabaseName("UX_ShareLinks_Token");

        builder.HasIndex(sl => sl.PlanId)
            .HasDatabaseName("IX_ShareLinks_PlanId");

        builder.HasOne(sl => sl.Plan)
            .WithMany()
            .HasForeignKey(sl => sl.PlanId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
