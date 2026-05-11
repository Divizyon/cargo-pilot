using CargoPilot.Application.Abstractions;
using CargoPilot.Domain.Entities;
using CargoPilot.Infrastructure.Persistence.Configurations;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    private readonly ICurrentUserService _currentUserService;

    public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserService currentUserService)
        : base(options)
    {
        _currentUserService = currentUserService;
    }

    public DbSet<Company> Companies => Set<Company>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<UserSession> UserSessions => Set<UserSession>();
    public DbSet<UserLogin> UserLogins => Set<UserLogin>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<UserPasswordHistory> UserPasswordHistory => Set<UserPasswordHistory>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<UserVehicleFavorite> UserVehicleFavorites => Set<UserVehicleFavorite>();
    public DbSet<PendingVehicleMapping> PendingVehicleMappings => Set<PendingVehicleMapping>();
    public DbSet<LoadingPlan> LoadingPlans => Set<LoadingPlan>();
    public DbSet<LoadingPlanInputItem> LoadingPlanInputItems => Set<LoadingPlanInputItem>();
    public DbSet<LoadingPlanPlacement> LoadingPlanPlacements => Set<LoadingPlanPlacement>();
    public DbSet<LoadingPlanUnplacedItem> LoadingPlanUnplacedItems => Set<LoadingPlanUnplacedItem>();
    public DbSet<LoadingPlanWarning> LoadingPlanWarnings => Set<LoadingPlanWarning>();
    public DbSet<Integration> Integrations => Set<Integration>();
    public DbSet<SyncLog> SyncLogs => Set<SyncLog>();
    public DbSet<ErpUserMapping> ErpUserMappings => Set<ErpUserMapping>();
    public DbSet<Notification> Notifications => Set<Notification>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditFields();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        ApplyAuditFields();
        return base.SaveChanges();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new CompanyConfiguration());
        modelBuilder.ApplyConfiguration(new AppUserConfiguration());
        modelBuilder.ApplyConfiguration(new UserSessionConfiguration());
        modelBuilder.ApplyConfiguration(new UserLoginConfiguration());
        modelBuilder.ApplyConfiguration(new PasswordResetTokenConfiguration());
        modelBuilder.ApplyConfiguration(new UserPasswordHistoryConfiguration());
        modelBuilder.ApplyConfiguration(new ItemConfiguration());
        modelBuilder.ApplyConfiguration(new VehicleConfiguration());
        modelBuilder.ApplyConfiguration(new PendingVehicleMappingConfiguration());
        modelBuilder.ApplyConfiguration(new UserVehicleFavoriteConfiguration());
        modelBuilder.ApplyConfiguration(new LoadingPlanConfiguration());
        modelBuilder.ApplyConfiguration(new LoadingPlanInputItemConfiguration());
        modelBuilder.ApplyConfiguration(new LoadingPlanPlacementConfiguration());
        modelBuilder.ApplyConfiguration(new LoadingPlanUnplacedItemConfiguration());
        modelBuilder.ApplyConfiguration(new LoadingPlanWarningConfiguration());
        modelBuilder.ApplyConfiguration(new IntegrationConfiguration());
        modelBuilder.ApplyConfiguration(new SyncLogConfiguration());
        modelBuilder.ApplyConfiguration(new ErpUserMappingConfiguration());
        modelBuilder.ApplyConfiguration(new NotificationConfiguration());
    }

    private void ApplyAuditFields()
    {
        var now = DateTime.UtcNow;
        var userId = _currentUserService.UserId;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Property(x => x.CreatedAtUtc).CurrentValue = now;
                entry.Property(x => x.UpdatedAtUtc).CurrentValue = null;
                entry.Property(x => x.DeletedAtUtc).CurrentValue = null;
                entry.Property(x => x.CreatedBy).CurrentValue = userId;
                entry.Property(x => x.UpdatedBy).CurrentValue = userId;
                entry.Property(x => x.IsDeleted).CurrentValue = false;
                entry.Property(x => x.IsActive).CurrentValue = true;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Property(x => x.UpdatedAtUtc).CurrentValue = now;
                entry.Property(x => x.UpdatedBy).CurrentValue = userId;
                var originalIsDeleted = entry.Property(x => x.IsDeleted).OriginalValue;
                var currentIsDeleted = entry.Property(x => x.IsDeleted).CurrentValue;

                if (!originalIsDeleted && currentIsDeleted)
                {
                    entry.Property(x => x.DeletedAtUtc).CurrentValue = now;
                }
                else if (originalIsDeleted && !currentIsDeleted)
                {
                    entry.Property(x => x.DeletedAtUtc).CurrentValue = null;
                }
            }
        }
    }
}
