using CargoPilot.Application.Common.Models;
using CargoPilot.Domain.Enums;
using MediatR;

namespace CargoPilot.Application.Features.DraftItems.GetDraftItems;

/// <summary>
/// <paramref name="Search"/> ve <paramref name="Categories"/> veritabaninda uygulanir;
/// arama yalnizca acik sayfada calisirsa kullanici "kayit yok" sanir ve toplam sayaci
/// filtreden habersiz kalir.
/// </summary>
public sealed record GetDraftItemsQuery(
    DraftItemStatus? Status,
    int Page,
    int PageSize,
    string? Search = null,
    IReadOnlyList<ItemCategory>? Categories = null) : IRequest<Result<GetDraftItemsResult>>;
