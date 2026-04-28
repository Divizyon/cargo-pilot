using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class IpLoginAttemptConfiguration : IEntityTypeConfiguration<IpLoginAttempt> {
    public void Configure(EntityTypeBuilder<IpLoginAttempt> builder) {
        builder.ToTable("IpLoginAttempts");
        builder.HasKey(x => x.IpAddress);

        builder.Property(x => x.IpAddress)
            .HasMaxLength(45)
            .IsRequired();

        builder.Property(x => x.FailedAttempts)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(x => x.LockoutCount)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(x => x.LockoutEndUtc);

        builder.Property(x => x.LastAttemptUtc)
            .IsRequired();
    }
}
