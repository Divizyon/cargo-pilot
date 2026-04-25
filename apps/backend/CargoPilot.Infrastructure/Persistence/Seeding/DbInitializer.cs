using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace CargoPilot.Infrastructure.Persistence.Seeding;

public sealed class DbInitializer {
    private const string DefaultCompanyName = "Default Logistics";
    private const string DefaultAdminEmail = "admin@cargopilot.com";

    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IConfiguration _configuration;

    public DbInitializer(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        IConfiguration configuration) {
        _context = context;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default) {
        if (_context.Database.IsSqlServer()) {
            await _context.Database.MigrateAsync(cancellationToken);
        }

        Company? company = await _context.Companies
            .OrderBy(c => c.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (company is null) {
            company = new Company(
                id: Guid.NewGuid(),
                name: DefaultCompanyName,
                subscriptionType: SubscriptionType.Free,
                maxUserCount: 5);

            await _context.Companies.AddAsync(company, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var adminExists = await _context.Users
            .AnyAsync(
                user => user.Email == DefaultAdminEmail,
                cancellationToken);

        if (!adminExists) {
            var defaultAdminPassword = _configuration["Seed:DefaultAdminPassword"];
            if (string.IsNullOrWhiteSpace(defaultAdminPassword)) {
                throw new InvalidOperationException(
                    "Seed:DefaultAdminPassword tanımsız. Seed için varsayılan admin şifresi yapılandırılmalı.");
            }

            var adminUser = new AppUser(
                id: Guid.NewGuid(),
                companyId: company.Id,
                firstName: "System",
                lastName: "Admin",
                email: DefaultAdminEmail,
                passwordHash: _passwordHasher.HashPassword(defaultAdminPassword),
                userType: UserType.CompanyAdmin,
                externalSystemId: null,
                authProvider: AuthProvider.Local);

            await _context.Users.AddAsync(adminUser, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
