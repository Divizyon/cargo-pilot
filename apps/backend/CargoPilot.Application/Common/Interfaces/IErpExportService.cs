using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Entities;

namespace CargoPilot.Application.Common.Interfaces;

public interface IErpExportService {
    /// <summary>
    /// Planı ERP'ye aktarır. Başarıda aktarılan kayıt sayısını döndürür;
    /// aktarım yapılamadıysa hata döner ve çağıran planı başarısız işaretler.
    /// </summary>
    Task<Result<int>> ExportAsync(LoadingPlan plan, Integration integration, CancellationToken cancellationToken = default);
}
