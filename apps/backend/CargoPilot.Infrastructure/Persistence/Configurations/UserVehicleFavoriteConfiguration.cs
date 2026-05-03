using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class UserVehicleFavoriteConfiguration : IEntityTypeConfiguration<UserVehicleFavorite> {
    public void Configure(EntityTypeBuilder<UserVehicleFavorite> builder) {
        builder.ToTable("UserVehicleFavorites");
        builder.HasKey(f => f.Id);

        builder.Property(f => f.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(f => f.UpdatedAtUtc);
        builder.Property(f => f.DeletedAtUtc);
        builder.Property(f => f.CreatedBy);
        builder.Property(f => f.UpdatedBy);

        builder.Property(f => f.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(f => f.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(f => f.UserId).IsRequired();
        builder.Property(f => f.VehicleId).IsRequired();

        builder.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Vehicle>()
            .WithMany()
            .HasForeignKey(f => f.VehicleId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(f => new { f.UserId, f.VehicleId })
            .IsUnique()
            .HasFilter("[IsDeleted] = 0")
            .HasDatabaseName("IX_UserVehicleFavorites_UserId_VehicleId");

        builder.HasIndex(f => f.IsDeleted)
            .HasDatabaseName("IX_UserVehicleFavorites_IsDeleted");

        builder.HasQueryFilter(f => !f.IsDeleted);
    }
}
