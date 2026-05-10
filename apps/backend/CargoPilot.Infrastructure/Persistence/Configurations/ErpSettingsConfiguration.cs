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

        builder.Property(e => e.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(e => e.CreatedBy);
        builder.Property(e => e.UpdatedAtUtc);
        builder.Property(e => e.UpdatedBy);

        builder.Property(e => e.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(e => e.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(e => e.CompanyId)
            .IsRequired();

        builder.Property(e => e.CompanyCode)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(e => e.Username)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(e => e.ServerAddress)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(e => e.EncryptedPassword)
            .HasMaxLength(1000)
            .IsRequired();

        builder.Property(e => e.Provider)
            .HasConversion<string>()
            .HasMaxLength(50)
            .IsRequired();

        builder.HasOne(e => e.Company)
            .WithMany()
            .HasForeignKey(e => e.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(e => e.CompanyId)
            .IsUnique()
            .HasDatabaseName("IX_ErpSettings_CompanyId");

        builder.HasIndex(e => e.IsDeleted)
            .HasDatabaseName("IX_ErpSettings_IsDeleted");

        builder.HasQueryFilter(e => !e.IsDeleted);
    }
}
