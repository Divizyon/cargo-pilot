using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Models;

public sealed record OptimizationResult(
    IReadOnlyList<PlacedItemResult> Placements,
    IReadOnlyList<UnplacedItemResult> UnplacedItems,
    decimal TotalWeight,
    decimal FillRate,
    decimal? CenterOfGravityX,
    decimal? CenterOfGravityY,
    decimal? CenterOfGravityZ,
    decimal? WeightBalanceOffsetX,
    decimal? WeightBalanceOffsetZ,
    SearchStats? SearchStats = null,
    IReadOnlyList<WallSegment>? Walls = null);

/// <summary>
/// Duvar orucunun ordugu duvar dilimleri, <c>z</c> ekseninde artan sirada.
/// Dilimler cakismaz: bir duvarin derinligini ona giren ILK kutu belirler ve
/// sonraki kutular o bandin icinde kalir.
///
/// Neden sonuca konuldu: duvar sinirlari yalnizca yerlestiricinin icinde
/// biliniyordu. Teshis tarafi bunlari yerlesimlerden GERI CIKARMAYA calisiyordu
/// (<c>z</c>'de baglantili bilesen) ve bir kutu iki duvara yayildiginda ikisini
/// tek duvar sayiyordu; bu, duvar sayisini dusuk, yuz kaplama oranini yuksek
/// gosteriyordu (<c>DR-44</c>). Tahmin yerine olcum.
///
/// Aramasiz ve duvar disi yollarda <c>null</c> kalir; hicbir kalicilik, API ya
/// da anlik goruntu esleme yolu bu alani okumaz.
/// </summary>
public sealed record WallSegment(decimal Start, decimal End);

/// <summary>
/// Arama katmaninin kosu istatistigi. Aramasiz yollarda (Static sequencer)
/// <c>null</c> kalir; boylece bugunku sonuc sozlesmesi degismez.
/// Fitness skoru arama alaninin sayisidir ve <c>double</c> tutulur; geometri ve
/// agirlik <c>decimal</c> kalir (docs/algorithm/03-yol-haritasi.md RK-18).
/// </summary>
public sealed record SearchStats(
    int Iterations,
    int Evaluations,
    IReadOnlyList<double> BestCostHistory,
    bool SearchImproved,
    long DurationMs);

public sealed record PlacedItemResult(
    Guid PlacementId,
    Guid ItemId,
    decimal X,
    decimal Y,
    decimal Z,
    decimal Width,
    decimal Height,
    decimal Length,
    LoadingPlanPlacementRotation Rotation,
    decimal Weight);

public sealed record UnplacedItemResult(
    Guid ItemId,
    int Quantity,
    UnplacedReason Reason);
