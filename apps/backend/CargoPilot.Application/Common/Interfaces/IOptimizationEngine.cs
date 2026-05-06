namespace CargoPilot.Application.Common.Interfaces;

public interface IOptimizationEngine
{
    Task RunOptimizationAsync(Guid planId, CancellationToken cancellationToken = default);
}
