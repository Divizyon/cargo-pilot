using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Api.Data;

public class CargoPilotDbContext : DbContext
{
    public CargoPilotDbContext(DbContextOptions<CargoPilotDbContext> options)
        : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
    }
}
