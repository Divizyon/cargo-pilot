namespace CargoPilot.Application.Common.Optimization.Search;

/// <summary>
/// Aramanin tek rastgelelik kaynagi (mulberry32).
///
/// <c>Random.Shared</c> kullanilmaz: paylasilan uretec cagrı sirasina bagli
/// deger uretir, paralel degerlendirmede sira degisir ve ayni tohum ayni plani
/// vermez. Determinizm sozlesmesi (R-C02) bunun uzerine kurulu.
///
/// .NET'in <c>Random</c> sinifi da kullanilmaz: uretilen dizinin surumler arasi
/// ayni kalacagi garanti edilmiyor ve olcumler surum yukseltmesinde sessizce
/// kayardi.
/// </summary>
internal sealed class SearchRandom
{
    private uint _state;

    internal SearchRandom(int seed) => _state = seed == 0 ? 0x9e3779b9u : unchecked((uint)seed);

    /// <summary>
    /// Tohum + iterasyon + birey indeksinden turetilmis alt-uretec. Her bireyin
    /// kendi ureteci olur; boylece bireyler paralel degerlendirilse bile cektikleri
    /// sayilar sıraya bagli olmaz (R-C02).
    /// </summary>
    internal static SearchRandom Derive(int seed, int iteration, int individual)
        => new(unchecked(seed * 73_856_093 ^ (iteration + 1) * 19_349_663 ^ (individual + 1) * 83_492_791));

    /// <summary>[0, 1) araliginda sonraki deger.</summary>
    internal double Next()
    {
        unchecked
        {
            _state += 0x6d2b79f5u;
            var t = _state;
            t = (t ^ (t >> 15)) * (1u | t);
            t = (t + ((t ^ (t >> 7)) * (61u | t))) ^ t;

            return (t ^ (t >> 14)) / 4294967296d;
        }
    }

    internal int NextInt(int minInclusive, int maxInclusive)
        => maxInclusive <= minInclusive
            ? minInclusive
            : minInclusive + (int)(Next() * (maxInclusive - minInclusive + 1));
}
