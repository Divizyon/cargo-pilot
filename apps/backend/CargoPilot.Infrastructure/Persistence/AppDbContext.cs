using CargoPilot.Application.Abstractions;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CargoPilot.Infrastructure.Persistence;

public class AppDbContext : DbContext {
    private readonly ICurrentUserService _currentUserService;

    public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserService currentUserService)
        : base(options) {
        _currentUserService = currentUserService;
    }

    public DbSet<Cargo> Cargos => Set<Cargo>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) {
        ApplyAuditFields();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges() {
        ApplyAuditFields();
        return base.SaveChanges();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder) {
        var trackingNumberConverter = new ValueConverter<TrackingNumber, string>(
            valueObject => valueObject.Value,
            value => new TrackingNumber(value));

        modelBuilder.Entity<Cargo>(entity => {
            entity.ToTable("Cargos");
            entity.HasKey(cargo => cargo.Id);

            entity.Property(cargo => cargo.TrackingNumber)
                .HasConversion(trackingNumberConverter)
                .HasMaxLength(64)
                .IsRequired();

            entity.Property(cargo => cargo.Status)
                .IsRequired();

            entity.Property(cargo => cargo.CreatedDate)
                .IsRequired();

            entity.Property(cargo => cargo.UpdatedDate)
                .IsRequired();

            entity.Property(cargo => cargo.IsDeleted)
                .IsRequired()
                .HasDefaultValue(false);

            entity.Property(cargo => cargo.CreatedBy);

            entity.Property(cargo => cargo.UpdatedBy);

            entity.HasIndex(cargo => cargo.IsDeleted);

            entity.HasQueryFilter(cargo => !cargo.IsDeleted);
        });
    }

    private void ApplyAuditFields() {
        var now = DateTime.UtcNow;
        var userId = _currentUserService.UserId;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>()) {
            if (entry.State == EntityState.Added) {
                entry.Property(x => x.CreatedDate).CurrentValue = now;
                entry.Property(x => x.UpdatedDate).CurrentValue = now;
                entry.Property(x => x.CreatedBy).CurrentValue = userId;
                entry.Property(x => x.UpdatedBy).CurrentValue = userId;
            }
            else if (entry.State == EntityState.Modified) {
                entry.Property(x => x.UpdatedDate).CurrentValue = now;
                entry.Property(x => x.UpdatedBy).CurrentValue = userId;
            }
        }
    }
}
