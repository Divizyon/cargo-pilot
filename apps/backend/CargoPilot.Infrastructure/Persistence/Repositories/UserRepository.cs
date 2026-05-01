using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
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

    public Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken = default) {
        return _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    }

    public Task<AppUser?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) {
        return _dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    }

    public void Add(AppUser user) {
        _dbContext.Users.Add(user);
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) {
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<AppUser?> FindByEmailAsync(string email, CancellationToken cancellationToken = default) {
        return _dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    }

    public Task<AppUser?> FindByProviderAsync(
        AuthProvider provider,
        string providerKey,
        CancellationToken cancellationToken = default) {
        return _dbContext.UserLogins
            .Where(l => l.LoginProvider == provider && l.ProviderKey == providerKey)
            .Select(l => l.User)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public void AddUserLogin(UserLogin userLogin) {
        _dbContext.UserLogins.Add(userLogin);
    }
}
