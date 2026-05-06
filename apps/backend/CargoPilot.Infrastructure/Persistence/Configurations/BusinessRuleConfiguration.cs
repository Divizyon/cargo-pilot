using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class BusinessRuleConfiguration : IEntityTypeConfiguration<BusinessRule>
{
    public void Configure(EntityTypeBuilder<BusinessRule> builder)
    {
        builder.ToTable("BusinessRules");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(r => r.CreatedBy);
        builder.Property(r => r.UpdatedAtUtc);
        builder.Property(r => r.UpdatedBy);

        builder.Property(r => r.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(r => r.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(r => r.RuleName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(r => r.RuleType)
            .IsRequired();

        builder.Property(r => r.Description)
            .HasMaxLength(1000)
            .IsRequired();

        builder.Property(r => r.LimitValue)
            .IsRequired();

        builder.Property(r => r.PriorityLevel)
            .IsRequired();

        builder.Property(r => r.IsHardConstraint)
            .IsRequired();

        builder.HasIndex(r => r.IsDeleted);
        builder.HasQueryFilter(r => !r.IsDeleted);
    }
}
