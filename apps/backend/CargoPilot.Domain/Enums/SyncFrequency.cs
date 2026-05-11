namespace CargoPilot.Domain.Enums;

/// <summary>Otomatik senkronizasyon sıklığı seçenekleri.</summary>
public enum SyncFrequency {
    /// <summary>Her 4 saatte bir.</summary>
    Every4Hours,
    /// <summary>Günlük (24 saatte bir).</summary>
    Daily
}

/// <summary>SyncFrequency için yardımcı metodlar.</summary>
public static class SyncFrequencyExtensions {
    /// <summary>Enum değerini TimeSpan'e dönüştürür.</summary>
    public static TimeSpan ToTimeSpan(this SyncFrequency frequency) => frequency switch {
        SyncFrequency.Every4Hours => TimeSpan.FromHours(4),
        SyncFrequency.Daily       => TimeSpan.FromHours(24),
        _                         => TimeSpan.FromHours(24)
    };
}
