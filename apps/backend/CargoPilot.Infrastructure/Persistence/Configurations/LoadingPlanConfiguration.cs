using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class LoadingPlanConfiguration : IEntityTypeConfiguration<LoadingPlan> {
    public void Configure(EntityTypeBuilder<LoadingPlan> builder) {
        builder.ToTable("LoadingPlans");
        builder.HasKey(plan => plan.Id);

        builder.Property(plan => plan.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(plan => plan.CreatedBy);
        builder.Property(plan => plan.UpdatedAtUtc);
        builder.Property(plan => plan.UpdatedBy);
        builder.Property(plan => plan.DeletedAtUtc);

        builder.Property(plan => plan.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(plan => plan.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(plan => plan.PlanName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(plan => plan.VehicleId)
            .IsRequired();

        builder.Property(plan => plan.OptimizationCriteria)
            .IsRequired();

        builder.Property(plan => plan.OptimizationStatus)
            .IsRequired()
            .HasDefaultValue(LoadingPlanOptimizationStatus.Draft);

        builder.Property(plan => plan.ErrorCode)
            .HasMaxLength(64);

        builder.Property(plan => plan.ErrorMessage)
            .HasMaxLength(2000);

        builder.Property(plan => plan.TotalWeight)
            .IsRequired()
            .HasPrecision(18, 3);

        builder.Property(plan => plan.FillRate)
            .IsRequired()
            .HasPrecision(9, 4);

        builder.Property(plan => plan.InputTotalQuantity)
            .IsRequired();

        builder.Property(plan => plan.PlacedQuantity)
            .IsRequired();

        builder.Property(plan => plan.UnplacedQuantity)
            .IsRequired();

        builder.Property(plan => plan.CenterOfGravityX)
            .HasPrecision(18, 4);

        builder.Property(plan => plan.CenterOfGravityY)
            .HasPrecision(18, 4);

        builder.Property(plan => plan.CenterOfGravityZ)
            .HasPrecision(18, 4);

        builder.Property(plan => plan.ReportUrl)
            .HasMaxLength(2048);

        builder.Property(plan => plan.ErpExportStatus)
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(plan => plan.CompanyId);

        builder.HasOne(plan => plan.Vehicle)
            .WithMany()
            .HasForeignKey(plan => plan.VehicleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(plan => plan.Company)
            .WithMany()
            .HasForeignKey(plan => plan.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(plan => plan.CompanyId)
            .HasDatabaseName("IX_LoadingPlans_CompanyId");

        builder.HasQueryFilter(plan => !plan.IsDeleted);
    }
}
