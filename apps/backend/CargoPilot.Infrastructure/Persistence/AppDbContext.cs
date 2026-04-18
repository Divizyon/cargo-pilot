using CargoPilot.Domain.Entities;
using CargoPilot.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CargoPilot.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Cargo> Cargos => Set<Cargo>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var trackingNumberConverter = new ValueConverter<TrackingNumber, string>(
            valueObject => valueObject.Value,
            value => new TrackingNumber(value));

        modelBuilder.Entity<Cargo>(entity =>
        {
            entity.ToTable("Cargos");
            entity.HasKey(cargo => cargo.Id);
            entity.Property(cargo => cargo.TrackingNumber)
                .HasConversion(trackingNumberConverter)
                .HasMaxLength(64)
                .IsRequired();
            entity.Property(cargo => cargo.Status)
                .IsRequired();
        });
    }
}
