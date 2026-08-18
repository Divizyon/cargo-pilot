namespace CargoPilot.Engine.Bench;

/// <summary>
/// Tohumlu sozde-rastgele uretec (mulberry32).
///
/// TypeScript tarafindaki <c>utils/seededRandom.ts</c> ile BIREBIR ayni dizi
/// uretir: ayni tohum iki dilde ayni senaryo listesini vermeli, yoksa iki
/// kosucunun damgalari hicbir zaman tutmaz.
///
/// <c>Random</c> kullanilmaz: .NET'in uretecinin dizisi surumler arasi garanti
/// altinda degildir ve JavaScript'te karsiligi yoktur.
/// </summary>
public sealed class BenchRng
{
    private uint _state;

    public BenchRng(int seed)
        // Tohum 0'da mulberry32 sabit dizi uretir; kullanici 0 yazabilir.
        => _state = seed == 0 ? 0x9e3779b9u : unchecked((uint)seed);

    /// <summary>[0, 1) araliginda sonraki deger.</summary>
    public double Next()
    {
        unchecked
        {
            _state += 0x6d2b79f5u;
            var t = _state;
            t = Imul(t ^ (t >> 15), 1u | t);
            t = (t + Imul(t ^ (t >> 7), 61u | t)) ^ t;

            return (t ^ (t >> 14)) / 4294967296d;
        }
    }

    /// <summary>[min, max] araliginda tam sayi, iki uc dahil.</summary>
    public int NextInt(int min, int max)
        => max <= min ? min : min + (int)(Next() * (max - min + 1));

    public T Pick<T>(IReadOnlyList<T> items)
    {
        ArgumentNullException.ThrowIfNull(items);

        return items[NextInt(0, items.Count - 1)];
    }

    /// <summary>Diziyi bozmadan karistirilmis kopyasini doner (Fisher-Yates).</summary>
    public List<T> Shuffle<T>(IReadOnlyList<T> items)
    {
        ArgumentNullException.ThrowIfNull(items);

        var copy = new List<T>(items);
        for (var i = copy.Count - 1; i > 0; i--)
        {
            var j = NextInt(0, i);
            (copy[i], copy[j]) = (copy[j], copy[i]);
        }

        return copy;
    }

    /// <summary>JavaScript <c>Math.imul</c> karsiligi: 32-bit sarmalayan carpim.</summary>
    private static uint Imul(uint a, uint b) => unchecked(a * b);
}
