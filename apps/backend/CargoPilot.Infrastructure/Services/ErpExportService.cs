using CargoPilot.Application.Common.Interfaces;
using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Infrastructure.Services;

/// <summary>
/// ERP aktarımı henüz uygulanmadı. Aktarım yapılmadığı halde başarı bildirmemek için
/// açıkça hata döner; plan Failed işaretlenir ve senkronizasyon kaydına neden yazılır.
/// </summary>
internal sealed class ErpExportService : IErpExportService {
    public Task<Result<int>> ExportAsync(
        LoadingPlan plan,
        Integration integration,
        CancellationToken cancellationToken = default)
        => Task.FromResult(Result<int>.Failure(new Error(
            ErrorType.Unexpected,
            "Erp.ExportNotImplemented",
            "ERP aktarım entegrasyonu henüz tamamlanmadı; plan aktarılmadı.")));
}
