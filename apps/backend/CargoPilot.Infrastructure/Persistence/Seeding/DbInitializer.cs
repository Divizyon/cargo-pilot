using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace CargoPilot.Infrastructure.Persistence.Seeding;

public sealed class DbInitializer {
    private const string DefaultCompanyName = "Default Logistics";
    private const string DefaultAdminEmail = "admin@cargopilot.com";
    private const string EnableAdminSeedKey = "Seed:EnableAdminSeed";
    private const string DefaultAdminPasswordKey = "Seed:DefaultAdminPassword";
    private const string AdminMustChangePasswordKey = "Seed:AdminMustChangePassword";

    private readonly AppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _environment;

    public DbInitializer(
        AppDbContext context,
        IPasswordHasher passwordHasher,
        IConfiguration configuration,
        IHostEnvironment environment) {
        _context = context;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
        _environment = environment;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default) {
        if (_context.Database.IsSqlServer()) {
            await _context.Database.MigrateAsync(cancellationToken);
        }

        var isDevelopment = _environment.IsDevelopment();

        // Demo şirket ve sahte ERP entegrasyonu yalnızca Development ortamında oluşturulur.
        // Aksi halde gerçek bir kiracıya test verisi iliştirilebilir.
        Company? company = isDevelopment
            ? await SeedDevelopmentDataAsync(cancellationToken)
            : await GetOldestCompanyAsync(cancellationToken);

        // Sabit SuperAdmin hesabı üretimde otomatik açılmaz; yalnızca
        // Seed:EnableAdminSeed=true ile açıkça istendiğinde oluşturulur ve
        // bu durumda ilk girişte parola değişimi zorunlu kılınır.
        var adminSeedEnabled = isDevelopment || _configuration.GetValue<bool>(EnableAdminSeedKey);
        if (!adminSeedEnabled) {
            return;
        }

        // Seed açıkça istenmiş ama DB'de hiç şirket yok (taze test/CI yığını):
        // admin şirketsiz kalırsa tüm şirket kapsamlı uçlar Auth.NoCompany ile
        // kilitlenir. Yalnızca bu koşulda varsayılan şirket açılır; sahte ERP
        // entegrasyonu Development dışında yine seed'lenmez.
        company ??= await CreateDefaultCompanyAsync(cancellationToken);

        // İlk girişte parola değişimi üretim varsayılanıdır; otomasyon ortamları
        // (CI e2e yığını) Seed:AdminMustChangePassword=false ile kapatabilir.
        var mustChangePassword = !isDevelopment
            && _configuration.GetValue(AdminMustChangePasswordKey, defaultValue: true);

        await SeedAdminUserAsync(company, mustChangePassword, cancellationToken);
    }

    private Task<Company?> GetOldestCompanyAsync(CancellationToken cancellationToken) =>
        _context.Companies
            .OrderBy(c => c.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

    private async Task<Company> CreateDefaultCompanyAsync(CancellationToken cancellationToken) {
        var company = new Company(
            id: Guid.NewGuid(),
            name: DefaultCompanyName,
            subscriptionType: SubscriptionType.Free,
            maxUserCount: 5);

        await _context.Companies.AddAsync(company, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        return company;
    }

    private async Task<Company> SeedDevelopmentDataAsync(CancellationToken cancellationToken) {
        var company = await GetOldestCompanyAsync(cancellationToken)
            ?? await CreateDefaultCompanyAsync(cancellationToken);

        var integrationExists = await _context.Integrations
            .AnyAsync(i => i.CompanyId == company.Id, cancellationToken);

        if (!integrationExists) {
            var integration = new Integration(
                id: Guid.NewGuid(),
                companyId: company.Id,
                systemName: "TestERP",
                apiEndpoint: "https://erp.test",
                mappingTable: null,
                syncInterval: null);

            await _context.Integrations.AddAsync(integration, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return company;
    }

    private async Task SeedAdminUserAsync(
        Company? company,
        bool mustChangePassword,
        CancellationToken cancellationToken) {
        var defaultAdminPassword = _configuration[DefaultAdminPasswordKey];
        if (string.IsNullOrWhiteSpace(defaultAdminPassword)) {
            throw new InvalidOperationException(
                "Seed:DefaultAdminPassword tanımsız. Seed için varsayılan admin şifresi yapılandırılmalı.");
        }

        var adminUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == DefaultAdminEmail, cancellationToken);

        if (adminUser is null) {
            adminUser = new AppUser(
                id: Guid.NewGuid(),
                companyId: company?.Id,
                firstName: "System",
                lastName: "Admin",
                email: DefaultAdminEmail,
                passwordHash: _passwordHasher.HashPassword(defaultAdminPassword),
                userType: UserType.SuperAdmin,
                externalSystemId: null,
                authProvider: AuthProvider.Local);

            if (mustChangePassword) {
                adminUser.SetMustChangePassword(true);
            }

            await _context.Users.AddAsync(adminUser, cancellationToken);
        } else if (adminUser.CompanyId is null && company is not null) {
            adminUser.AssignToCompany(company.Id);
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
