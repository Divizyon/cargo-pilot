using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class LoadingPlanItemGroupConfiguration : IEntityTypeConfiguration<LoadingPlanItemGroup>
{
    public void Configure(EntityTypeBuilder<LoadingPlanItemGroup> builder)
    {
        builder.ToTable("LoadingPlanItemGroups");
        builder.HasKey(g => g.Id);

        builder.Property(g => g.CreatedAtUtc).IsRequired().HasDefaultValueSql("GETUTCDATE()");
        builder.Property(g => g.CreatedBy);
        builder.Property(g => g.UpdatedAtUtc);
        builder.Property(g => g.UpdatedBy);
        builder.Property(g => g.DeletedAtUtc);

        builder.Property(g => g.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.Property(g => g.IsActive).IsRequired().HasDefaultValue(true);

        builder.Property(g => g.LoadingPlanId).IsRequired();

        builder.Property(g => g.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(g => g.Color)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(g => g.UnloadingOrder)
            .IsRequired()
            .HasDefaultValue(0);

        builder.HasOne(g => g.LoadingPlan)
            .WithMany()
            .HasForeignKey(g => g.LoadingPlanId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(g => g.LoadingPlanId)
            .HasDatabaseName("IX_LoadingPlanItemGroups_LoadingPlanId");

        builder.HasQueryFilter(g => !g.IsDeleted);
    }
}
