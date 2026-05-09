using CargoPilot.Application.Common.Models;

namespace CargoPilot.Application.Common.Interfaces;

public interface IOptimizationEngine
{
    OptimizationResult Run(OptimizationInput input);
}
