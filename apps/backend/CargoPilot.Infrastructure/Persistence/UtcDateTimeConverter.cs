using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CargoPilot.Infrastructure.Persistence;

/// <summary>
/// Okunan tarihi UTC olarak isaretler. Yazma yonu kimliktir: kayitlar zaten
/// <see cref="DateTime.UtcNow"/> ile uretiliyor, ek bir cevrim degeri kaydirirdi.
/// </summary>
internal sealed class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeConverter()
        : base(value => value, value => DateTime.SpecifyKind(value, DateTimeKind.Utc))
    {
    }
}

/// <inheritdoc cref="UtcDateTimeConverter"/>
internal sealed class NullableUtcDateTimeConverter : ValueConverter<DateTime?, DateTime?>
{
    public NullableUtcDateTimeConverter()
        : base(
            value => value,
            value => value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : value)
    {
    }
}
