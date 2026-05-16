using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.GetDraftItems;

public sealed record GetDraftItemsQuery(
    DraftItemStatus? Status,
    int Page,
    int PageSize) : IRequest<Result<GetDraftItemsResult>>;
