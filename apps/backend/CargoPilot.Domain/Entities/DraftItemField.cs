namespace CargoPilot.Domain.Entities;

/// <summary>
/// ERP kaynaginda eksik gelebilen taslak alan adlari.
/// <see cref="DraftItem.MissingFieldsJson"/> ve arayuz rozetleri bu adlari kullanir.
/// </summary>
public static class DraftItemField
{
    /// <summary>ERP kolonu EN.</summary>
    public const string Width = "width";

    /// <summary>ERP kolonu GENISLIK.</summary>
    public const string Height = "height";

    /// <summary>ERP kolonu BOY.</summary>
    public const string Length = "length";

    /// <summary>ERP kolonu BIRIM_AGIRLIK.</summary>
    public const string Weight = "weight";
}
