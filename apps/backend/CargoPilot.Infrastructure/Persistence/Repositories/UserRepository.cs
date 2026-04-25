using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class UserRepository : IUserRepository {
    private readonly AppDbContext _dbContext;

    public UserRepository(AppDbContext dbContext) {
        _dbContext = dbContext;
    }

    public Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default) {
        // email parametresi handler'da ToLowerInvariant() ile normalize edilmiş olmalı
        return _dbContext.Users
            .AnyAsync(u => u.Email == email, cancellationToken);
    }

    public void Add(AppUser user) {
        _dbContext.Users.Add(user);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
