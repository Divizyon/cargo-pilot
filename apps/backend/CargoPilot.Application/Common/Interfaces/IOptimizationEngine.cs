using CargoPilot.Application.Common.Models;

namespace CargoPilot.Application.Common.Interfaces;

public interface IOptimizationEngine
{
    /// <summary>
    /// Yerleştirmeyi hesaplar. Hesap istek içinde senkron çalıştığı için istemci
    /// bağlantıyı keserse işin sürdürülmemesi adına iptal belirteci beklenir.
    /// </summary>
    OptimizationResult Run(OptimizationInput input, CancellationToken cancellationToken = default);
}
