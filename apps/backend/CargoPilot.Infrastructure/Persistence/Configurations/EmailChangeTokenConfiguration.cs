using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class EmailChangeTokenConfiguration : IEntityTypeConfiguration<EmailChangeToken> {
    public void Configure(EntityTypeBuilder<EmailChangeToken> builder) {
        builder.ToTable("EmailChangeTokens");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.NewEmail)
            .IsRequired()
            .HasMaxLength(255);

        builder.Property(e => e.TokenHash)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(e => e.ExpiresAt).IsRequired();

        builder.Property(e => e.IsUsed)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(e => e.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.HasIndex(e => e.TokenHash);
        builder.HasIndex(e => e.UserId);

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
