using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class LoadingPlanInputItemConfiguration : IEntityTypeConfiguration<LoadingPlanInputItem>
{
    public void Configure(EntityTypeBuilder<LoadingPlanInputItem> builder)
    {
        builder.ToTable("LoadingPlanInputItems", tableBuilder =>
            tableBuilder.HasCheckConstraint(
                "CK_LoadingPlanInputItems_Quantity_Positive",
                "[Quantity] > 0"));

        builder.HasKey(i => i.Id);

        builder.Property(i => i.CreatedAtUtc).IsRequired().HasDefaultValueSql("GETUTCDATE()");
        builder.Property(i => i.CreatedBy);
        builder.Property(i => i.UpdatedAtUtc);
        builder.Property(i => i.UpdatedBy);
        builder.Property(i => i.DeletedAtUtc);

        builder.Property(i => i.IsDeleted).IsRequired().HasDefaultValue(false);
        builder.Property(i => i.IsActive).IsRequired().HasDefaultValue(true);

        builder.Property(i => i.LoadingPlanId).IsRequired();
        builder.Property(i => i.ItemId).IsRequired();
        builder.Property(i => i.Quantity).IsRequired();

        builder.HasOne(i => i.LoadingPlan)
            .WithMany()
            .HasForeignKey(i => i.LoadingPlanId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(i => i.Item)
            .WithMany()
            .HasForeignKey(i => i.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(i => i.GroupId);

        builder.HasOne(i => i.Group)
            .WithMany()
            .HasForeignKey(i => i.GroupId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(i => i.LoadingPlanId)
            .HasDatabaseName("IX_LoadingPlanInputItems_LoadingPlanId");

        builder.HasIndex(i => i.IsDeleted)
            .HasDatabaseName("IX_LoadingPlanInputItems_IsDeleted");

        builder.HasQueryFilter(i => !i.IsDeleted);
    }
}
