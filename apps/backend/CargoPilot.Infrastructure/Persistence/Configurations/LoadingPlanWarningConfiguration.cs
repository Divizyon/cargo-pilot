using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class LoadingPlanWarningConfiguration : IEntityTypeConfiguration<LoadingPlanWarning> {
    public void Configure(EntityTypeBuilder<LoadingPlanWarning> builder) {
        builder.ToTable("LoadingPlanWarnings");
        builder.HasKey(warning => warning.Id);

        builder.Property(warning => warning.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(warning => warning.CreatedBy);
        builder.Property(warning => warning.UpdatedAtUtc);
        builder.Property(warning => warning.UpdatedBy);
        builder.Property(warning => warning.DeletedAtUtc);

        builder.Property(warning => warning.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(warning => warning.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(warning => warning.LoadingPlanId)
            .IsRequired();

        builder.Property(warning => warning.Code)
            .HasMaxLength(64)
            .IsRequired();

        builder.Property(warning => warning.Message)
            .HasMaxLength(1000)
            .IsRequired();

        builder.Property(warning => warning.RelatedItemId);
        builder.Property(warning => warning.RelatedPlacementId);

        builder.HasOne(warning => warning.LoadingPlan)
            .WithMany()
            .HasForeignKey(warning => warning.LoadingPlanId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(warning => warning.RelatedItem)
            .WithMany()
            .HasForeignKey(warning => warning.RelatedItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(warning => warning.RelatedPlacement)
            .WithMany()
            .HasForeignKey(warning => new { warning.RelatedPlacementId, warning.LoadingPlanId })
            .HasPrincipalKey(nameof(LoadingPlanPlacement.Id), nameof(LoadingPlanPlacement.LoadingPlanId))
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(warning => warning.LoadingPlanId)
            .HasDatabaseName("IX_LoadingPlanWarnings_LoadingPlanId");

        builder.HasIndex(warning => warning.IsDeleted)
            .HasDatabaseName("IX_LoadingPlanWarnings_IsDeleted");

        builder.HasQueryFilter(warning => !warning.IsDeleted);
    }
}
