using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class LoadingPlanUnplacedItemConfiguration : IEntityTypeConfiguration<LoadingPlanUnplacedItem> {
    public void Configure(EntityTypeBuilder<LoadingPlanUnplacedItem> builder) {
        builder.ToTable("LoadingPlanUnplacedItems", tableBuilder =>
            tableBuilder.HasCheckConstraint(
                "CK_LoadingPlanUnplacedItems_Quantity_Positive",
                "[Quantity] > 0"));
        builder.HasKey(unplacedItem => unplacedItem.Id);

        builder.Property(unplacedItem => unplacedItem.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(unplacedItem => unplacedItem.CreatedBy);
        builder.Property(unplacedItem => unplacedItem.UpdatedAtUtc);
        builder.Property(unplacedItem => unplacedItem.UpdatedBy);
        builder.Property(unplacedItem => unplacedItem.DeletedAtUtc);

        builder.Property(unplacedItem => unplacedItem.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(unplacedItem => unplacedItem.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(unplacedItem => unplacedItem.LoadingPlanId)
            .IsRequired();

        builder.Property(unplacedItem => unplacedItem.ItemId)
            .IsRequired();

        builder.Property(unplacedItem => unplacedItem.Quantity)
            .IsRequired();

        builder.Property(unplacedItem => unplacedItem.Reason)
            .IsRequired();

        builder.HasOne(unplacedItem => unplacedItem.LoadingPlan)
            .WithMany()
            .HasForeignKey(unplacedItem => unplacedItem.LoadingPlanId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(unplacedItem => unplacedItem.Item)
            .WithMany()
            .HasForeignKey(unplacedItem => unplacedItem.ItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(unplacedItem => unplacedItem.LoadingPlanId)
            .HasDatabaseName("IX_LoadingPlanUnplacedItems_LoadingPlanId");

        builder.HasIndex(unplacedItem => unplacedItem.IsDeleted)
            .HasDatabaseName("IX_LoadingPlanUnplacedItems_IsDeleted");

        builder.HasQueryFilter(unplacedItem => !unplacedItem.IsDeleted);
    }
}
