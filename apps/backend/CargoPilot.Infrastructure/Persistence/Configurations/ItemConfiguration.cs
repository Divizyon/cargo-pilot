using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace CargoPilot.Infrastructure.Persistence.Configurations;

internal sealed class ItemConfiguration : IEntityTypeConfiguration<Item> {
    public void Configure(EntityTypeBuilder<Item> builder) {
        builder.ToTable("Items");
        builder.HasKey(item => item.Id);

        builder.Property(item => item.CreatedAtUtc)
            .IsRequired()
            .HasDefaultValueSql("GETUTCDATE()");

        builder.Property(item => item.CreatedBy);
        builder.Property(item => item.UpdatedAtUtc);
        builder.Property(item => item.UpdatedBy);

        builder.Property(item => item.IsDeleted)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(item => item.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(item => item.SKU)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(item => item.Barcode)
            .HasMaxLength(100);

        builder.Property(item => item.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(item => item.ProductType)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(item => item.Category)
            .IsRequired();

        builder.Property(item => item.WidthOriginalValue)
            .IsRequired()
            .HasPrecision(12, 3);
        builder.Property(item => item.WidthUnit)
            .IsRequired();
        builder.Property(item => item.HeightOriginalValue)
            .IsRequired()
            .HasPrecision(12, 3);
        builder.Property(item => item.HeightUnit)
            .IsRequired();
        builder.Property(item => item.LengthOriginalValue)
            .IsRequired()
            .HasPrecision(12, 3);
        builder.Property(item => item.LengthUnit)
            .IsRequired();
        builder.Property(item => item.WeightOriginalValue)
            .IsRequired()
            .HasPrecision(12, 3);
        builder.Property(item => item.WeightUnit)
            .IsRequired();

        builder.Property(item => item.WidthInCm)
            .IsRequired()
            .HasPrecision(12, 3);
        builder.Property(item => item.HeightInCm)
            .IsRequired()
            .HasPrecision(12, 3);
        builder.Property(item => item.LengthInCm)
            .IsRequired()
            .HasPrecision(12, 3);
        builder.Property(item => item.WeightInKg)
            .IsRequired()
            .HasPrecision(12, 3);
        builder.Property(item => item.VolumeInCm3)
            .IsRequired()
            .HasPrecision(18, 3);
        builder.Property(item => item.Width)
            .IsRequired()
            .HasPrecision(12, 3);

        builder.Property(item => item.Height)
            .IsRequired()
            .HasPrecision(12, 3);

        builder.Property(item => item.Length)
            .IsRequired()
            .HasPrecision(12, 3);

        builder.Property(item => item.Diameter)
            .HasPrecision(12, 3);

        builder.Property(item => item.Weight)
            .IsRequired()
            .HasPrecision(12, 3);

        builder.Property(item => item.FragilityType)
            .IsRequired();

        builder.Property(item => item.IsStackable)
            .IsRequired();

        builder.Property(item => item.MaxStackCount)
            .IsRequired();

        builder.Property(item => item.MaxWeightOnTop)
            .IsRequired()
            .HasPrecision(12, 3);

        builder.Property(item => item.AllowedRotations)
            .IsRequired();

        builder.Property(item => item.ImageUrl)
            .HasMaxLength(500);

        builder.Property(item => item.StackGroup)
            .HasMaxLength(100);

        builder.Property(item => item.SpecialNotes)
            .HasMaxLength(1000);

        builder.HasIndex(item => item.SKU)
            .IsUnique()
            .HasFilter("[IsDeleted] = 0");
        builder.HasIndex(item => item.IsDeleted);

        builder.HasQueryFilter(item => !item.IsDeleted);
    }
}
