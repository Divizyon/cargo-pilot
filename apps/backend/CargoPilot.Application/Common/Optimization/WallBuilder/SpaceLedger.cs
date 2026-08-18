namespace CargoPilot.Application.Common.Optimization.WallBuilder;

/// <summary>
/// Maximal-space defteri: aracin bos hacmini, baskasiyla genisletilemeyen
/// prizmatik bolgeler kumesi olarak tutar.
///
/// Greedy motorun extreme-point tohumlarindan farki: orada aday nokta yalnizca
/// yerlestirilmis kutulara komsu dogar ve arada kalan bosluklar gorunmez olur.
/// Defter ise bosluğun kendisini tasidigi icin "iki kutu arasindaki 20 cm'lik
/// yarik" aday olarak kalir.
///
/// Bosluklarin tabani DESTEKLI OLMAK ZORUNDA DEGILDIR ve bu bilincli bir
/// tercihtir. Havada duran taban, kutunun komsu yiginin uzerine %80 destekle
/// KOPRU kurmasinin tek yoludur; defteri "durust" yapip tabanlari destekli
/// bolgeye kirpmak uc ayri varyantla denendi ve doluluk %75,99'dan %73,65'e
/// kadar dustu (F2a). Yerlesemeyen kutularin %72,7'sinin bir bosluga sigip
/// destek bulamamasi defterin kusuru degil, yigin ust yuzeyinin engebesinin
/// olcusudur: cozum defteri kucultmek degil yuzeyi duzlestirmektir
/// (docs/algorithm/04-olcum-gunlugu.md, F2a kaydi).
///
/// Kapsanan bosluklarin budanmasi opsiyonel degildir: her yerlestirme bir
/// bosluğu alti parcaya kadar boler ve budama olmadan liste kutu sayisiyla
/// ussel buyur (docs/algorithm/03-yol-haritasi.md RK-11).
/// </summary>
internal sealed class SpaceLedger
{
    private readonly List<FreeSpace> _spaces;
    private readonly bool _fillFromMaxX;
    private int _nextOrder;

    public SpaceLedger(decimal width, decimal height, decimal length, bool fillFromMaxX)
    {
        _fillFromMaxX = fillFromMaxX;
        _spaces = [new FreeSpace(0m, 0m, 0m, width, height, length, _nextOrder++)];
    }

    /// <summary>
    /// Tarama sirasinda sirali tutulur. Siralama her aday taramasinda yeniden
    /// yapilsaydi kutu basina degil, kutu x duvar basina bir <c>OrderBy</c>
    /// maliyeti cikardi; defter yalnizca yerlestirmede degistigi icin sira
    /// burada bir kez kurulur.
    /// </summary>
    public IReadOnlyList<FreeSpace> Spaces => _spaces;

    /// <summary>
    /// Kutu yerlestirildikten sonra defteri gunceller: kesisen her bosluk silinir,
    /// yerine kutunun disinda kalan alti yone kadar yeni bosluk dogar.
    ///
    /// <c>minSide</c> kalan kutularin en kucuk kenaridir; bundan dar bosluk
    /// hicbir kutuyu alamaz ve tutmak yalnizca tarama maliyeti olurdu.
    /// </summary>
    public void Place(
        decimal x, decimal y, decimal z,
        decimal width, decimal height, decimal length,
        decimal minSide)
    {
        var survivors = new List<FreeSpace>(_spaces.Count + 6);

        foreach (var space in _spaces)
        {
            if (!space.Intersects(x, y, z, width, height, length))
            {
                survivors.Add(space);
                continue;
            }

            AddSplits(survivors, space, x, y, z, width, height, length, minSide);
        }

        _spaces.Clear();
        PruneInto(_spaces, survivors);
        Sort();
    }

    /// <summary>
    /// Tarama sirasi determinizmin parcasidir: ayni defter ayni sirayla
    /// taranmazsa esit anahtarli adaylar arasinda kazanan degisir.
    /// </summary>
    private void Sort()
    {
        if (_fillFromMaxX)
            _spaces.Sort(static (a, b) => Compare(a, b, byMaxX: true));
        else
            _spaces.Sort(static (a, b) => Compare(a, b, byMaxX: false));
    }

    private static int Compare(FreeSpace a, FreeSpace b, bool byMaxX)
    {
        var byY = a.Y.CompareTo(b.Y);
        if (byY != 0) return byY;

        var byZ = a.Z.CompareTo(b.Z);
        if (byZ != 0) return byZ;

        var byX = byMaxX ? b.MaxX.CompareTo(a.MaxX) : a.X.CompareTo(b.X);

        return byX != 0 ? byX : a.Order.CompareTo(b.Order);
    }

    /// <summary>
    /// Kutunun disinda kalan parcalar. Alti yon ayri ayri uretilir; her parca
    /// kesilen bosluğun tam bir dilimidir, yani parcalar ust uste binebilir —
    /// maximal-space temsilinde bu beklenen davranistir, budama fazlaligi alir.
    /// </summary>
    private void AddSplits(
        List<FreeSpace> target,
        FreeSpace space,
        decimal x, decimal y, decimal z,
        decimal width, decimal height, decimal length,
        decimal minSide)
    {
        Add(target, space.X, space.Y, space.Z, x - space.X, space.Height, space.Length, minSide);
        Add(target, x + width, space.Y, space.Z, space.MaxX - (x + width), space.Height, space.Length, minSide);
        Add(target, space.X, space.Y, space.Z, space.Width, y - space.Y, space.Length, minSide);
        Add(target, space.X, y + height, space.Z, space.Width, space.MaxY - (y + height), space.Length, minSide);
        Add(target, space.X, space.Y, space.Z, space.Width, space.Height, z - space.Z, minSide);
        Add(target, space.X, space.Y, z + length, space.Width, space.Height, space.MaxZ - (z + length), minSide);
    }

    private void Add(
        List<FreeSpace> target,
        decimal x, decimal y, decimal z,
        decimal width, decimal height, decimal length,
        decimal minSide)
    {
        if (width < minSide || height < minSide || length < minSide) return;

        target.Add(new FreeSpace(x, y, z, width, height, length, _nextOrder++));
    }

    /// <summary>
    /// Baskasinin icinde kalan bosluklari atar. Sirasi korunur: ayni deftere iki
    /// kez ayni girdi verildiginde ayni liste cikmak zorunda.
    /// </summary>
    private static void PruneInto(List<FreeSpace> target, List<FreeSpace> candidates)
    {
        for (var i = 0; i < candidates.Count; i++)
        {
            var candidate = candidates[i];
            if (candidate.IsEmpty) continue;

            var contained = false;
            for (var j = 0; j < candidates.Count && !contained; j++)
            {
                if (i == j) continue;

                var other = candidates[j];
                if (other.IsEmpty) continue;

                // Birebir ayni iki bosluk: yalnizca ilki kalir.
                if (candidate.IsContainedIn(other) && (!other.IsContainedIn(candidate) || j < i))
                    contained = true;
            }

            if (!contained) target.Add(candidate);
        }
    }
}
