using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class UserSessionConfiguration : IEntityTypeConfiguration<UserSession> {
    public void Configure(EntityTypeBuilder<UserSession> builder) {
        builder.ToTable("UserSessions");
        builder.HasKey(session => session.Id);

        builder.Property(session => session.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(session => session.UserId)
            .IsRequired();

        builder.Property(session => session.Token)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(session => session.CreatedByIp)
            .HasMaxLength(50);

        builder.Property(session => session.DeviceSummary)
            .HasMaxLength(500);

        builder.Property(session => session.ExpiresAt)
            .IsRequired();

        builder.Property(session => session.LastUsedAt)
            .IsRequired();

        builder.Property(session => session.IsRevoked)
            .IsRequired()
            .HasDefaultValue(false);

        builder.HasOne(session => session.User)
            .WithMany(user => user.UserSessions)
            .HasForeignKey(session => session.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(session => session.Token);
    }
}
