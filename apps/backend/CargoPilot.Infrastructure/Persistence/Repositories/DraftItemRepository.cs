using CargoPilot.Application.Common.Erp;
using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Domain.Entities;
using CargoPilot.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CargoPilot.Infrastructure.Persistence.Repositories;

internal sealed class DraftItemRepository : IDraftItemRepository
{
    /// <summary>Izole edilemeyen bir hatada sonsuz donguye girmemek icin deneme siniri.</summary>
    private const int MaxIsolationAttempts = 50;

    private const string LikeEscapeCharacter = "\\";

    private readonly AppDbContext _context;

    public DraftItemRepository(AppDbContext context)
    {
        _context = context;
    }

    public async Task<DraftItem?> GetByIdAsync(Guid id, Guid companyId, CancellationToken cancellationToken = default) =>
        await _context.DraftItems
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, cancellationToken);

    public async Task<DraftItem?> GetByErpIdAsync(string erpId, Guid integrationId, Guid companyId, CancellationToken cancellationToken = default) =>
        await _context.DraftItems
            .FirstOrDefaultAsync(x => x.ErpId == erpId && x.IntegrationId == integrationId && x.CompanyId == companyId, cancellationToken);

    public async Task<(IReadOnlyList<DraftItem> Items, int TotalCount, IReadOnlyList<ItemCategory> AvailableCategories)> ListByCompanyAsync(
        Guid companyId,
        IReadOnlyList<DraftItemStatus>? statuses,
        string? search,
        IReadOnlyList<ItemCategory>? categories,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        var query = _context.DraftItems
            .Where(x => x.CompanyId == companyId);

        if (statuses is { Count: > 0 })
            query = query.Where(x => statuses.Contains(x.Status));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{EscapeLikePattern(search.Trim())}%";
            query = query.Where(x =>
                EF.Functions.Like(x.Name, pattern, LikeEscapeCharacter)
                || EF.Functions.Like(x.SKU, pattern, LikeEscapeCharacter)
                || EF.Functions.Like(x.ErpId, pattern, LikeEscapeCharacter)
                || (x.Barcode != null && EF.Functions.Like(x.Barcode, pattern, LikeEscapeCharacter)));
        }

        // Secenekler kategori filtresi uygulanmadan cikarilir; aksi halde kullanici bir
        // tipi sectiginde digerleri listeden kaybolur ve secimi geri alamaz.
        var availableCategories = await query
            .Select(x => x.Category)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (categories is { Count: > 0 })
            query = query.Where(x => categories.Contains(x.Category));

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(x => x.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (items, totalCount, availableCategories);
    }

    /// <summary>
    /// LIKE joker karakterlerini kacisir; aksi halde kullanicinin yazdigi '%' tum kayitlari
    /// dondurur ve '[' desenleri sorguyu beklenmedik sekilde daraltir.
    /// </summary>
    private static string EscapeLikePattern(string value) => value
        .Replace(LikeEscapeCharacter, LikeEscapeCharacter + LikeEscapeCharacter, StringComparison.Ordinal)
        .Replace("%", LikeEscapeCharacter + "%", StringComparison.Ordinal)
        .Replace("_", LikeEscapeCharacter + "_", StringComparison.Ordinal)
        .Replace("[", LikeEscapeCharacter + "[", StringComparison.Ordinal);

    public async Task<IReadOnlyList<DraftItem>> GetByIdsAsync(
        IEnumerable<Guid> ids,
        Guid companyId,
        CancellationToken cancellationToken = default) =>
        await _context.DraftItems
            .Where(x => ids.Contains(x.Id) && x.CompanyId == companyId)
            .ToListAsync(cancellationToken);

    public void Add(DraftItem draftItem) => _context.DraftItems.Add(draftItem);

    public void Update(DraftItem draftItem) => _context.DraftItems.Update(draftItem);

    public void Discard(DraftItem draftItem) =>
        _context.Entry(draftItem).State = EntityState.Detached;

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _context.SaveChangesAsync(cancellationToken);

    public async Task<IReadOnlyList<DraftSaveFailure>> SaveChangesIsolatingFailuresAsync(
        CancellationToken cancellationToken = default)
    {
        var failures = new List<DraftSaveFailure>();

        for (var attempt = 0; attempt < MaxIsolationAttempts; attempt++)
        {
            try
            {
                await _context.SaveChangesAsync(cancellationToken);
                return failures;
            }
            catch (DbUpdateException ex)
            {
                var draftEntries = ex.Entries.Where(e => e.Entity is DraftItem).ToList();

                // Hatanin kaynagi taslak degilse (or. SyncLog) o kaydi atarak ilerlemek
                // veri kaybi olurdu; hata cagirana birakilir. Karisik partide de hangi
                // kaydin suclu oldugu belirsizdir, ayni sekilde yukseltilir.
                if (draftEntries.Count == 0 || draftEntries.Count != ex.Entries.Count)
                    throw;

                var reason = ex.InnerException?.Message ?? ex.Message;
                foreach (var entry in draftEntries)
                {
                    var draft = (DraftItem)entry.Entity;
                    failures.Add(new DraftSaveFailure(
                        draft.ErpId, draft.SKU, reason, entry.State == EntityState.Added));
                    entry.State = EntityState.Detached;
                }
            }
        }

        throw new InvalidOperationException(
            $"Taslak kaydi {MaxIsolationAttempts} denemede tamamlanamadi.");
    }
}
