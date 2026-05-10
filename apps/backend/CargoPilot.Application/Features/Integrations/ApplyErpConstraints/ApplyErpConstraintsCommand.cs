using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Integrations.ApplyErpConstraints;

public sealed record ErpProductConstraintInput(
    string ErpId,
    Dictionary<string, string?> Constraints);

public sealed record ApplyErpConstraintsCommand(
    Guid IntegrationId,
    IReadOnlyList<ErpProductConstraintInput> Products) : IRequest<Result<ApplyErpConstraintsResponse>>;

public sealed record ApplyErpConstraintsResponse(
    int ProcessedCount,
    int RuleAssignedCount,
    int RuleNotAssignedCount,
    IReadOnlyList<string> UnmatchedErpIds);
