using CargoPilot.Application.Common.Interfaces;

namespace CargoPilot.Infrastructure.Services;

internal sealed class NoOpOptimizationEngine : IOptimizationEngine
{
    public Task RunOptimizationAsync(Guid planId, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
