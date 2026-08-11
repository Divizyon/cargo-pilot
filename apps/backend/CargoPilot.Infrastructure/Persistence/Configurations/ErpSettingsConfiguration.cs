using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class ErpSettingsConfiguration : IEntityTypeConfiguration<ErpSettings>
{
    public void Configure(EntityTypeBuilder<ErpSettings> builder)
    {
        builder.ToTable("ErpSettings");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.CompanyId).IsRequired();

        builder.Property(e => e.ProviderType)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(e => e.CompanyCode)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(e => e.Username)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(e => e.PasswordEncrypted)
            .HasColumnType("nvarchar(max)")
            .IsRequired();

        builder.Property(e => e.ServerAddress)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(e => e.TrustServerCertificate)
            .IsRequired()
            .HasDefaultValue(true);

        builder.HasIndex(e => e.CompanyId).IsUnique();

        builder.HasOne(e => e.Company)
            .WithMany()
            .HasForeignKey(e => e.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}
