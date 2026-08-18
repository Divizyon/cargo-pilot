using CargoPilot.Application.Abstractions;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using CargoPilot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace CargoPilot.Infrastructure.Tests;

/// <summary>
/// Soft-delete global query filter'inin model genelinde eksiksiz uygulandigini sabitler.
/// Tek bir entity'de filtre unutulursa silinmis kayitlar sessizce sorgulara sizar.
/// </summary>
public sealed class SoftDeleteQueryFilterTests
{
    private const string IsDeletedColumn = nameof(BaseEntity.IsDeleted);

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=localhost;Database=CargoPilotModelOnly;Trusted_Connection=True;")
            .Options;

        return new AppDbContext(options, new AnonymousCurrentUserService());
    }

    private static List<IEntityType> SoftDeletableEntityTypes(AppDbContext context)
    {
        return context.Model
            .GetEntityTypes()
            .Where(entityType => entityType.FindProperty(IsDeletedColumn) is not null)
            .ToList();
    }

    [Fact]
    public void Model_IsDeletedTasiyanEntityleriIcerir()
    {
        using var context = CreateContext();

        // Testin bos kumede calisip yanlislikla "gecti" demesini engeller.
        Assert.NotEmpty(SoftDeletableEntityTypes(context));
    }

    [Fact]
    public void Model_IsDeletedTasiyanHerEntityIcinQueryFilterTanimlar()
    {
        using var context = CreateContext();

        var filtersiz = SoftDeletableEntityTypes(context)
            .Where(entityType => entityType.GetQueryFilter() is null)
            .Select(entityType => entityType.ClrType.Name)
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToList();

        Assert.True(
            filtersiz.Count == 0,
            $"Su entity'lerde soft-delete query filter eksik: {string.Join(", ", filtersiz)}");
    }

    [Fact]
    public void Model_QueryFilterlariIsDeletedUzerindenCalisir()
    {
        using var context = CreateContext();

        var isDeletedeDokunmayan = SoftDeletableEntityTypes(context)
            .Where(entityType =>
                entityType.GetQueryFilter() is { } filter &&
                !filter.ToString().Contains(IsDeletedColumn, StringComparison.Ordinal))
            .Select(entityType => entityType.ClrType.Name)
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToList();

        Assert.True(
            isDeletedeDokunmayan.Count == 0,
            $"Su entity'lerin query filter'i IsDeleted kontrolu icermiyor: {string.Join(", ", isDeletedeDokunmayan)}");
    }

    [Fact]
    public void Sorgu_SilinmisKayitlariDisarida_BirakanPredicateUretir()
    {
        using var context = CreateContext();

        var sql = context.Items.Select(item => item.Id).ToQueryString();

        Assert.Contains(IsDeletedColumn, sql, StringComparison.Ordinal);
    }

    [Fact]
    public void Sorgu_IgnoreQueryFiltersIle_SoftDeletePredicateiniUretmez()
    {
        using var context = CreateContext();

        var sql = context.Items.IgnoreQueryFilters().Select(item => item.Id).ToQueryString();

        Assert.DoesNotContain(IsDeletedColumn, sql, StringComparison.Ordinal);
    }

    [Fact]
    public void Sorgu_PlanIcinDe_SoftDeletePredicateiUretir()
    {
        using var context = CreateContext();

        var sql = context.LoadingPlans.Select(plan => plan.Id).ToQueryString();

        Assert.Contains(IsDeletedColumn, sql, StringComparison.Ordinal);
    }

    private sealed class AnonymousCurrentUserService : ICurrentUserService
    {
        public Guid? UserId => null;

        public Guid? CompanyId => null;

        public UserType? UserType => null;
    }
}
