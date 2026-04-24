using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser> {
    public void Configure(EntityTypeBuilder<AppUser> builder) {
        builder.ToTable("Users");
        builder.HasKey(user => user.Id);

        builder.Property(user => user.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(user => user.CreatedBy);

        builder.Property(user => user.UpdatedAtUtc);

        builder.Property(user => user.UpdatedBy);

        builder.Property(user => user.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(user => user.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(user => user.CompanyId);

        builder.Property(user => user.FirstName)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(user => user.LastName)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(user => user.Email)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(user => user.PasswordHash)
            .HasMaxLength(1000);

        builder.Property(user => user.UserType)
            .IsRequired();

        builder.Property(user => user.ExternalSystemId)
            .HasMaxLength(100);

        builder.Property(user => user.AuthProvider)
            .IsRequired()
            .HasDefaultValue(CargoPilot.Domain.Enums.AuthProvider.Local);

        builder.HasIndex(user => user.Email)
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");

        builder.HasIndex(user => user.IsDeleted);

        builder.HasOne(user => user.Company)
            .WithMany(company => company.Users)
            .HasForeignKey(user => user.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(user => !user.IsDeleted);
    }
}
