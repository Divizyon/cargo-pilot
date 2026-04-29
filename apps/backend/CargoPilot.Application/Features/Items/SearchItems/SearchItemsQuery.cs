using CargoPilot.Application.Common.Models;
using MediatR;

namespace CargoPilot.Application.Features.Items.SearchItems;

public sealed record SearchItemsQuery(
    string? SearchTerm,
    int Page = 1,
    int PageSize = 20) : IRequest<Result<PagedResult<ItemSummaryDto>>>;
