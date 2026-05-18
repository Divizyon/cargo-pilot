using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class LoadingPlanPlacementConfiguration : IEntityTypeConfiguration<LoadingPlanPlacement> {
    public void Configure(EntityTypeBuilder<LoadingPlanPlacement> builder) {
        builder.ToTable("LoadingPlanPlacements");
        builder.HasKey(placement => placement.Id);

        builder.Property(placement => placement.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(placement => placement.CreatedBy);
        builder.Property(placement => placement.UpdatedAtUtc);
        builder.Property(placement => placement.UpdatedBy);
        builder.Property(placement => placement.DeletedAtUtc);

        builder.Property(placement => placement.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(placement => placement.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(placement => placement.LoadingPlanId)
            .IsRequired();

        builder.Property(placement => placement.ItemId)
            .IsRequired();

        builder.Property(placement => placement.PositionX)
            .IsRequired()
            .HasPrecision(18, 4);

        builder.Property(placement => placement.PositionY)
            .IsRequired()
            .HasPrecision(18, 4);

        builder.Property(placement => placement.PositionZ)
            .IsRequired()
            .HasPrecision(18, 4);

        builder.Property(placement => placement.Rotation)
            .IsRequired();

        builder.HasOne(placement => placement.LoadingPlan)
            .WithMany()
            .HasForeignKey(placement => placement.LoadingPlanId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(placement => placement.Item)
            .WithMany()
            .HasForeignKey(placement => placement.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasAlternateKey(placement => new { placement.Id, placement.LoadingPlanId })
            .HasName("AK_LoadingPlanPlacements_Id_LoadingPlanId");

        builder.HasIndex(placement => placement.LoadingPlanId)
            .HasDatabaseName("IX_LoadingPlanPlacements_LoadingPlanId");

        builder.HasIndex(placement => placement.IsDeleted)
            .HasDatabaseName("IX_LoadingPlanPlacements_IsDeleted");

        builder.HasQueryFilter(placement => !placement.IsDeleted);
    }
}
