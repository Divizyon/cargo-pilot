using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.Items.SearchItems;

public sealed record SearchItemsQuery(
    string? SearchTerm,
    ItemCategory? Category,
    int Page = 1,
    int PageSize = 20) : IRequest<Result<PagedResult<ItemSummaryDto>>>;
