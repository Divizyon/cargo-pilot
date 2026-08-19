using CargoPilot.Domain.Enums;

namespace CargoPilot.Application.Common.Models;

/// <summary>
/// Zaten yerlesmis ve DOKUNULMAYACAK bir kutu.
///
/// Yalnizca konum ve donme tasir; olculer urunden ve donmeden turetilir —
/// veritabaninda da tam olarak bu kadari saklanir
/// (<see cref="Domain.Entities.LoadingPlanPlacement"/>). Boylece cagiran tarafin
/// olcu matematigi yapmasi gerekmez ve donme eslemesi tek yerde kalir.
/// </summary>
public sealed record FixedPlacement(
    Guid ItemId,
    decimal X,
    decimal Y,
    decimal Z,
    LoadingPlanPlacementRotation Rotation);
