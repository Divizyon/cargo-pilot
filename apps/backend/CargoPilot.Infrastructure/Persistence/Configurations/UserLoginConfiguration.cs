using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class UserLoginConfiguration : IEntityTypeConfiguration<UserLogin> {
    public void Configure(EntityTypeBuilder<UserLogin> builder) {
        builder.ToTable("UserLogins");
        builder.HasKey(login => login.Id);

        builder.Property(login => login.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(login => login.LoginProvider)
            .IsRequired();

        builder.Property(login => login.ProviderKey)
            .HasMaxLength(450)
            .IsRequired();

        builder.Property(login => login.UserId)
            .IsRequired();

        builder.HasOne(login => login.User)
            .WithMany(user => user.UserLogins)
            .HasForeignKey(login => login.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(login => new { login.LoginProvider, login.ProviderKey })
            .IsUnique();
    }
}
