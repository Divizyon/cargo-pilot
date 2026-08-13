using System.Text;
using CargoPilot.Application.Common.Items;

namespace CargoPilot.Application.Common.Erp;

/// <summary>
/// ERP grup kodundan (or. Netsis <c>TBLSTSABIT.GRUP_KODU</c>) yuk grubunu turetir.
/// Grup kodu bir is kodudur; urunun fiziksel kabi hakkinda bilgi tasimaz, bu yuzden
/// yalnizca yuk grubuna baglanir, Tip'e (<c>ItemCategory</c>) degil.
/// </summary>
public static class ErpLoadGroupResolver
{
    /// <summary>Sirali desen listesi; ilk eslesen grup kazanir.</summary>
    private static readonly (string Group, string[] Keywords)[] _patterns =
    [
        (LoadGroups.Chemical, ["KIMYA", "CHEM", "ASIT", "BOYA", "SOLVENT"]),
        (LoadGroups.Hazardous, ["TEHLIKELI", "ADR", "PARLAYICI", "YANICI", "PATLAYICI"]),
        (LoadGroups.Food, ["GIDA", "FOOD", "ICECEK", "MEYVE", "SUT"]),
        (LoadGroups.Electronics, ["ELEKTRONIK", "ELEKTRIK", "ELECTRO", "BEYAZESYA"]),
        (LoadGroups.Textile, ["TEKSTIL", "TEXTILE", "KUMAS", "KONFEKSIYON", "GIYIM"]),
    ];

    /// <summary>
    /// Grup kodunda desen aranir; hicbiri eslesmezse veya kod bossa <see cref="LoadGroups.General"/>
    /// doner. Karsilastirma buyuk/kucuk harf ve Turkce karakter duyarsizdir.
    /// </summary>
    public static string Resolve(string? groupCode)
    {
        if (string.IsNullOrWhiteSpace(groupCode))
            return LoadGroups.General;

        var normalized = Normalize(groupCode);

        foreach (var (group, keywords) in _patterns)
        {
            if (Array.Exists(keywords, keyword => normalized.Contains(keyword, StringComparison.Ordinal)))
                return group;
        }

        return LoadGroups.General;
    }

    /// <summary>
    /// Grup kodu gercekten bir yuk grubu bilgisi tasiyor mu. Varsayilana dusen kod
    /// (<see cref="LoadGroups.General"/>) bilgi tasimaz; yeniden senkronda kullanicinin
    /// sectigi grubun uzerine yazilmamasi icin bu ayrim gerekir.
    /// </summary>
    public static bool CarriesGroupInfo(string? groupCode) =>
        Resolve(groupCode) != LoadGroups.General;

    /// <summary>Buyuk harfe cevirir ve Turkce karakterleri ASCII karsiliklarina indirger.</summary>
    private static string Normalize(string value)
    {
        var builder = new StringBuilder(value.Length);

        foreach (var current in value.ToUpperInvariant())
        {
            builder.Append(current switch
            {
                'İ' or 'ı' => 'I',
                'Ş' => 'S',
                'Ğ' => 'G',
                'Ü' => 'U',
                'Ö' => 'O',
                'Ç' => 'C',
                _ => current
            });
        }

        return builder.ToString();
    }
}
