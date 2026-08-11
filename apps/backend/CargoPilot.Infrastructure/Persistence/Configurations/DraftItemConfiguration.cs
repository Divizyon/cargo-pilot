using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class DraftItemConfiguration : IEntityTypeConfiguration<DraftItem>
{
    public void Configure(EntityTypeBuilder<DraftItem> builder)
    {
        builder.ToTable("DraftItems");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(x => x.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(x => x.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(x => x.CompanyId).IsRequired();
        builder.Property(x => x.IntegrationId).IsRequired();

        builder.Property(x => x.ErpId)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.ErpRawDataJson)
            .IsRequired();

        builder.Property(x => x.Status)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);

        builder.Property(x => x.SKU)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Barcode)
            .HasMaxLength(100);

        builder.Property(x => x.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(x => x.ProductType)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(x => x.Category).IsRequired();

        builder.Property(x => x.Width).IsRequired().HasPrecision(12, 3);
        builder.Property(x => x.Height).IsRequired().HasPrecision(12, 3);
        builder.Property(x => x.Length).IsRequired().HasPrecision(12, 3);
        builder.Property(x => x.Diameter).HasPrecision(12, 3);
        builder.Property(x => x.Weight).IsRequired().HasPrecision(12, 3);

        builder.Property(x => x.FragilityType).IsRequired();

        builder.Property(x => x.ConstraintIdsJson)
            .IsRequired()
            .HasDefaultValue("[]");

        builder.Property(x => x.IsStackable).IsRequired();
        builder.Property(x => x.MaxStackCount).IsRequired();

        builder.Property(x => x.MaxWeightOnTop)
            .IsRequired()
            .HasPrecision(12, 3);

        builder.Property(x => x.AllowedRotations).IsRequired();

        builder.Property(x => x.ImageUrl).HasMaxLength(500);
        builder.Property(x => x.StackGroup).HasMaxLength(100);
        builder.Property(x => x.SpecialNotes).HasMaxLength(1000);

        builder.Property(x => x.IncompatibleGroupsJson)
            .IsRequired()
            .HasMaxLength(500)
            .HasDefaultValue("[]");

        builder.Property(x => x.MissingFieldsJson)
            .IsRequired()
            .HasMaxLength(200)
            .HasDefaultValue("[]");

        builder.HasOne(x => x.Company)
            .WithMany()
            .HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Integration)
            .WithMany()
            .HasForeignKey(x => x.IntegrationId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.CompanyId)
            .HasDatabaseName("IX_DraftItems_CompanyId");

        // Ayni ERP kaydi bir entegrasyonda tek taslak uretebilir; silinmis satirlar filtre disi.
        builder.HasIndex(x => new { x.IntegrationId, x.ErpId })
            .HasDatabaseName("IX_DraftItems_IntegrationId_ErpId")
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");

        builder.HasIndex(x => x.Status)
            .HasDatabaseName("IX_DraftItems_Status");

        builder.HasQueryFilter(x => !x.IsDeleted);
    }
}
