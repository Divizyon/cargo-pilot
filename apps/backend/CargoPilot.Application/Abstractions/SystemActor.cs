namespace CargoPilot.Application.Abstractions;

/// <summary>
/// Kullanici baglami olmayan arka plan islemlerinin audit kimligi. HTTP baglami olmadigi
/// icin <see cref="ICurrentUserService.UserId"/> null doner; kapsam acikken audit alanlari
/// NULL yerine bu sabit kimlikle yazilir, boylece "sistem olusturdu" ile "kimse dokunmadi"
/// birbirinden ayrisir. Users tablosuna yabanci anahtar yoktur; kimlik yalnizca isarettir.
/// </summary>
public static class SystemActor
{
    public static readonly Guid Id = new("00000000-0000-0000-0000-000000000001");

    private static readonly AsyncLocal<bool> _isActive = new();

    /// <summary>Kapsam aciksa sistem kimligi, degilse null.</summary>
    public static Guid? CurrentId => _isActive.Value ? Id : null;

    /// <summary>Cagri zinciri boyunca (await'ler dahil) sistem kimligini etkinlestirir.</summary>
    public static IDisposable BeginScope() => new Scope();

    private sealed class Scope : IDisposable
    {
        private readonly bool _previous = _isActive.Value;

        public Scope() => _isActive.Value = true;

        public void Dispose() => _isActive.Value = _previous;
    }
}
