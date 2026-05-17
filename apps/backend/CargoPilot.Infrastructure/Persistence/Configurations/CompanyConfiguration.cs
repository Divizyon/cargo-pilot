using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class CompanyConfiguration : IEntityTypeConfiguration<Company> {
    public void Configure(EntityTypeBuilder<Company> builder) {
        builder.ToTable("Companies");
        builder.HasKey(company => company.Id);

        builder.Property(company => company.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(company => company.CreatedBy);
        builder.Property(company => company.UpdatedAtUtc);
        builder.Property(company => company.UpdatedBy);

        builder.Property(company => company.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(company => company.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(company => company.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(company => company.Phone)
            .HasMaxLength(100);

        builder.Property(company => company.Email)
            .HasMaxLength(200);

        builder.Property(company => company.Address)
            .HasMaxLength(500);

        builder.Property(company => company.LogoUrl)
            .HasMaxLength(500);

        builder.Property(company => company.SubscriptionType)
            .IsRequired()
            .HasDefaultValue(SubscriptionType.Free);

        builder.Property(company => company.MaxUserCount)
            .IsRequired()
            .HasDefaultValue(5);

        builder.Property(company => company.TrialEndsAt);

        builder.HasIndex(company => company.Name);
        builder.HasIndex(company => company.IsDeleted);

        builder.HasQueryFilter(company => !company.IsDeleted);
    }
}
