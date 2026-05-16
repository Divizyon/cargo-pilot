using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class LoadingPlanVehicleConfiguration : IEntityTypeConfiguration<LoadingPlanVehicle> {
    public void Configure(EntityTypeBuilder<LoadingPlanVehicle> builder) {
        builder.ToTable("LoadingPlanVehicles");
        builder.HasKey(v => new { v.LoadingPlanId, v.VehicleId });

        builder.Property(v => v.SortOrder).IsRequired();

        builder.HasOne(v => v.LoadingPlan)
            .WithMany(p => p.Vehicles)
            .HasForeignKey(v => v.LoadingPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(v => v.Vehicle)
            .WithMany()
            .HasForeignKey(v => v.VehicleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(v => new { v.LoadingPlanId, v.SortOrder })
            .HasDatabaseName("IX_LoadingPlanVehicles_LoadingPlanId_SortOrder");
    }
}
